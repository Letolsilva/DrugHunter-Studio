"""
Core — Segurança: hashing de senha e geração/validação de JWT.

Não depende de nada do domínio ou da infraestrutura —
é utilitário puro reutilizado por qualquer módulo.
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

_CHAVE_PADRAO = "TROQUE_ESTA_CHAVE_EM_PRODUCAO_abc123xyz789"
SECRET_KEY = os.getenv("SECRET_KEY", _CHAVE_PADRAO)
if SECRET_KEY == _CHAVE_PADRAO:
    logging.getLogger("drughunter_studio").warning(
        "⚠️  SECRET_KEY não configurada — usando chave padrão insegura. "
        "Configure a variável de ambiente SECRET_KEY antes de rodar em produção."
    )
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)


def verificar_senha(senha_plana: str, hash_: str) -> bool:
    return pwd_context.verify(senha_plana, hash_)


def criar_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload.update({"exp": expire, "type": "access"})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def criar_refresh_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload.update({"exp": expire, "type": "refresh"})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decodificar_token(token: str) -> Optional[dict]:
    """Retorna payload do JWT ou None se inválido/expirado."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def criar_reset_token(user_id: int) -> str:
    """Gera JWT de uso único para reset de senha (15 min)."""
    payload = {
        "sub": str(user_id),
        "type": "reset",
        "exp": datetime.utcnow() + timedelta(minutes=15),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
