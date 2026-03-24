"""
services/search.py — Acesso a dados de proteínas (cache) e histórico de buscas.

Responsabilidade: operações de banco. Não conhece HTTP nem SSE.
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.domain.models import Protein, Search, SearchResult
from app.infra.db.database import get_config

TTL_PADRAO = 30


def _ttl_dias(db: Session) -> int:
    try:
        return int(get_config(db, "ttl_dias", str(TTL_PADRAO)))
    except (ValueError, TypeError):
        return TTL_PADRAO


def separar_cache_e_pendentes(
    db: Session, proteinas_query: str, limite: Optional[int] = None
) -> tuple[List[Protein], List[str]]:
    """
    Verifica o cache proteína a proteína.
    Retorna (resultados_em_cache, proteinas_para_scrape).

    - Cache suficiente (len >= limite): usa só o cache, sem scrape.
    - Cache insuficiente (len < limite) ou sem limite (None): serve o cache
      e marca a proteína como pendente para o scraper buscar o restante.
      O scraper deve ignorar os PDB IDs já servidos do cache.
    - Sem cache: vai direto para o scraper.
    """
    from app.infra.external.rcsb_scraper import parsear_lista_proteinas

    lista = parsear_lista_proteinas(proteinas_query)
    if not lista:
        return [], []

    resultados_cache: List[Protein] = []
    pendentes: List[str] = []
    agora = datetime.utcnow()

    for proteina in lista:
        hits = (
            db.query(Protein)
            .filter(Protein.proteina_buscada.ilike(f"%{proteina}%"))
            .all()
        )
        if hits:
            cache_suficiente = limite is not None and len(hits) >= limite
            if cache_suficiente:
                # Cache tem tudo que o usuário pediu — respeita o limite
                hits_retornados = hits[:limite]
                for p in hits_retornados:
                    p.ultima_consulta = agora
                    p.total_consultas = (p.total_consultas or 0) + 1
                resultados_cache.extend(hits_retornados)
            else:
                # Cache parcial ou "todas": serve o que tem e complementa com scrape
                for p in hits:
                    p.ultima_consulta = agora
                    p.total_consultas = (p.total_consultas or 0) + 1
                resultados_cache.extend(hits)
                pendentes.append(proteina)
        else:
            pendentes.append(proteina)

    if resultados_cache:
        db.commit()

    return resultados_cache, pendentes


def salvar_proteina_no_cache(db: Session, dado: dict) -> Optional[Protein]:
    """Insere proteína nova ou atualiza existente (upsert por pdb_id)."""
    pdb_id = (dado.get("pdb_id") or "").upper()
    if not pdb_id:
        return None

    existente = db.query(Protein).filter(Protein.pdb_id == pdb_id).first()
    campos_atualizaveis = [
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

    if existente:
        for campo in campos_atualizaveis:
            if campo in dado:
                setattr(existente, campo, dado[campo])
        existente.ultima_consulta = datetime.utcnow()
        existente.total_consultas = (existente.total_consultas or 0) + 1
        db.commit()
        db.refresh(existente)
        return existente

    nova = Protein(
        pdb_id=pdb_id,
        criado_em=datetime.utcnow(),
        ultima_consulta=datetime.utcnow(),
        total_consultas=1,
        **{c: dado.get(c) for c in campos_atualizaveis},
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova


def registrar_busca(
    db: Session,
    user_id: Optional[int],
    proteina_query: Optional[str],
    organismo_query: Optional[str],
    total_resultados: int,
    veio_do_cache: bool = False,
    protein_ids: Optional[List[int]] = None,
    teve_erro: bool = False,
    mensagem_erro: Optional[str] = None,
) -> Search:
    busca = Search(
        user_id=user_id,
        proteina_query=proteina_query,
        organismo_query=organismo_query,
        total_resultados=total_resultados,
        veio_do_cache=veio_do_cache,
        teve_erro=teve_erro,
        mensagem_erro=mensagem_erro,
        criado_em=datetime.utcnow(),
    )
    db.add(busca)
    db.commit()
    db.refresh(busca)

    if protein_ids:
        for pid in protein_ids:
            try:
                db.add(SearchResult(search_id=busca.id, protein_id=pid))
            except Exception:
                pass
        db.commit()

    return busca


def listar_organismos_disponiveis(db: Session) -> List[str]:
    """Retorna lista ordenada de organismos únicos no banco."""
    rows = (
        db.query(Protein.organismo)
        .filter(
            Protein.organismo.isnot(None),
            Protein.organismo != "N/A",
            Protein.organismo != "",
        )
        .distinct()
        .all()
    )
    organismos_set = set()
    for (org,) in rows:
        if org:
            for parte in org.replace(";", "|").split("|"):
                parte = parte.strip()
                if parte and parte != "N/A":
                    organismos_set.add(parte)
    return sorted(organismos_set)


def remover_proteinas_parciais(db: Session, proteinas_query: str) -> int:
    """Remove proteínas salvas parcialmente ao cancelar uma busca."""
    from app.infra.external.rcsb_scraper import parsear_lista_proteinas

    lista = parsear_lista_proteinas(proteinas_query)
    if not lista:
        return 0

    proteinas_parciais = (
        db.query(Protein)
        .filter(or_(*[Protein.proteina_buscada.ilike(f"%{p}%") for p in lista]))
        .all()
    )
    for p in proteinas_parciais:
        db.query(SearchResult).filter(SearchResult.protein_id == p.id).delete()
        db.delete(p)

    db.commit()
    return len(proteinas_parciais)
