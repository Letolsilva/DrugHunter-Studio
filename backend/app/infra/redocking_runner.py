"""
infra/redocking_runner.py — Executa o script de redocking em background.

Aberto como BackgroundTask do FastAPI.
Abre sessão própria de banco para não compartilhar com a requisição HTTP.
"""

import glob
import logging
import os
import subprocess
import tempfile
from pathlib import Path

from app.infra import job_control
from app.infra.db.database import SessionLocal, get_config
from app.infra.email_sender import enviar_email_conclusao
from app.services.redocking import atualizar_status, marcar_finalizado, salvar_csv_usuario
from app.domain.models.redocking_job import RedockingJob
from app.domain.utils.normalizacao import normalizar_target

logger = logging.getLogger("drughunter_studio")


def _csv_tem_dados(conteudo: str) -> bool:
    """True se o CSV tem ao menos 1 linha de dados além do cabeçalho."""
    linhas = [l.strip() for l in conteudo.splitlines() if l.strip()]
    return len(linhas) > 1


def _montar_path_ferramentas(python_bin: str, db) -> str:
    """Monta o PATH com as ferramentas externas que o DrugHunter chama por subprocesso.

    O backend roda o subprocesso sem ativar o conda nem ler o ~/.bashrc (que só
    vale em shell interativo), então obabel/vina (bin do env), chimera e dock6
    precisam ser colocados no PATH explicitamente. Ordem de resolução de cada
    ferramenta externa: config no banco → variável de ambiente → autodetecção.
    """
    dirs: list[str] = []

    # obabel e vina ficam no bin do env conda — derivado do próprio python_bin
    env_bin = os.path.dirname(python_bin)
    if env_bin and os.path.isdir(env_bin):
        dirs.append(env_bin)

    # Chimera (fora do conda)
    chimera_dir = get_config(db, "chimera_path") or os.environ.get("CHIMERA_PATH")
    if not chimera_dir:
        for padrao in (
            "/opt/UCSF/Chimera*/bin",
            str(Path.home() / ".local" / "UCSF-Chimera*" / "bin"),
            str(Path.home() / "UCSF-Chimera*" / "bin"),
        ):
            hits = sorted(glob.glob(padrao))
            if hits:
                chimera_dir = hits[-1]
                break
    if chimera_dir and os.path.isdir(chimera_dir):
        dirs.append(chimera_dir)

    # dock6 (sphgen, showbox, grid, dock6)
    dock6_dir = get_config(db, "dock6_path") or os.environ.get("DOCK6_PATH")
    if not dock6_dir:
        cand = Path.home() / "progs" / "dock6" / "bin"
        if cand.is_dir():
            dock6_dir = str(cand)
    if dock6_dir and os.path.isdir(dock6_dir):
        dirs.append(dock6_dir)

    existing = os.environ.get("PATH", "")
    return os.pathsep.join(dirs + ([existing] if existing else []))


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
        _job = db.query(RedockingJob).filter(RedockingJob.id == job_id).first()
        if _job is not None and _job.status == "cancelled":
            logger.info("Job %d foi cancelado antes de iniciar.", job_id)
            return

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

        drug_hunter_dir = get_config(db, "drug_hunter_path") or os.environ.get("DRUG_HUNTER_PATH")
        if not drug_hunter_dir:
            raise EnvironmentError(
                "Caminho do DrugHunter não configurado. "
                "Configure-o na tela de Configurações ou na variável DRUG_HUNTER_PATH do arquivo backend/.env."
            )

        logger.info(
            "Job %d iniciando: target=%s script=%s csv=%s cwd=%s",
            job_id,
            target,
            script,
            csv_path,
            drug_hunter_dir,
        )

        # Verifica se existem arquivos .pdb no diretório do target antes de começar.
        target_dir = Path(drug_hunter_dir) / base_input_path.lstrip("/") / normalizar_target(target)
        if not target_dir.resolve().is_relative_to(Path(drug_hunter_dir).resolve()):
            raise ValueError(f"base_input_path inválido: '{base_input_path}' aponta para fora do DrugHunter.")
        pdb_files = list(target_dir.glob("*.pdb")) if target_dir.is_dir() else []
        if not pdb_files:
            raise FileNotFoundError(
                f"Nenhum arquivo .pdb encontrado em {target_dir}. "
                "Copie os arquivos .pdb do alvo para essa pasta antes de executar o redocking."
            )

        python_bin = get_config(db, "python_bin") or os.getenv("PYTHON_BIN", "python3")

        # Monta o PATH com obabel/vina/chimera/dock6 — o subprocesso não herda
        # o conda ativado nem o ~/.bashrc (que só vale em shell interativo).
        subprocess_env = os.environ.copy()
        subprocess_env["PATH"] = _montar_path_ferramentas(python_bin, db)
        logger.info("Job %d PATH do subprocesso: %s", job_id, subprocess_env["PATH"])

        with job_control.track("redocking", job_id):
            proc = subprocess.Popen(
                [
                    python_bin,
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
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=drug_hunter_dir,
                env=subprocess_env,
                **job_control.popen_kwargs(),
            )
            job_control.attach(proc)
            _stdout, _stderr = proc.communicate()
        resultado = subprocess.CompletedProcess(proc.args, proc.returncode, _stdout, _stderr)

        if job_control.was_cancelled("redocking", job_id):
            # Cancelado pelo usuário: o status "cancelled" já foi gravado pelo endpoint.
            logger.info("Job %d cancelado pelo usuário — encerrando sem resultado.", job_id)
            try:
                os.unlink(csv_path)
            except OSError:
                pass
            return

        # Limpa o CSV temporário
        try:
            os.unlink(csv_path)
        except OSError:
            pass

        # Lê o CSV de resultado para verificar artefato (defesa independente do returncode)
        target_clean = normalizar_target(target)
        result_csv_path = Path(drug_hunter_dir) / base_input_path.lstrip("/") / target_clean / "pdb_codes.csv"
        updated_csv: str | None = None
        try:
            if result_csv_path.exists():
                updated_csv = result_csv_path.read_text(encoding="utf-8")
        except Exception as csv_exc:
            logger.warning("Job %d: falha ao ler CSV de resultado: %s", job_id, csv_exc)

        sucesso_real = resultado.returncode == 0 and _csv_tem_dados(updated_csv or "")

        if sucesso_real:
            logger.info("Job %d concluído com sucesso", job_id)
            marcar_finalizado(db, job_id, "done")

            # Só sobrescreve o CSV do usuário se o resultado tem dados
            job_obj = db.query(RedockingJob).filter(RedockingJob.id == job_id).first()
            if job_obj and updated_csv:
                salvar_csv_usuario(db, job_obj.user_id, csv_content=updated_csv)
                logger.info("Job %d: CSV com RMSD salvo no banco", job_id)

            if email_notificacao:
                enviar_email_conclusao(
                    email_notificacao, job_id, target, "done", None, base_output_path
                )
        else:
            if resultado.returncode != 0:
                erro = (resultado.stderr or resultado.stdout or "Erro desconhecido")[:1000]
            else:
                # returncode 0 mas sem artefato (falha silenciosa do DrugHunter)
                erro = (
                    "O DrugHunter finalizou sem erros reportados, mas não gerou resultados. "
                    "Verifique se os arquivos .pdb do alvo estão presentes e no formato correto."
                )
                logger.warning("Job %d: falha silenciosa — returncode 0 mas CSV sem dados", job_id)

            log_hint = f"\n\nLogs em: {drug_hunter_dir}/logs/"
            erro_completo = (erro + log_hint)[:1200]
            logger.warning("Job %d falhou: %s", job_id, erro)
            marcar_finalizado(db, job_id, "error", erro_completo)
            if email_notificacao:
                enviar_email_conclusao(
                    email_notificacao, job_id, target, "error", erro_completo
                )

    except Exception as exc:
        msg = str(exc)[:1000]
        logger.exception("Job %d — exceção inesperada: %s", job_id, msg)
        marcar_finalizado(db, job_id, "error", msg)
        if email_notificacao:
            enviar_email_conclusao(email_notificacao, job_id, target, "error", msg)
    finally:
        db.close()
