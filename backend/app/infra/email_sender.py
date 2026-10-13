"""
infra/email_sender.py — Envio de e-mail via SMTP usando variáveis de ambiente.

Variáveis necessárias:
  SMTP_HOST     ex: smtp.gmail.com
  SMTP_PORT     ex: 587
  SMTP_USER     ex: seu_email@gmail.com
  SMTP_PASSWORD ex: senha_de_app (Gmail: gerar em myaccount.google.com/apppasswords)
  SMTP_FROM     ex: DrugHunter Studio <seu_email@gmail.com>

Se alguma variável não estiver configurada, loga um aviso e retorna sem falhar.
"""

import logging
import os
import smtplib
from email.mime.text import MIMEText
from pathlib import Path

logger = logging.getLogger("drughunter_studio")

_DEFAULT_HOST = "smtp.gmail.com"
_DEFAULT_PORT = "587"
_DEFAULT_USER = "pdbexplorer@gmail.com"
_DEFAULT_PASSWORD = "%%SMTP_PASSWORD%%"
_DEFAULT_FROM = "DrugHunter Studio <pdbexplorer@gmail.com>"


def _default_password() -> str | None:
    """Senha default: injetada no build (.deb) ou lida de .smtp_secret em dev.

    - No .deb: o build.sh substitui %%SMTP_PASSWORD%% pelo conteúdo de .smtp_secret.
    - Em dev: o placeholder permanece, então lê .smtp_secret na raiz do repositório.
    Retorna None se nenhuma das duas fontes estiver disponível.
    """
    if _DEFAULT_PASSWORD and "%%" not in _DEFAULT_PASSWORD:
        return _DEFAULT_PASSWORD

    try:
        # email_sender.py → infra → app → backend → raiz do repositório
        secret_file = Path(__file__).resolve().parents[3] / ".smtp_secret"
        if secret_file.exists():
            conteudo = secret_file.read_text(encoding="utf-8").strip()
            if conteudo:
                return conteudo
    except Exception as exc:
        logger.warning("Falha ao ler .smtp_secret (%s)", exc)

    return None


def _get_smtp_config() -> tuple[str | None, str, str | None, str | None, str]:
    """Lê config SMTP na ordem: banco → env vars → defaults embutidos no build."""
    try:
        from app.infra.db.database import SessionLocal, get_config
        from app.infra.crypto import decrypt_value

        db = SessionLocal()
        try:
            host = get_config(db, "smtp_host") or os.getenv("SMTP_HOST")
            port = get_config(db, "smtp_port") or os.getenv("SMTP_PORT")
            user = get_config(db, "smtp_user") or os.getenv("SMTP_USER")
            password_enc = get_config(db, "smtp_password", "")
            password = decrypt_value(password_enc) if password_enc else os.getenv("SMTP_PASSWORD")
            from_addr = get_config(db, "smtp_from") or os.getenv("SMTP_FROM")
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Erro ao ler config SMTP do banco (%s) — usando env vars.", exc)
        host = os.getenv("SMTP_HOST")
        port = os.getenv("SMTP_PORT")
        user = os.getenv("SMTP_USER")
        password = os.getenv("SMTP_PASSWORD")
        from_addr = os.getenv("SMTP_FROM")

    # Fallback final: defaults embutidos no build (.deb)
    host = host or _DEFAULT_HOST
    port = port or _DEFAULT_PORT
    user = user or _DEFAULT_USER
    password = password or _default_password()
    from_addr = from_addr or _DEFAULT_FROM or user or ""

    return host, port, user, password, from_addr


def enviar_email_conclusao(
    destinatario: str,
    job_id: int,
    target: str,
    status: str,
    erro_msg: str | None,
    base_output_path: str = "",
    modulo: str = "Redocking",
) -> None:
    host, port, user, password, from_addr = _get_smtp_config()

    if not host or not user or not password:
        logger.warning(
            "SMTP não configurado — notificação de e-mail ignorada para job %d", job_id
        )
        return

    modulo_lower = modulo.lower()

    if status == "done":
        assunto = f"[DrugHunter Studio] {modulo} concluído — {target}"
        corpo = (
            f"Olá,\n\n"
            f'O job de {modulo_lower} do alvo "{target}" (ID: {job_id}) foi concluído com sucesso.\n\n'
            f"Acesse o DrugHunter Studio para ver os resultados em: {base_output_path}\n\n"
            f"—\nDrugHunter Studio"
        )
    else:
        assunto = f"[DrugHunter Studio] Erro em {modulo} — {target}"
        corpo = (
            f"Olá,\n\n"
            f'O job de {modulo_lower} do alvo "{target}" (ID: {job_id}) falhou.\n\n'
            f"── Resumo do erro ──\n"
            f"{erro_msg or 'Erro desconhecido.'}\n\n"
        )
        if modulo == "Redocking":
            corpo += (
                f"── O que verificar ──\n"
                f"• Os arquivos .pdb do alvo estão na pasta correta?\n"
                f"• O Chimera e o Vina estão instalados e no PATH configurado?\n"
                f"• O nome do ligante e RESNUM batem com o que está no PDB?\n\n"
            )
        corpo += "—\nDrugHunter Studio"

    msg = MIMEText(corpo, "plain", "utf-8")
    msg["Subject"] = assunto
    msg["From"] = from_addr
    msg["To"] = destinatario

    try:
        with smtplib.SMTP(host, int(port)) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(user, password)
            smtp.sendmail(from_addr, destinatario, msg.as_string())
        logger.info(
            "E-mail de conclusão enviado para %s (job %d)", destinatario, job_id
        )
    except Exception as exc:
        logger.warning(
            "Falha ao enviar e-mail para %s (job %d): %s", destinatario, job_id, exc
        )
