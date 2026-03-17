"""
usecases/search.py — Orquestração do fluxo de busca de proteínas.

Coordena o scraper externo, o cache local e o registro de histórico.
Não conhece HTTP nem SSE — o gerador retorna strings SSE.
"""

import json
import csv
import io
from typing import Optional, AsyncGenerator
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.domain.models import User, Protein
from app.infra.external.rcsb_scraper import executar_scraping, parsear_lista_proteinas
from app.services import search as service


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


async def uc_buscar_stream(
    db: Session,
    proteinas: str,
    forcar_novo: bool,
    usuario: Optional[User],
) -> AsyncGenerator[str, None]:
    """
    Executa a busca emitindo eventos SSE com progresso.
    Usa cache quando disponível, chama o scraper para proteínas faltantes.
    Salva resultados no cache e registra a busca no histórico do usuário.
    """
    protein_ids_salvos = []
    user_id = usuario.id if usuario else None
    erros_proteinas: list[str] = []
    cached: list = []
    proteinas_para_scrape = proteinas

    if not forcar_novo:
        cached, pendentes = service.separar_cache_e_pendentes(db, proteinas)

        if cached:
            yield _sse({"tipo": "cache_hit", "total": len(cached)})
            for p in cached:
                yield _sse(
                    {"tipo": "resultado", "dado": _proteina_dict(p), "cache": True}
                )

        if not pendentes:
            yield _sse(
                {"tipo": "fim", "total_coletados": len(cached), "veio_do_cache": True}
            )
            service.registrar_busca(
                db,
                user_id,
                proteinas,
                None,
                len(cached),
                veio_do_cache=True,
                protein_ids=[p.id for p in cached],
            )
            return

        proteinas_para_scrape = ", ".join(pendentes)

    async for evento in executar_scraping(proteinas_para_scrape):
        if evento.get("tipo") == "fim":
            total_final = len(cached) + evento.get("total_coletados", 0)
            teve_erro = len(erros_proteinas) > 0
            mensagem_erro = " | ".join(erros_proteinas) if teve_erro else None
            yield _sse(
                {"tipo": "fim", "total_coletados": total_final, "veio_do_cache": False}
            )
            service.registrar_busca(
                db=db,
                user_id=user_id,
                proteina_query=proteinas,
                organismo_query=None,
                total_resultados=total_final,
                veio_do_cache=False,
                protein_ids=[p.id for p in cached] + protein_ids_salvos,
                teve_erro=teve_erro,
                mensagem_erro=mensagem_erro,
            )
        else:
            yield _sse(evento)
            if evento.get("tipo") == "resultado":
                p = service.salvar_proteina_no_cache(db, evento["dado"])
                if p:
                    protein_ids_salvos.append(p.id)
            elif evento.get("tipo") == "erro_proteina":
                erros_proteinas.append(
                    f"{evento.get('proteina', '')}: {evento.get('mensagem', 'erro desconhecido')}"
                )


def uc_download_csv(
    db: Session,
    proteinas: str,
    organismo: Optional[str],
    qualidade: Optional[str],
) -> tuple[str, str]:
    """Gera CSV dos resultados em cache com filtros. Retorna (conteudo, nome_arquivo)."""
    lista = parsear_lista_proteinas(proteinas)
    query = db.query(Protein).filter(
        or_(*[Protein.proteina_buscada.ilike(f"%{p}%") for p in lista])
    )
    if organismo:
        orgs = [o.strip() for o in organismo.split(",") if o.strip()]
        if orgs:
            query = query.filter(
                or_(*[Protein.organismo.ilike(f"%{o}%") for o in orgs])
            )
    if qualidade:
        query = query.filter(Protein.qualidade == qualidade)

    resultados = query.all()

    output = io.StringIO()
    campos = [
        "pdb_id",
        "proteina_buscada",
        "titulo",
        "organismo",
        "classificacao",
        "resolucao",
        "metodo",
        "tem_ligante",
        "num_cadeias",
        "ramachandran",
        "depositado_em",
        "qualidade",
        "link_pdb",
    ]
    writer = csv.DictWriter(output, fieldnames=campos, extrasaction="ignore")
    writer.writeheader()
    for p in resultados:
        row = {c: getattr(p, c, "") for c in campos}
        row["tem_ligante"] = "Sim" if row["tem_ligante"] else "Não"
        writer.writerow(row)

    output.seek(0)
    nome = f"pdb_{proteinas[:40].replace(' ', '_').replace(',', '')}.csv"
    return output.getvalue(), nome


def uc_listar_organismos(db: Session) -> list:
    return service.listar_organismos_disponiveis(db)


def uc_cancelar_busca_parcial(db: Session, proteinas_query: str) -> dict:
    removidas = service.remover_proteinas_parciais(db, proteinas_query)
    return {"removidas": removidas}


def _proteina_dict(p: Protein) -> dict:
    return {
        "pdb_id": p.pdb_id,
        "proteina_buscada": p.proteina_buscada,
        "titulo": p.titulo,
        "organismo": p.organismo,
        "classificacao": p.classificacao,
        "resolucao": p.resolucao,
        "metodo": p.metodo,
        "tem_ligante": p.tem_ligante,
        "num_cadeias": p.num_cadeias,
        "ramachandran": p.ramachandran,
        "depositado_em": p.depositado_em,
        "qualidade": p.qualidade,
        "link_pdb": p.link_pdb,
    }
