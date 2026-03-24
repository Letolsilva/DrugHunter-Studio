"""
Infra — Adapter externo para a API RCSB PDB (scraper)

Responsabilidade única: comunicar-se com a API pública do RCSB
e retornar dados brutos de estruturas proteicas.

Essa camada é um "adapter de saída" na arquitetura hexagonal:
o domínio nunca acessa HTTP diretamente — chama esta interface.
"""

import json
import re
import asyncio
import urllib.request
import urllib.error
from typing import List, AsyncGenerator, Optional

SEARCH_URL = "https://search.rcsb.org/rcsbsearch/v2/query"
ENTRY_URL = "https://data.rcsb.org/rest/v1/core/entry/{}"
POLYMER_URL = "https://data.rcsb.org/rest/v1/core/polymer_entity/{}/1"

DELAY_ENTRE_IDS = 0.15  # respeitar rate limit da API RCSB


# ─────────────────────────────────────────────────────────────
# Parsing da lista digitada pelo usuário
# ─────────────────────────────────────────────────────────────


def parsear_lista_proteinas(entrada: str) -> List[str]:
    """
    Transforma a string digitada em lista de proteínas.
    Aceita vírgula, ponto-e-vírgula ou quebra de linha como separador.

    "glucan synthase"              → ["glucan synthase"]
    "glucan synthase, FKS1"        → ["glucan synthase", "FKS1"]
    """
    partes = re.split(r"[,;\n]+", entrada)
    return [p.strip() for p in partes if p.strip()]


# ─────────────────────────────────────────────────────────────
# HTTP helpers (síncronos — executados via run_in_executor)
# ─────────────────────────────────────────────────────────────


def _http_get(url: str, timeout: int = 10) -> dict:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return json.loads(resp.read())
    except Exception:
        return {}


def _http_post(url: str, payload: dict, timeout: int = 15, retries: int = 3) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}
    )
    ultimo_erro = None
    for tentativa in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                corpo = resp.read()
                if not corpo:
                    raise RuntimeError("Resposta vazia do RCSB")
                return json.loads(corpo)
        except Exception as exc:
            ultimo_erro = exc
            if tentativa < retries - 1:
                import time

                time.sleep(1.5 * (tentativa + 1))
    raise RuntimeError(f"Erro na busca RCSB: {ultimo_erro}")


# ─────────────────────────────────────────────────────────────
# Busca de IDs por nome de proteína
# ─────────────────────────────────────────────────────────────


def _buscar_ids_por_proteina(nome: str, limite: int = 50) -> List[str]:
    """Retorna lista de PDB IDs que correspondem ao nome da proteína."""
    nome = nome.strip()

    # Se o input for um PDB ID (ex: "5ESG"), busca direto pelo entry_id
    if re.match(r"^[0-9][A-Za-z0-9]{3}$", nome):
        query = {
            "query": {
                "type": "terminal",
                "service": "text",
                "parameters": {
                    "attribute": "rcsb_entry_container_identifiers.entry_id",
                    "operator": "exact_match",
                    "value": nome.upper(),
                },
            },
            "return_type": "entry",
            "request_options": {
                "paginate": {"start": 0, "rows": 1},
                "results_content_type": ["experimental"],
            },
        }
        resultado = _http_post(SEARCH_URL, query)
        return [r["identifier"] for r in resultado.get("result_set", [])]

    operador_titulo = "contains_phrase" if " " in nome else "contains_words"

    query = {
        "query": {
            "type": "group",
            "logical_operator": "or",
            "nodes": [
                {
                    "type": "terminal",
                    "service": "text",
                    "parameters": {
                        "attribute": "struct.title",
                        "operator": operador_titulo,
                        "value": nome,
                    },
                },
                {
                    "type": "terminal",
                    "service": "text",
                    "parameters": {
                        "attribute": "rcsb_entity_source_organism.scientific_name",
                        "operator": "exact_match",
                        "value": nome,
                    },
                },
            ],
        },
        "return_type": "entry",
        "request_options": {
            "paginate": {"start": 0, "rows": limite},
            "results_content_type": ["experimental"],
            "sort": [{"sort_by": "score", "direction": "desc"}],
        },
    }
    resultado = _http_post(SEARCH_URL, query)
    return [r["identifier"] for r in resultado.get("result_set", [])]


# ─────────────────────────────────────────────────────────────
# Captura do organismo via polymer_entity
# ─────────────────────────────────────────────────────────────


def _buscar_organismo(pdb_id: str) -> str:
    """
    Busca o organismo fonte real via endpoint polymer_entity.
    Múltiplos organismos são separados por ' | '.
    """
    url = POLYMER_URL.format(pdb_id.lower())
    dados = _http_get(url)
    organismos_raw = dados.get("rcsb_entity_source_organism", [])

    if not organismos_raw:
        return "N/A"

    nomes = []
    for org in organismos_raw:
        nome = org.get("scientific_name", "").strip()
        if nome and nome not in nomes:
            nomes.append(nome)

    return " | ".join(nomes) if nomes else "N/A"


# ─────────────────────────────────────────────────────────────
# Detalhes de uma entrada PDB
# ─────────────────────────────────────────────────────────────


def _buscar_detalhes(pdb_id: str) -> dict:
    return _http_get(ENTRY_URL.format(pdb_id.lower()))


def _avaliar_qualidade(resolucao, metodo, tem_ligante, ramachandran) -> str:
    score = 0
    if isinstance(metodo, str) and "X-RAY" in metodo.upper():
        score += 3
    elif isinstance(metodo, str) and "NEUTRON" in metodo.upper():
        score += 2
    if resolucao is not None:
        try:
            r = float(resolucao)
            if r <= 2.0:
                score += 3
            elif r <= 2.5:
                score += 2
            elif r <= 3.0:
                score += 1
        except Exception:
            pass
    if tem_ligante:
        score += 2
    if ramachandran not in (None, "N/A"):
        try:
            if float(ramachandran) <= 1.0:
                score += 1
        except Exception:
            pass
    if score >= 7:
        return "Excelente"
    elif score >= 5:
        return "Boa"
    elif score >= 3:
        return "Razoável"
    else:
        return "Verificar"


def _extrair_campos(pdb_id: str, dados: dict, proteina_buscada: str) -> dict:
    """
    Extrai todos os campos relevantes de uma entrada PDB.
    O campo 'organismo' vem do endpoint polymer_entity (mesma fonte do site RCSB).
    """
    info = dados.get("rcsb_entry_info", {})

    resolucao_raw = info.get("resolution_combined", [None])
    resolucao = resolucao_raw[0] if resolucao_raw else None

    metodo = info.get("experimental_method", "N/A")

    deposicao = dados.get("rcsb_accession_info", {}).get("deposit_date", "N/A")
    if deposicao and "T" in deposicao:
        deposicao = deposicao.split("T")[0]

    titulo = dados.get("struct", {}).get("title", "N/A")
    n_ligantes = info.get("nonpolymer_entity_count", 0) or 0
    tem_ligante = int(n_ligantes) > 0
    num_cadeias = info.get("polymer_entity_count", None)
    ramachandran = dados.get("pdbx_vrpt_summary", {}).get(
        "percent_ramachandran_outliers_full_length", None
    )
    classificacao = dados.get("struct_keywords", {}).get("pdbx_keywords", "N/A")
    organismo = _buscar_organismo(pdb_id)
    qualidade = _avaliar_qualidade(resolucao, metodo, tem_ligante, ramachandran)

    return {
        "pdb_id": pdb_id.upper(),
        "proteina_buscada": proteina_buscada,
        "titulo": titulo[:120] + "..." if len(titulo) > 120 else titulo,
        "organismo": organismo,
        "classificacao": classificacao,
        "resolucao": resolucao,
        "metodo": metodo,
        "tem_ligante": tem_ligante,
        "num_cadeias": num_cadeias,
        "ramachandran": ramachandran,
        "depositado_em": deposicao,
        "qualidade": qualidade,
        "link_pdb": f"https://www.rcsb.org/structure/{pdb_id.upper()}",
    }


# ─────────────────────────────────────────────────────────────
# Função principal — gerador assíncrono com progresso via SSE
# ─────────────────────────────────────────────────────────────


async def executar_scraping(
    proteinas_input: str,
    limite: Optional[int] = None,
    ids_para_ignorar: Optional[set] = None,
) -> AsyncGenerator[dict, None]:
    """
    Gerador assíncrono que processa uma lista de proteínas buscando na API RCSB.

    Eventos emitidos (dict com campo 'tipo'):
      lista_proteinas  → {"proteinas": [...], "total_proteinas": N}
      inicio_proteina  → {"proteina": "...", "indice": i, "total": N}
      ids_encontrados  → {"proteina": "...", "total_ids": N, "duplicatas_ignoradas": N}
      progresso        → {"proteina": "...", "atual": i, "total": N, "pdb_id": "..."}
      resultado        → {"dado": {campos completos da proteína}}
      fim_proteina     → {"proteina": "...", "coletados": N}
      fim              → {"total_coletados": N, "por_proteina": {...}}
      erro_proteina    → {"proteina": "...", "mensagem": "..."}
    """
    loop = asyncio.get_event_loop()

    lista = parsear_lista_proteinas(proteinas_input)
    if not lista:
        yield {
            "tipo": "erro_proteina",
            "proteina": "",
            "mensagem": "Nenhuma proteína informada.",
        }
        return

    yield {"tipo": "lista_proteinas", "proteinas": lista, "total_proteinas": len(lista)}

    total_geral = 0
    por_proteina = {}
    ids_vistos: set = set()
    _ignorar = {i.upper() for i in ids_para_ignorar} if ids_para_ignorar else set()

    for idx, proteina in enumerate(lista):
        yield {
            "tipo": "inicio_proteina",
            "proteina": proteina,
            "indice": idx + 1,
            "total": len(lista),
        }

        try:
            ids = await loop.run_in_executor(
                None,
                _buscar_ids_por_proteina,
                proteina,
                limite if limite is not None else 9999,
            )
        except Exception as exc:
            yield {"tipo": "erro_proteina", "proteina": proteina, "mensagem": str(exc)}
            por_proteina[proteina] = 0
            continue

        ids_novos = [
            i for i in ids if i not in ids_vistos and i.upper() not in _ignorar
        ]
        ids_vistos.update(ids_novos)

        yield {
            "tipo": "ids_encontrados",
            "proteina": proteina,
            "total_ids": len(ids_novos),
            "duplicatas_ignoradas": len(ids) - len(ids_novos),
        }

        if not ids_novos:
            por_proteina[proteina] = 0
            yield {"tipo": "fim_proteina", "proteina": proteina, "coletados": 0}
            continue

        coletados = 0
        for i, pdb_id in enumerate(ids_novos):
            yield {
                "tipo": "progresso",
                "proteina": proteina,
                "atual": i + 1,
                "total": len(ids_novos),
                "pdb_id": pdb_id,
            }

            dados = await loop.run_in_executor(None, _buscar_detalhes, pdb_id)
            if dados:
                entrada = await loop.run_in_executor(
                    None, _extrair_campos, pdb_id, dados, proteina
                )
                yield {"tipo": "resultado", "dado": entrada}
                coletados += 1

            await asyncio.sleep(DELAY_ENTRE_IDS)

        por_proteina[proteina] = coletados
        total_geral += coletados
        yield {"tipo": "fim_proteina", "proteina": proteina, "coletados": coletados}

    yield {
        "tipo": "fim",
        "total_coletados": total_geral,
        "por_proteina": por_proteina,
    }
