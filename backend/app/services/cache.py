"""
Serviço de cache — Fase 2
Lógica de busca, upsert, TTL configurável via banco, limpeza e stats.
"""

from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.models.models import Protein, Search, SearchResult
from app.db.database import get_config

TTL_PADRAO = 30  # fallback caso a config não exista no banco


def _ttl_dias(db: Session) -> int:
    """Lê o TTL atual do banco (configurável pelo admin)."""
    try:
        return int(get_config(db, "ttl_dias", str(TTL_PADRAO)))
    except (ValueError, TypeError):
        return TTL_PADRAO


# ── Busca no cache ────────────────────────────────────────────


def buscar_do_cache(db: Session, proteinas_query: str) -> List[Protein]:
    """
    Busca proteínas no banco pelo(s) nome(s) digitado(s).
    Retorna lista vazia se não houver nada em cache.
    A busca é feita no campo proteina_buscada (correspondência exata
    por proteína individual da lista).
    """
    from app.services.scraper import parsear_lista_proteinas

    lista = parsear_lista_proteinas(proteinas_query)
    if not lista:
        return []

    filtros = [Protein.proteina_buscada.ilike(f"%{p}%") for p in lista]
    resultados = db.query(Protein).filter(or_(*filtros)).all()

    if resultados:
        agora = datetime.utcnow()
        for p in resultados:
            p.ultima_consulta = agora
            p.total_consultas = (p.total_consultas or 0) + 1
        db.commit()

    return resultados


# ── Upsert de proteína ────────────────────────────────────────


def salvar_proteina_no_cache(db: Session, dado: dict) -> Optional[Protein]:
    """
    Insere proteína nova ou atualiza existente (upsert por pdb_id).
    Sempre atualiza ultima_consulta e incrementa total_consultas.
    """
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
        proteina_buscada=dado.get("proteina_buscada"),
        titulo=dado.get("titulo"),
        organismo=dado.get("organismo"),
        classificacao=dado.get("classificacao"),
        resolucao=dado.get("resolucao"),
        metodo=dado.get("metodo"),
        tem_ligante=dado.get("tem_ligante", False),
        num_cadeias=dado.get("num_cadeias"),
        ramachandran=dado.get("ramachandran"),
        depositado_em=dado.get("depositado_em"),
        qualidade=dado.get("qualidade"),
        link_pdb=dado.get("link_pdb"),
        criado_em=datetime.utcnow(),
        ultima_consulta=datetime.utcnow(),
        total_consultas=1,
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova


# ── Registrar busca no histórico ──────────────────────────────


def registrar_busca(
    db: Session,
    user_id: Optional[int],
    proteina_query: Optional[str],
    organismo_query: Optional[str],
    total_resultados: int,
    veio_do_cache: bool = False,
    protein_ids: Optional[List[int]] = None,
) -> Search:
    busca = Search(
        user_id=user_id,
        proteina_query=proteina_query,
        organismo_query=organismo_query,
        total_resultados=total_resultados,
        veio_do_cache=veio_do_cache,
        criado_em=datetime.utcnow(),
    )
    db.add(busca)
    db.commit()
    db.refresh(busca)

    if protein_ids:
        for pid in protein_ids:
            try:
                sr = SearchResult(search_id=busca.id, protein_id=pid)
                db.add(sr)
            except Exception:
                pass
        db.commit()

    return busca


# ── Organismos únicos no banco ────────────────────────────────


def listar_organismos_disponiveis(db: Session) -> List[str]:
    """
    Retorna lista ordenada de organismos únicos no banco.
    Expande entradas com múltiplos organismos separados por ' | '.
    """
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


# ── TTL — limpeza de expirados ────────────────────────────────


def limpar_proteinas_expiradas(db: Session) -> dict:
    """
    Remove proteínas não consultadas há mais de ttl_dias.
    Retorna resumo da limpeza.
    """
    ttl = _ttl_dias(db)
    limite = datetime.utcnow() - timedelta(days=ttl)

    expiradas = db.query(Protein).filter(Protein.ultima_consulta < limite).all()

    removidas = []
    for p in expiradas:
        removidas.append(
            {"pdb_id": p.pdb_id, "ultima_consulta": str(p.ultima_consulta)}
        )
        db.query(SearchResult).filter(SearchResult.protein_id == p.id).delete()
        db.delete(p)

    db.commit()

    return {
        "removidas": len(removidas),
        "ttl_dias": ttl,
        "limite_data": str(limite.date()),
        "detalhes": removidas,
    }


def proteinas_proximas_expiracao(db: Session, aviso_dias: int = 7) -> List[dict]:
    """
    Lista proteínas que vão expirar nos próximos aviso_dias dias.
    Útil para mostrar alertas no painel admin.
    """
    ttl = _ttl_dias(db)
    limite_expiracao = datetime.utcnow() - timedelta(days=ttl - aviso_dias)
    limite_ativo = datetime.utcnow() - timedelta(days=ttl)

    proximas = (
        db.query(Protein)
        .filter(
            Protein.ultima_consulta < limite_expiracao,
            Protein.ultima_consulta > limite_ativo,
        )
        .all()
    )

    return [
        {
            "pdb_id": p.pdb_id,
            "organismo": p.organismo,
            "ultima_consulta": str(p.ultima_consulta.date()),
            "dias_restantes": (
                p.ultima_consulta + timedelta(days=ttl) - datetime.utcnow()
            ).days,
        }
        for p in proximas
    ]


# ── Stats do cache ────────────────────────────────────────────


def stats_cache(db: Session) -> dict:
    """Estatísticas completas do cache para o painel admin."""
    ttl = _ttl_dias(db)
    limite = datetime.utcnow() - timedelta(days=ttl)

    total = db.query(func.count(Protein.id)).scalar() or 0
    expiradas = (
        db.query(func.count(Protein.id))
        .filter(Protein.ultima_consulta < limite)
        .scalar()
        or 0
    )
    com_ligante = (
        db.query(func.count(Protein.id)).filter(Protein.tem_ligante == True).scalar()
        or 0
    )
    total_buscas = db.query(func.count(Search.id)).scalar() or 0
    organismos = len(listar_organismos_disponiveis(db))

    qualidades = (
        db.query(Protein.qualidade, func.count(Protein.id))
        .group_by(Protein.qualidade)
        .all()
    )

    return {
        "total_proteinas": total,
        "proteinas_expiradas": expiradas,
        "proteinas_ativas": total - expiradas,
        "com_ligante": com_ligante,
        "total_buscas": total_buscas,
        "total_organismos": organismos,
        "ttl_dias": ttl,
        "distribuicao_qualidade": {q: n for q, n in qualidades if q},
    }
