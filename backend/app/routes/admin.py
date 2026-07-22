"""
routes/admin.py — Rotas de administração (/api/admin)

Responsabilidade exclusiva: receber requisições HTTP,
extrair parâmetros e delegar para os use cases.
Todas as rotas exigem autenticação de administrador.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.infra.db.database import get_db
from app.core.deps import get_usuario_admin
from app.domain.models import User
from app.domain.schemas.admin import ConfigUpdate, AdminToggle
from app.usecases import admin as uc

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), admin: User = Depends(get_usuario_admin)):
    """Retorna estatísticas completas do cache e banco."""
    return uc.uc_stats(db)


@router.get("/config")
def listar_configs(
    db: Session = Depends(get_db), admin: User = Depends(get_usuario_admin)
):
    """Lista todas as configurações do sistema."""
    return uc.uc_listar_configs(db)


@router.put("/config/{chave}")
def atualizar_config(
    chave: str,
    body: ConfigUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_usuario_admin),
):
    """Atualiza uma configuração do sistema."""
    return uc.uc_atualizar_config(db, chave, body.valor)


@router.post("/cache/limpar")
def limpar_cache(
    db: Session = Depends(get_db), admin: User = Depends(get_usuario_admin)
):
    """Executa limpeza manual de proteínas expiradas pelo TTL."""
    return uc.uc_limpar_cache(db)


@router.get("/cache/proximas-expirar")
def proximas_expirar(
    aviso_dias: int = 7,
    db: Session = Depends(get_db),
    admin: User = Depends(get_usuario_admin),
):
    """Lista proteínas que expirarão nos próximos N dias."""
    return uc.uc_proximas_expirar(db, aviso_dias)


@router.get("/organismos")
def organismos_no_banco(
    db: Session = Depends(get_db), admin: User = Depends(get_usuario_admin)
):
    """Lista todos os organismos únicos presentes no cache."""
    return uc.uc_organismos(db)


@router.get("/users")
def listar_usuarios(
    db: Session = Depends(get_db), admin: User = Depends(get_usuario_admin)
):
    """Lista todos os usuários cadastrados."""
    return uc.uc_listar_usuarios(db)


@router.patch("/users/{usuario_id}")
def set_admin(
    usuario_id: int,
    body: AdminToggle,
    db: Session = Depends(get_db),
    admin: User = Depends(get_usuario_admin),
):
    """Concede ou remove permissão de administrador de um usuário."""
    return uc.uc_set_admin(db, usuario_id, body.is_admin, admin.id)
