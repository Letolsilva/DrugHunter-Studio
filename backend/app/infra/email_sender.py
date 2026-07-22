"""
infra/email_sender.py — Envio de e-mail via SMTP.

Lê configurações primeiro do banco de dados (system_config),
com fallback para variáveis de ambiente:
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
"""

import logging
import os
import smtplib
from email.mime.text import MIMEText

logger = logging.getLogger("pdb_explorer")


def _get_smtp_config() -> tuple[str | None, str, str | None, str | None, str]:
    """Lê config SMTP do banco (com fallback para env vars)."""
    try:
        from app.infra.db.database import SessionLocal, get_config
        from app.infra.crypto import decrypt_value

        db = SessionLocal()
        try:
            host = get_config(db, "smtp_host") or os.getenv("SMTP_HOST")
            port = get_config(db, "smtp_port") or os.getenv("SMTP_PORT", "587")
            user = get_config(db, "smtp_user") or os.getenv("SMTP_USER")
            password_enc = get_config(db, "smtp_password", "")
            password = decrypt_value(password_enc) if password_enc else os.getenv("SMTP_PASSWORD")
            from_addr = get_config(db, "smtp_from") or os.getenv("SMTP_FROM", user or "")
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Erro ao ler config SMTP do banco (%s) — usando env vars.", exc)
        host = os.getenv("SMTP_HOST")
        port = os.getenv("SMTP_PORT", "587")
        user = os.getenv("SMTP_USER")
        password = os.getenv("SMTP_PASSWORD")
        from_addr = os.getenv("SMTP_FROM", user or "")

    return host, port, user, password, from_addr


def enviar_email_conclusao(
    destinatario: str,
    job_id: int,
    target: str,
    status: str,
    erro_msg: str | None,
    base_output_path: str = "",
) -> None:
    host, port, user, password, from_addr = _get_smtp_config()

    if not host or not user or not password:
        logger.warning(
            "SMTP não configurado — notificação de e-mail ignorada para job %d", job_id
        )
        return

    if status == "done":
        assunto = f"[PDB Explorer] Redocking concluído — {target}"
        corpo = (
            f"Olá,\n\n"
            f'O job de redocking do alvo "{target}" (ID: {job_id}) foi concluído com sucesso.\n\n'
            f"Acesse o PDB Explorer para ver os resultados em: {base_output_path}\n\n"
            f"—\nPDB Explorer"
        )
    else:
        assunto = f"[PDB Explorer] Erro no redocking — {target}"
        corpo = (
            f"Olá,\n\n"
            f'O job de redocking do alvo "{target}" (ID: {job_id}) falhou.\n\n'
            f"Erro: {erro_msg or 'Desconhecido'}\n\n"
            f"—\nPDB Explorer"
        )

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
