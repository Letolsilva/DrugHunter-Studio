"""
infra/redocking_runner.py — Executa o script de redocking em background.

Aberto como BackgroundTask do FastAPI.
Abre sessão própria de banco para não compartilhar com a requisição HTTP.
"""

import logging
import os
import subprocess
import tempfile
from pathlib import Path

from app.infra.db.database import SessionLocal
from app.infra.email_sender import enviar_email_conclusao
from app.services.redocking import atualizar_status, marcar_finalizado

logger = logging.getLogger("pdb_explorer")


def executar_redocking_background(
    job_id: int,
    base_input_path: str,
    target: str,
    base_output_path: str,
    charge_type: str,
    email_notificacao: str | None,
    csv_content: str,
) -> None:
    """
    Chamado como BackgroundTask — roda após a resposta HTTP ser enviada.
    Salva o CSV em arquivo temporário, chama o script Python e atualiza o status.
    """
    db = SessionLocal()
    try:
        atualizar_status(db, job_id, "running")

        # Script sempre fica em backend/redocking.py — detectado via __file__
        script = str(Path(__file__).resolve().parent.parent.parent / "redocking.py")

        # Salva o CSV em arquivo temporário para passar ao script
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".csv",
            prefix=f"redocking_{job_id}_",
            delete=False,
            encoding="utf-8",
        ) as tmp:
            tmp.write(csv_content)
            csv_path = tmp.name

        drug_hunter_dir = os.environ.get("DRUG_HUNTER_PATH")
        if not drug_hunter_dir:
            raise EnvironmentError(
                "Variável de ambiente DRUG_HUNTER_PATH não definida. "
                "Configure-a no arquivo backend/.env apontando para o diretório raiz do DrugHunter."
            )

        logger.info(
            "Job %d iniciando: target=%s script=%s csv=%s cwd=%s",
            job_id,
            target,
            script,
            csv_path,
            drug_hunter_dir,
        )

        resultado = subprocess.run(
            [
                os.getenv("PYTHON_BIN", "python3"),
                script,
                "--base_input_path",
                base_input_path,
                "--target",
                target,
                "--base_output_path",
                base_output_path,
                "--charge_type",
                charge_type,
                "--prepare_complex",
                "True",
                "--csv_path",
                csv_path,
            ],
            capture_output=True,
            text=True,
            cwd=drug_hunter_dir,
        )

        # Limpa o CSV temporário
        try:
            os.unlink(csv_path)
        except OSError:
            pass

        if resultado.returncode == 0:
            logger.info("Job %d concluído com sucesso", job_id)
            marcar_finalizado(db, job_id, "done")
            if email_notificacao:
                enviar_email_conclusao(
                    email_notificacao, job_id, target, "done", None, base_output_path
                )
        else:
            erro = (resultado.stderr or resultado.stdout or "Erro desconhecido")[:1000]
            logger.warning("Job %d falhou: %s", job_id, erro)
            marcar_finalizado(db, job_id, "error", erro)
            if email_notificacao:
                enviar_email_conclusao(email_notificacao, job_id, target, "error", erro)

    except Exception as exc:
        msg = str(exc)[:1000]
        logger.exception("Job %d — exceção inesperada: %s", job_id, msg)
        marcar_finalizado(db, job_id, "error", msg)
        if email_notificacao:
            enviar_email_conclusao(email_notificacao, job_id, target, "error", msg)
    finally:
        db.close()
