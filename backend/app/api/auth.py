"""
Rotas de autenticação — /api/auth
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from app.db.database import get_db
from app.core.deps import get_usuario_atual, get_usuario_admin
from app.core.security import decodificar_token, criar_access_token
from app.services.auth import (
    registrar_usuario,
    autenticar_usuario,
    gerar_tokens,
    historico_usuario,
)
from app.models.models import User

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


# ── Schemas ───────────────────────────────────────────────────


class RegistroRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class RefreshRequest(BaseModel):
    refresh_token: str


class AlterarSenhaRequest(BaseModel):
    senha_atual: str
    nova_senha: str = Field(..., min_length=6)


# ── Registro ──────────────────────────────────────────────────


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegistroRequest, db: Session = Depends(get_db)):
    """
    Cria uma nova conta.
    O primeiro usuário registrado vira admin automaticamente.
    """
    user = registrar_usuario(db, body.email, body.username, body.password)
    tokens = gerar_tokens(user)
    return {
        "mensagem": "Conta criada com sucesso!",
        "is_admin": user.is_admin,
        **tokens,
    }


# ── Login ─────────────────────────────────────────────────────


@router.post("/login")
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Login com email/username + senha.
    Retorna access_token (60 min) e refresh_token (7 dias).

    Compatible com o padrão OAuth2 do FastAPI/Swagger.
    """
    user = autenticar_usuario(db, form.username, form.password)
    tokens = gerar_tokens(user)
    return tokens


# ── Refresh token ─────────────────────────────────────────────


@router.post("/refresh")
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    """
    Renova o access_token usando o refresh_token.
    Chame este endpoint quando receber 401 com o access_token expirado.
    """
    payload = decodificar_token(body.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado. Faça login novamente.",
        )

    user_id = payload.get("sub")
    user = (
        db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado."
        )

    novo_access = criar_access_token(
        {"sub": str(user.id), "username": user.username, "is_admin": user.is_admin}
    )
    return {"access_token": novo_access, "token_type": "bearer"}


# ── Perfil ────────────────────────────────────────────────────


@router.get("/me")
def me(usuario: User = Depends(get_usuario_atual)):
    """Retorna dados do usuário autenticado."""
    return {
        "id": usuario.id,
        "email": usuario.email,
        "username": usuario.username,
        "is_admin": usuario.is_admin,
        "created_at": usuario.created_at.strftime("%d/%m/%Y")
        if usuario.created_at
        else None,
    }


@router.get("/me/historico")
def meu_historico(
    limite: int = 20,
    usuario: User = Depends(get_usuario_atual),
    db: Session = Depends(get_db),
):
    """Retorna as últimas buscas do usuário logado."""
    return {
        "username": usuario.username,
        "historico": historico_usuario(db, usuario.id, limite),
    }


@router.put("/me/senha")
def alterar_senha(
    body: AlterarSenhaRequest,
    usuario: User = Depends(get_usuario_atual),
    db: Session = Depends(get_db),
):
    """Altera a senha do usuário autenticado."""
    from app.core.security import verificar_senha, hash_senha

    if not verificar_senha(body.senha_atual, usuario.hashed_password):
        raise HTTPException(status_code=400, detail="Senha atual incorreta.")

    usuario.hashed_password = hash_senha(body.nova_senha)
    db.commit()
    return {"mensagem": "Senha alterada com sucesso."}


# ── Admin: gerenciar usuários ─────────────────────────────────


@router.get("/admin/usuarios")
def listar_usuarios(
    admin: User = Depends(get_usuario_admin),
    db: Session = Depends(get_db),
):
    """[Admin] Lista todos os usuários cadastrados."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at.strftime("%d/%m/%Y") if u.created_at else None,
        }
        for u in users
    ]


@router.put("/admin/usuarios/{user_id}/toggle-ativo")
def toggle_usuario_ativo(
    user_id: int,
    admin: User = Depends(get_usuario_admin),
    db: Session = Depends(get_db),
):
    """[Admin] Ativa ou desativa uma conta de usuário."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=400, detail="Você não pode desativar sua própria conta."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    user.is_active = not user.is_active
    db.commit()

    acao = "ativado" if user.is_active else "desativado"
    return {"mensagem": f"Usuário {user.username} {acao}.", "is_active": user.is_active}
