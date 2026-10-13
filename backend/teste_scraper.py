"""
Teste standalone do scraper — lista de proteínas
Uso:
    python teste_scraper.py "glucan synthase"
    python teste_scraper.py "glucan synthase, FKS1, arabinose dehydrogenase"
    python teste_scraper.py  (usa exemplo padrão)
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from app.services.scraper import executar_scraping


async def main(proteinas_input: str):
    print("=" * 70)
    print("  DrugHunter Studio — Teste do Scraper")
    print(f"  Proteínas: {proteinas_input}")
    print("=" * 70)

    resultados = []

    async for evento in executar_scraping(proteinas_input):
        tipo = evento.get("tipo")

        if tipo == "lista_proteinas":
            print(f"\n🔬 {evento['total_proteinas']} proteína(s) para buscar:")
            for p in evento["proteinas"]:
                print(f"   • {p}")
            print()

        elif tipo == "inicio_proteina":
            print(f"\n── [{evento['indice']}/{evento['total']}] Buscando: {evento['proteina']}")

        elif tipo == "ids_encontrados":
            n = evento["total_ids"]
            dup = evento.get("duplicatas_ignoradas", 0)
            msg = f"   → {n} estruturas encontradas"
            if dup:
                msg += f" ({dup} duplicatas ignoradas de outras proteínas)"
            print(msg)

        elif tipo == "progresso":
            print(f"   [{evento['atual']:>3}/{evento['total']}] {evento['pdb_id']}...", end="\r")

        elif tipo == "resultado":
            resultados.append(evento["dado"])

        elif tipo == "fim_proteina":
            print(f"   ✅ {evento['proteina']}: {evento['coletados']} estruturas coletadas{' ' * 20}")

        elif tipo == "fim":
            print(f"\n{'=' * 70}")
            print(f"  TOTAL: {evento['total_coletados']} estruturas")
            print(f"{'=' * 70}")

        elif tipo == "erro_proteina":
            print(f"\n❌ Erro em '{evento['proteina']}': {evento['mensagem']}")

    if not resultados:
        print("\nNenhum resultado.")
        return

    # ── Exibe tabela de resultados ────────────────────────────
    print(f"\n{'PDB ID':<8} {'Proteína Buscada':<22} {'Organismo':<32} {'Res.':>7} {'Lig.':>5} {'Qualidade':<12}")
    print("-" * 93)

    for r in resultados[:30]:
        org  = (r.get("organismo") or "N/A")[:31]
        prot = r.get("proteina_buscada", "")[:21]
        res  = f"{r['resolucao']:.2f}Å" if r.get("resolucao") else "  N/A"
        lig  = "✓" if r.get("tem_ligante") else "✗"
        print(f"{r['pdb_id']:<8} {prot:<22} {org:<32} {res:>7} {lig:>5}   {r.get('qualidade',''):<12}")

    if len(resultados) > 30:
        print(f"  ... e mais {len(resultados) - 30} estruturas")

    # ── Organismos únicos encontrados ─────────────────────────
    organismos = set()
    for r in resultados:
        for org in (r.get("organismo") or "").split("|"):
            org = org.strip()
            if org and org != "N/A":
                organismos.add(org)

    if organismos:
        print(f"\n🦠 Organismos encontrados ({len(organismos)}):")
        for o in sorted(organismos):
            print(f"   • {o}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        entrada = " ".join(sys.argv[1:])
    else:
        entrada = "glucan synthase, arabinose dehydrogenase"

    asyncio.run(main(entrada))
