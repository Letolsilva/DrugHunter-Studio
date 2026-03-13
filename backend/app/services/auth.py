"""
Serviço de autenticação — registro, login, perfil e histórico.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.models import User, Search
from app.core.security import (
    hash_senha,
    verificar_senha,
    criar_access_token,
    criar_refresh_token,
)


# ── Registro ──────────────────────────────────────────────────


def registrar_usuario(db: Session, email: str, username: str, senha: str) -> User:
    """Cria novo usuário. Lança erro se email ou username já existirem."""

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

    # Primeiro usuário registrado vira admin automaticamente
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


# ── Login ─────────────────────────────────────────────────────


def autenticar_usuario(db: Session, login: str, senha: str) -> User:
    """
    Autentica por email ou username + senha.
    Lança HTTPException 401 se credenciais inválidas.
    """
    # Tenta encontrar por email ou username
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
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "is_admin": user.is_admin,
    }
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


# ── Histórico de buscas ───────────────────────────────────────


def historico_usuario(db: Session, user_id: int, limite: int = 20) -> list:
    """Retorna as últimas N buscas do usuário com detalhes."""
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
            "criado_em": b.criado_em.strftime("%d/%m/%Y %H:%M")
            if b.criado_em
            else None,
        }
        for b in buscas
    ]
