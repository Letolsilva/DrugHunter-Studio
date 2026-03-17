"""
services/auth.py  Acesso a dados de usuários, tokens e histórico de buscas.

Responsabilidade: operações de banco. Não conhece HTTP nem request/response.
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.domain.models import User, Search, Protein
from app.core.security import (
    hash_senha,
    verificar_senha,
    criar_access_token,
    criar_refresh_token,
)


def registrar_usuario(db: Session, email: str, username: str, senha: str) -> User:
    """Cria novo usuário. Lança 409 se email ou username já existirem."""
    if db.query(User).filter(User.email == email.lower().strip()).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este e-mail já está cadastrado.",
        )
    if db.query(User).filter(User.username == username.strip()).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este nome de usuário já está em uso.",
        )

    is_admin = db.query(User).count() == 0
    user = User(
        email=email.lower().strip(),
        username=username.strip(),
        hashed_password=hash_senha(senha),
        is_active=True,
        is_admin=is_admin,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def autenticar_usuario(db: Session, login: str, senha: str) -> User:
    """Autentica por email ou username + senha. Lança 401 se inválido."""
    user = (
        db.query(User).filter(User.email == login.lower().strip()).first()
        or db.query(User).filter(User.username == login.strip()).first()
    )
    if not user or not verificar_senha(senha, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail/usuário ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desativada. Entre em contato com o administrador.",
        )
    return user


def gerar_tokens(user: User) -> dict:
    """Gera par de access + refresh tokens para um usuário."""
    payload = {"sub": str(user.id), "username": user.username, "is_admin": user.is_admin}
    return {
        "access_token": criar_access_token(payload),
        "refresh_token": criar_refresh_token(payload),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "is_admin": user.is_admin,
        },
    }


def alterar_senha(db: Session, user: User, senha_atual: str, nova_senha: str) -> None:
    """Valida a senha atual e persiste o novo hash."""
    if not verificar_senha(senha_atual, user.hashed_password):
        raise HTTPException(status_code=400, detail="Senha atual incorreta.")
    user.hashed_password = hash_senha(nova_senha)
    db.commit()


def historico_usuario(db: Session, user_id: int, limite: int = 50) -> list:
    """Retorna as últimas N buscas do usuário com metadados."""
    buscas = (
        db.query(Search)
        .filter(Search.user_id == user_id)
        .order_by(Search.criado_em.desc())
        .limit(limite)
        .all()
    )
    return [
        {
            "id": b.id,
            "proteina_query": b.proteina_query,
            "organismo_query": b.organismo_query,
            "total_resultados": b.total_resultados,
            "veio_do_cache": b.veio_do_cache,
            "teve_erro": b.teve_erro or False,
            "mensagem_erro": b.mensagem_erro,
            "criado_em": b.criado_em.strftime("%Y-%m-%dT%H:%M:%SZ") if b.criado_em else None,
        }
        for b in buscas
    ]


def _protein_to_dict(p: Protein) -> dict:
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


def buscar_historico_detalhe(db: Session, user_id: int, search_id: int) -> Optional[dict]:
    """Retorna proteínas de uma busca histórica específica do usuário."""
    busca = (
        db.query(Search)
        .filter(Search.id == search_id, Search.user_id == user_id)
        .first()
    )
    if not busca:
        return None
    proteinas = [sr.protein for sr in busca.resultados if sr.protein]
    return {
        "id": busca.id,
        "proteina_query": busca.proteina_query,
        "organismo_query": busca.organismo_query,
        "total_resultados": busca.total_resultados,
        "veio_do_cache": busca.veio_do_cache,
        "criado_em": busca.criado_em.strftime("%Y-%m-%dT%H:%M:%SZ") if busca.criado_em else None,
        "proteinas": [_protein_to_dict(p) for p in proteinas],
    }


def excluir_historico_item(db: Session, user_id: int, search_id: int) -> bool:
    """Remove uma busca específica do usuário. Retorna True se removida."""
    busca = (
        db.query(Search)
        .filter(Search.id == search_id, Search.user_id == user_id)
        .first()
    )
    if not busca:
        return False
    db.delete(busca)
    db.commit()
    return True


def limpar_historico_antigo(db: Session) -> int:
    """Remove buscas com mais de 30 dias. Retorna quantidade removida."""
    cutoff = datetime.utcnow() - timedelta(days=30)
    buscas = db.query(Search).filter(Search.criado_em < cutoff).all()
    n = len(buscas)
    for b in buscas:
        db.delete(b)
    if n:
        db.commit()
    return n
