"""
Dependencies FastAPI — injeção do usuário autenticado nas rotas.
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import decodificar_token
from app.models.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_usuario_atual(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency que extrai e valida o usuário do JWT.
    Injete nas rotas que precisam de autenticação:
        usuario: User = Depends(get_usuario_atual)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado. Faça login novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decodificar_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception

    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise credentials_exception

    return user


def get_usuario_admin(usuario: User = Depends(get_usuario_atual)) -> User:
    """
    Dependency para rotas exclusivas de admin.
    """
    if not usuario.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores.",
        )
    return usuario


def get_usuario_opcional(
    request: "Request",
    token_header: str = Depends(
        OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)
    ),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Dependency que tenta autenticar mas não bloqueia se não tiver token.
    Aceita token via header Authorization OU via query param ?token=
    (necessário para EventSource/SSE que não suporta headers customizados).
    """
    token = token_header or request.query_params.get("token")
    if not token:
        return None
    payload = decodificar_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return (
        db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    )
