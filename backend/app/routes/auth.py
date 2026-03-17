"""
routes/auth.py — Rotas de autenticação (/api/auth)

Responsabilidade exclusiva: receber requisições HTTP,
extrair parâmetros e delegar para os use cases.
Não contém lógica de negócio.
"""

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.infra.db.database import get_db
from app.core.deps import get_usuario_atual, get_usuario_admin
from app.domain.models import User
from app.domain.schemas.auth import RegistroRequest, RefreshRequest, AlterarSenhaRequest
from app.usecases import auth as uc

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegistroRequest, db: Session = Depends(get_db)):
    """Cria uma nova conta. O primeiro usuário registrado vira admin."""
    return uc.uc_registrar(db, body.email, body.username, body.password)


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login com email/username + senha. Retorna access_token e refresh_token."""
    return uc.uc_login(db, form.username, form.password)


@router.post("/refresh")
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    """Renova o access_token usando o refresh_token."""
    return uc.uc_refresh(db, body.refresh_token)


@router.get("/me")
def me(usuario: User = Depends(get_usuario_atual)):
    """Retorna dados do usuário autenticado."""
    return uc.uc_perfil(usuario)


@router.get("/me/historico")
def meu_historico(
    limite: int = 50,
    usuario: User = Depends(get_usuario_atual),
    db: Session = Depends(get_db),
):
    """Retorna as últimas buscas do usuário logado."""
    return {
        "username": usuario.username,
        "historico": uc.uc_historico(db, usuario.id, limite),
    }


@router.get("/me/historico/{search_id}")
def historico_detalhe(
    search_id: int,
    usuario: User = Depends(get_usuario_atual),
    db: Session = Depends(get_db),
):
    """Retorna as proteínas de uma busca histórica específica."""
    return uc.uc_historico_detalhe(db, usuario.id, search_id)


@router.delete("/me/historico/{search_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_historico(
    search_id: int,
    usuario: User = Depends(get_usuario_atual),
    db: Session = Depends(get_db),
):
    """Remove uma busca histórica específica do usuário autenticado."""
    uc.uc_excluir_historico(db, usuario.id, search_id)


@router.put("/me/senha")
def alterar_senha(
    body: AlterarSenhaRequest,
    usuario: User = Depends(get_usuario_atual),
    db: Session = Depends(get_db),
):
    """Altera a senha do usuário autenticado."""
    return uc.uc_alterar_senha(db, usuario, body.senha_atual, body.nova_senha)


@router.get("/admin/usuarios")
def listar_usuarios(
    admin: User = Depends(get_usuario_admin), db: Session = Depends(get_db)
):
    """[Admin] Lista todos os usuários cadastrados."""
    return uc.uc_listar_usuarios(db)


@router.put("/admin/usuarios/{user_id}/toggle-ativo")
def toggle_usuario_ativo(
    user_id: int,
    admin: User = Depends(get_usuario_admin),
    db: Session = Depends(get_db),
):
    """[Admin] Ativa ou desativa uma conta de usuário."""
    return uc.uc_toggle_usuario(db, admin, user_id)
