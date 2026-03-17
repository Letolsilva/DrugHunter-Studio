"""
Rotas de busca — /api/search  (Fase 3)
Buscas associadas ao usuário logado quando autenticado.
"""

import json
import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.deps import get_usuario_opcional
from app.models.models import User
from app.services.scraper import executar_scraping, parsear_lista_proteinas
from app.services.cache import (
    separar_cache_e_pendentes,
    salvar_proteina_no_cache,
    registrar_busca,
    listar_organismos_disponiveis,
)

router = APIRouter(prefix="/api/search", tags=["Busca"])


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


# ── Busca com progresso SSE ───────────────────────────────────


@router.get("/stream")
async def buscar_stream(
    proteinas: str = Query(
        ..., description="Uma ou mais proteínas separadas por vírgula"
    ),
    forcar_novo: bool = Query(False, description="Ignorar cache e buscar novamente"),
    db: Session = Depends(get_db),
    usuario: Optional[User] = Depends(get_usuario_opcional),
):
    """
    Busca proteínas no PDB com progresso em tempo real via SSE.
    Funciona anônimo ou autenticado — quando logado, salva no histórico do usuário.
    """

    async def gerar():
        protein_ids_salvos = []
        user_id = usuario.id if usuario else None
        erros_proteinas: list[str] = []
        cached: list = []
        proteinas_para_scrape = proteinas

        # ── Cache (por proteína individual) ───────────────────
        if not forcar_novo:
            cached, pendentes = separar_cache_e_pendentes(db, proteinas)

            if cached:
                yield _sse({"tipo": "cache_hit", "total": len(cached)})
                for p in cached:
                    yield _sse({"tipo": "resultado", "dado": _p(p), "cache": True})

            if not pendentes:
                # Todas as proteínas estavam em cache
                yield _sse(
                    {
                        "tipo": "fim",
                        "total_coletados": len(cached),
                        "veio_do_cache": True,
                    }
                )
                registrar_busca(
                    db,
                    user_id,
                    proteinas,
                    None,
                    len(cached),
                    veio_do_cache=True,
                    protein_ids=[p.id for p in cached],
                )
                return

            # Apenas as proteínas faltantes vão para scraping
            proteinas_para_scrape = ", ".join(pendentes)

        # ── Scraping das proteínas não cacheadas ──────────────
        async for evento in executar_scraping(proteinas_para_scrape):
            if evento.get("tipo") == "fim":
                total_final = len(cached) + evento.get("total_coletados", 0)
                teve_erro = len(erros_proteinas) > 0
                mensagem_erro = " | ".join(erros_proteinas) if teve_erro else None
                yield _sse(
                    {
                        "tipo": "fim",
                        "total_coletados": total_final,
                        "veio_do_cache": False,
                    }
                )
                registrar_busca(
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
                    p = salvar_proteina_no_cache(db, evento["dado"])
                    if p:
                        protein_ids_salvos.append(p.id)

                elif evento.get("tipo") == "erro_proteina":
                    erros_proteinas.append(
                        f"{evento.get('proteina', '')}: {evento.get('mensagem', 'erro desconhecido')}"
                    )

    return StreamingResponse(
        gerar(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Download CSV ──────────────────────────────────────────────


@router.get("/csv")
def download_csv(
    proteinas: str = Query(...),
    organismo: Optional[str] = Query(None),
    qualidade: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Retorna CSV dos resultados em cache com filtros opcionais."""
    from app.models.models import Protein
    from sqlalchemy import or_

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
    nome = f"pdb_{proteinas[:40].replace(' ','_').replace(',','')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={nome}"},
    )


# ── Organismos ────────────────────────────────────────────────


@router.get("/organismos")
def listar_organismos(db: Session = Depends(get_db)):
    return {"organismos": listar_organismos_disponiveis(db)}


# ── Helper ────────────────────────────────────────────────────


def _p(p) -> dict:
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


# ── Cancelar busca — limpa cache parcial ──────────────────────

from pydantic import BaseModel as _BM


class CancelarRequest(_BM):
    proteinas_query: str


@router.delete("/cancelar-parcial")
def cancelar_busca_parcial(
    body: CancelarRequest,
    db: Session = Depends(get_db),
):
    """Remove do banco proteínas salvas parcialmente ao cancelar uma busca."""
    from app.models.models import Protein, SearchResult
    from sqlalchemy import or_

    lista = parsear_lista_proteinas(body.proteinas_query)
    if not lista:
        return {"removidas": 0}

    proteinas_parciais = (
        db.query(Protein)
        .filter(or_(*[Protein.proteina_buscada.ilike(f"%{p}%") for p in lista]))
        .all()
    )

    removidas = 0
    for p in proteinas_parciais:
        db.query(SearchResult).filter(SearchResult.protein_id == p.id).delete()
        db.delete(p)
        removidas += 1

    db.commit()
    return {
        "removidas": removidas,
        "mensagem": f"{removidas} estruturas parciais removidas.",
    }
