"""
infra/email_sender.py — Envio de e-mail via SMTP usando variáveis de ambiente.

Variáveis necessárias:
  SMTP_HOST     ex: smtp.gmail.com
  SMTP_PORT     ex: 587
  SMTP_USER     ex: seu_email@gmail.com
  SMTP_PASSWORD ex: senha_de_app (Gmail: gerar em myaccount.google.com/apppasswords)
  SMTP_FROM     ex: PDB Explorer <seu_email@gmail.com>

Se alguma variável não estiver configurada, loga um aviso e retorna sem falhar.
"""

import logging
import os
import smtplib
from email.mime.text import MIMEText

logger = logging.getLogger("pdb_explorer")


def enviar_email_conclusao(
    destinatario: str,
    job_id: int,
    target: str,
    status: str,
    erro_msg: str | None,
    base_output_path: str = "",
) -> None:
    host = os.getenv("SMTP_HOST")
    port = os.getenv("SMTP_PORT", "587")
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    from_addr = os.getenv("SMTP_FROM", user or "")

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
            f"O job de redocking do alvo \"{target}\" (ID: {job_id}) falhou.\n\n"
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
