"""
usecases/auth.py — Orquestração das regras de negócio de autenticação.

Recebe dados primitivos das rotas, orquestra chamadas ao service,
e retorna dicts prontos para serialização. Não conhece Request/Response.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.domain.models import User
from app.core.security import decodificar_token, criar_access_token
from app.services import auth as service


def uc_registrar(db: Session, email: str, username: str, password: str) -> dict:
    """Registra um novo usuário e retorna tokens de acesso."""
    user = service.registrar_usuario(db, email, username, password)
    tokens = service.gerar_tokens(user)
    return {
        "mensagem": "Conta criada com sucesso!",
        "is_admin": user.is_admin,
        **tokens,
    }


def uc_login(db: Session, login: str, senha: str) -> dict:
    """Autentica o usuário e retorna par de tokens."""
    user = service.autenticar_usuario(db, login, senha)
    return service.gerar_tokens(user)


def uc_refresh(db: Session, refresh_token: str) -> dict:
    """Valida o refresh_token e emite um novo access_token."""
    payload = decodificar_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado. Faça login novamente.",
        )
    user_id = payload.get("sub")
    user = (
        db.query(User).filter(User.id == int(user_id), User.is_active.is_(True)).first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado."
        )
    novo_access = criar_access_token(
        {"sub": str(user.id), "username": user.username, "is_admin": user.is_admin}
    )
    return {"access_token": novo_access, "token_type": "bearer"}


def uc_perfil(usuario: User) -> dict:
    """Retorna dados públicos do usuário autenticado."""
    return {
        "id": usuario.id,
        "email": usuario.email,
        "username": usuario.username,
        "is_admin": usuario.is_admin,
        "created_at": usuario.created_at.strftime("%d/%m/%Y")
        if usuario.created_at
        else None,
    }


def uc_historico(db: Session, user_id: int, limite: int) -> list:
    return service.historico_usuario(db, user_id, limite)


def uc_historico_detalhe(db: Session, user_id: int, search_id: int) -> dict:
    detalhe = service.buscar_historico_detalhe(db, user_id, search_id)
    if not detalhe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Busca não encontrada."
        )
    return detalhe


def uc_excluir_historico(db: Session, user_id: int, search_id: int) -> None:
    removido = service.excluir_historico_item(db, user_id, search_id)
    if not removido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Busca não encontrada."
        )


def uc_alterar_senha(
    db: Session, usuario: User, senha_atual: str, nova_senha: str
) -> dict:
    service.alterar_senha(db, usuario, senha_atual, nova_senha)
    return {"mensagem": "Senha alterada com sucesso."}


def uc_solicitar_reset(db: Session, email: str) -> dict:
    resultado = service.solicitar_reset_senha(db, email)
    if resultado:
        from app.infra.email_sender import enviar_email_reset_senha
        token, dest_email = resultado
        enviado = enviar_email_reset_senha(dest_email, token)
        if not enviado:
            raise HTTPException(
                status_code=503,
                detail="SMTP não configurado. Configure as credenciais de e-mail nas configurações do sistema.",
            )
    # Resposta genérica para não vazar se o email existe
    return {"mensagem": "Se o e-mail estiver cadastrado, você receberá as instruções em breve."}


def uc_resetar_senha(db: Session, token: str, nova_senha: str) -> dict:
    service.resetar_senha(db, token, nova_senha)
    return {"mensagem": "Senha redefinida com sucesso. Faça login com a nova senha."}


def uc_listar_usuarios(db: Session) -> list:
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


def uc_toggle_usuario(db: Session, admin: User, user_id: int) -> dict:
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
