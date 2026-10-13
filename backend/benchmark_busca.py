"""
benchmark_busca.py — Medição de desempenho: scraping vs cache

Uso:
    cd backend/
    python3 benchmark_busca.py

Saída: tabela no terminal + benchmark_resultados.json

Parâmetros configuráveis abaixo em CASOS, N_SCRAPING e N_CACHE.
"""

import sys
import os
import asyncio
import time
import statistics
import json

# ── Garante que rodamos do diretório backend/ ────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)

# ── Importações do projeto ────────────────────────────────────────────────────
from app.infra.db.database import SessionLocal, engine
from app.domain.models import Base, Protein
from app.infra.external.rcsb_scraper import executar_scraping, parsear_lista_proteinas
from app.services.search import separar_cache_e_pendentes, salvar_proteina_no_cache

# ═════════════════════════════════════════════════════════════════════════════
# CONFIGURAÇÃO — ajuste aqui antes de rodar
# ═════════════════════════════════════════════════════════════════════════════

# Casos de teste: (rótulo, termo_de_busca, limite_estruturas)
# limite=None → busca todas (pode ser muito lento)
CASOS = [
    ("Candida auris",        "Candida auris",        15),
    ("Candida albicans",     "Candida albicans",      50),
    ("Aspergillus fumigatus","Aspergillus fumigatus", 100),
    ("Aspergillus (geral)",  "Aspergillus",           200),
]

# Quantas vezes repetir cada medição
N_SCRAPING = 3   # cada repetição vai ao RCSB (lento; rede)
N_CACHE    = 5   # cada repetição lê o SQLite (rápido)

# ═════════════════════════════════════════════════════════════════════════════


def _limpar_cache_para_query(db, query: str) -> None:
    """Remove do banco todos os registros associados à query."""
    lista = parsear_lista_proteinas(query)
    for proteina in lista:
        db.query(Protein).filter(
            Protein.proteina_buscada.ilike(f"%{proteina}%")
        ).delete(synchronize_session=False)
    db.commit()


async def _executar_scraping_e_salvar(db, query: str, limite: int) -> tuple[float, int]:
    """
    Executa scraping completo (igual ao fluxo de produção):
    busca no RCSB + salva no cache local.
    Retorna (tempo_segundos, n_estruturas_salvas).
    """
    t0 = time.perf_counter()
    n = 0
    async for evento in executar_scraping(query, limite):
        if evento.get("tipo") == "resultado":
            salvar_proteina_no_cache(db, evento["dado"])
            n += 1
    t1 = time.perf_counter()
    return t1 - t0, n


def _medir_cache(db, query: str, limite: int) -> tuple[float, int]:
    """
    Mede apenas a leitura do cache (SQLite).
    Retorna (tempo_segundos, n_estruturas_encontradas).
    """
    t0 = time.perf_counter()
    resultados, _ = separar_cache_e_pendentes(db, query, limite)
    t1 = time.perf_counter()
    return t1 - t0, len(resultados)


async def _benchmark_caso(label: str, query: str, limite: int) -> dict:
    sep = "─" * 60
    print(f"\n{sep}")
    print(f"Caso: {label}  |  limite={limite}")
    print(sep)

    tempos_scraping: list[float] = []
    n_estruturas = 0

    # ── Rodadas de scraping ──────────────────────────────────────────────────
    print(f"Scraping ({N_SCRAPING} rodadas) — busca direta no RCSB:")
    for i in range(1, N_SCRAPING + 1):
        db = SessionLocal()
        try:
            _limpar_cache_para_query(db, query)
            t, n = await _executar_scraping_e_salvar(db, query, limite)
            tempos_scraping.append(t)
            n_estruturas = n
            print(f"  [{i}/{N_SCRAPING}]  {t:7.2f} s   ({n} estruturas)")
        finally:
            db.close()

    # ── Rodadas de cache ─────────────────────────────────────────────────────
    # Após o último scraping, o cache está populado — mede sem limpar.
    tempos_cache: list[float] = []
    print(f"\nCache ({N_CACHE} rodadas) — leitura do banco local:")
    for i in range(1, N_CACHE + 1):
        db = SessionLocal()
        try:
            t, n = _medir_cache(db, query, limite)
            tempos_cache.append(t)
            print(f"  [{i}/{N_CACHE}]  {t:.6f} s   ({n} estruturas)")
        finally:
            db.close()

    s_media = statistics.mean(tempos_scraping)
    s_dp    = statistics.stdev(tempos_scraping) if len(tempos_scraping) > 1 else 0.0
    c_media = statistics.mean(tempos_cache)
    c_dp    = statistics.stdev(tempos_cache) if len(tempos_cache) > 1 else 0.0
    fator   = s_media / c_media if c_media > 0 else float("inf")

    print(f"\n  Scraping  média: {s_media:.2f} s  DP: {s_dp:.2f} s")
    print(f"  Cache     média: {c_media:.4f} s  DP: {c_dp:.4f} s")
    print(f"  Redução:  {fator:.0f}×")

    return {
        "label":           label,
        "query":           query,
        "limite":          limite,
        "n_estruturas":    n_estruturas,
        "scraping_media":  round(s_media, 4),
        "scraping_dp":     round(s_dp,    4),
        "cache_media":     round(c_media, 6),
        "cache_dp":        round(c_dp,    6),
        "fator_reducao":   round(fator,   1),
        "tempos_scraping": [round(t, 4) for t in tempos_scraping],
        "tempos_cache":    [round(t, 6) for t in tempos_cache],
    }


def _imprimir_tabela(resultados: list[dict]) -> None:
    col = [26, 7, 24, 22, 8]
    linha = "─" * sum(col)

    cabecalho = (
        f"{'Consulta':<{col[0]}}"
        f"{'N':>{col[1]}}"
        f"{'1ª busca (scraping)':>{col[2]}}"
        f"{'2ª busca (cache)':>{col[3]}}"
        f"{'Fator':>{col[4]}}"
    )

    print("\n\n" + "═" * sum(col))
    print("  RESULTADOS DO BENCHMARK — scraping vs cache")
    print("═" * sum(col))
    print(cabecalho)
    print(linha)

    for r in resultados:
        scrap = f"{r['scraping_media']:.2f} ± {r['scraping_dp']:.2f} s"
        cache = f"{r['cache_media']:.4f} ± {r['cache_dp']:.4f} s"
        fator = f"{r['fator_reducao']:.0f}×"
        print(
            f"{r['label']:<{col[0]}}"
            f"{r['n_estruturas']:>{col[1]}}"
            f"{scrap:>{col[2]}}"
            f"{cache:>{col[3]}}"
            f"{fator:>{col[4]}}"
        )

    print(linha)
    print(
        f"\n  Scraping: {N_SCRAPING} repetições (cache limpo, acesso ao RCSB)\n"
        f"  Cache:    {N_CACHE} repetições (banco SQLite local)\n"
        f"  Valores: média ± desvio-padrão"
    )


async def main() -> None:
    # Garante que o banco e as tabelas existam antes de qualquer operação
    Base.metadata.create_all(bind=engine)

    print("DrugHunter Studio — Benchmark de desempenho de busca")
    print(f"Banco: {os.path.abspath('drughunter_studio.db')}")
    print(f"Casos: {len(CASOS)} | Scraping: {N_SCRAPING}× | Cache: {N_CACHE}×")
    print("Isso pode levar vários minutos dependendo da velocidade da rede.\n")

    resultados = []
    for label, query, limite in CASOS:
        r = await _benchmark_caso(label, query, limite)
        resultados.append(r)

    _imprimir_tabela(resultados)

    saida_json = os.path.join(SCRIPT_DIR, "benchmark_resultados.json")
    with open(saida_json, "w", encoding="utf-8") as f:
        json.dump(
            {
                "config": {"N_SCRAPING": N_SCRAPING, "N_CACHE": N_CACHE},
                "resultados": resultados,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )
    print(f"\nResultados detalhados salvos em: {saida_json}")


if __name__ == "__main__":
    asyncio.run(main())
