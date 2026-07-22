"""
infra/crypto.py — Criptografia simétrica (Fernet) para valores sensíveis no banco.

Deriva a chave Fernet a partir da SECRET_KEY do sistema via SHA-256,
sem precisar de variável de ambiente adicional.
"""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken


def _get_key() -> bytes:
    from app.core.security import SECRET_KEY
    return base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode()).digest())


def encrypt_value(value: str) -> str:
    """Criptografa uma string e retorna o token Fernet."""
    return Fernet(_get_key()).encrypt(value.encode()).decode()


def decrypt_value(token: str) -> str:
    """Descriptografa um token Fernet. Retorna '' se inválido ou vazio."""
    if not token:
        return ""
    try:
        return Fernet(_get_key()).decrypt(token.encode()).decode()
    except (InvalidToken, Exception):
        return ""
