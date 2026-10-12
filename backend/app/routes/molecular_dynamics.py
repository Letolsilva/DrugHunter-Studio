"""
routes/molecular_dynamics.py — Rotas do módulo Dinâmica Molecular (/api/molecular-dynamics)

POST   /api/molecular-dynamics/upload/ligante              → { file_path, filename }
POST   /api/molecular-dynamics/upload/receptor             → { file_path, filename }
GET    /api/molecular-dynamics/redocking/{job_id}/ligantes → lista mol2 disponíveis
GET    /api/molecular-dynamics/redocking/{job_id}/receptores → lista pdb disponíveis
POST   /api/molecular-dynamics/iniciar                     → 202 MDJobResponse
GET    /api/molecular-dynamics/jobs                        → List[MDJobResponse]
GET    /api/molecular-dynamics/job/{job_id}                → MDJobResponse (polling)
DELETE /api/molecular-dynamics/job/{job_id}                → 204
GET    /api/molecular-dynamics/job/{job_id}/files          → lista arquivos de saída
GET    /api/molecular-dynamics/job/{job_id}/download/{filename} → FileResponse
"""
import json
import shutil
import time
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_atual
from app.domain.models import User
from app.domain.schemas.molecular_dynamics import (
    IniciarMDRequest,
    MDJobResponse,
    MDLiganteInfo,
    MDReceptorInfo,
    MdAnalysisJobResponse,
    UploadFileResponse,
)
from app.infra.db.database import get_db, get_config
from app.domain.models.consensus_job import ConsensusJob
from app.services import molecular_dynamics as svc
from app.services import redocking as redocking_svc
from app.usecases import molecular_dynamics as uc

router = APIRouter(prefix="/api/molecular-dynamics", tags=["Dinâmica Molecular"])

_ALLOWED_LIGAND_EXT  = {".mol2", ".pdb"}
_ALLOWED_RECEPTOR_EXT = {".pdb"}
_MAX_UPLOAD_MB = 50


def _job_response(j, dh_dir: str = "") -> MDJobResponse:
    params = None
    if j.params_json:
        try:
            params = json.loads(j.params_json)
        except Exception:
            pass
    output_path_absolute = None
    if j.base_output_path and dh_dir:
        output_path_absolute = str(Path(dh_dir) / j.base_output_path.lstrip("/"))

    warnings: list[str] = []
    if output_path_absolute:
        warnings_file = Path(output_path_absolute) / "warnings.json"
        if warnings_file.exists():
            try:
                warnings = json.loads(warnings_file.read_text(encoding="utf-8"))
            except Exception:
                pass

    return MDJobResponse(
        id=j.id,
        status=j.status,
        molecule_id=j.molecule_id,
        smiles=j.smiles,
        target=j.target,
        ligand_source=j.ligand_source,
        consensus_job_id=j.consensus_job_id,
        ligand_filename=j.ligand_filename,
        receptor_source=j.receptor_source,
        receptor_path=j.receptor_path,
        receptor_filename=j.receptor_filename,
        base_output_path=j.base_output_path,
        output_path_absolute=output_path_absolute,
        error_msg=j.error_msg,
        warnings=warnings,
        created_at=j.created_at,
        finished_at=j.finished_at,
        params=params,
    )


def _salvar_upload(file: UploadFile, subdir: str, db: Session) -> str:
    dh_dir = get_config(db, "drug_hunter_path") or ""
    upload_dir = Path(dh_dir) / "resultados" / "dinamica" / "uploads" / subdir
    upload_dir.mkdir(parents=True, exist_ok=True)

    suffix    = Path(file.filename or "arquivo").suffix.lower()
    safe_name = f"{int(time.time())}_{Path(file.filename or 'arquivo').stem}{suffix}"
    dest      = upload_dir / safe_name

    content = file.file.read()
    if len(content) > _MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Arquivo muito grande. Limite: {_MAX_UPLOAD_MB} MB.",
        )

    dest.write_bytes(content)
    return str(dest)


# ── Jobs de redocking disponíveis ────────────────────────────────────────────

@router.get("/redocking-jobs")
def listar_redocking_jobs(
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna os jobs de redocking concluídos do usuário para uso no seletor de ligante/receptor."""
    jobs = redocking_svc.listar_jobs_usuario(db, usuario.id)
    return [
        {
            "id": j.id,
            "target": j.target,
            "status": j.status,
            "iniciado_em": j.iniciado_em.isoformat() if j.iniciado_em else None,
        }
        for j in jobs
        if j.status == "done"
    ]


@router.get("/consensus-jobs")
def listar_consensus_jobs(
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Retorna os jobs de consenso concluídos do usuário para uso no seletor de ligante."""
    jobs = (
        db.query(ConsensusJob)
        .filter(ConsensusJob.user_id == usuario.id, ConsensusJob.status == "done")
        .order_by(ConsensusJob.created_at.desc())
        .all()
    )
    return [
        {
            "id": j.id,
            "target": j.target,
            "status": j.status,
            "criado_em": j.created_at.isoformat() if j.created_at else None,
        }
        for j in jobs
    ]


# ── Uploads ───────────────────────────────────────────────────────────────────

@router.post("/upload/ligante", response_model=UploadFileResponse)
def upload_ligante(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in _ALLOWED_LIGAND_EXT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensão não suportada: {suffix}. Use .mol2 ou .pdb.",
        )
    file_path = _salvar_upload(file, "ligante", db)
    return UploadFileResponse(file_path=file_path, filename=Path(file_path).name)


@router.post("/upload/receptor", response_model=UploadFileResponse)
def upload_receptor(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in _ALLOWED_RECEPTOR_EXT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensão não suportada: {suffix}. Use .pdb.",
        )
    file_path = _salvar_upload(file, "receptor", db)
    return UploadFileResponse(file_path=file_path, filename=Path(file_path).name)


# ── Helpers de seleção de arquivos ────────────────────────────────────────────

@router.get("/consensus/{consensus_job_id}/ligantes", response_model=list[MDLiganteInfo])
def listar_ligantes_consenso(
    consensus_job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    try:
        items = uc.uc_listar_ligantes_consenso(db, consensus_job_id, usuario)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return [MDLiganteInfo(**i) for i in items]


@router.get("/consensus/{consensus_job_id}/receptores", response_model=list[MDReceptorInfo])
def listar_receptores_consenso(
    consensus_job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    items = uc.uc_listar_receptores_consenso(db, consensus_job_id, usuario)
    return [MDReceptorInfo(**i) for i in items]


# ── Jobs ──────────────────────────────────────────────────────────────────────

@router.post("/iniciar", response_model=MDJobResponse, status_code=status.HTTP_202_ACCEPTED)
def iniciar(
    req: IniciarMDRequest,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    dh_dir = get_config(db, "drug_hunter_path") or ""
    try:
        job = uc.uc_iniciar_md(db=db, usuario=usuario, req=req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    return _job_response(job, dh_dir)


@router.get("/jobs", response_model=list[MDJobResponse])
def listar_jobs(
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    dh_dir = get_config(db, "drug_hunter_path") or ""
    jobs = uc.uc_listar_jobs(db, usuario)
    return [_job_response(j, dh_dir) for j in jobs]


@router.get("/job/{job_id}", response_model=MDJobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    dh_dir = get_config(db, "drug_hunter_path") or ""
    job = uc.uc_get_job(db, job_id, usuario)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado.")
    return _job_response(job, dh_dir)


@router.delete("/job/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_job(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    ok = uc.uc_deletar_job(db, job_id, usuario)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado.")


# ── Resultados ────────────────────────────────────────────────────────────────

@router.get("/job/{job_id}/files")
def listar_arquivos(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    job = uc.uc_get_job(db, job_id, usuario)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado.")
    if job.status != "done":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job ainda não concluído.")

    dh_dir = get_config(db, "drug_hunter_path") or ""
    out_dir = Path(dh_dir) / job.base_output_path.lstrip("/")
    if not out_dir.exists():
        return {"files": []}

    files = sorted(
        f.name for f in out_dir.iterdir()
        if f.is_file() and not f.name.startswith(".")
    )
    return {"files": files}


@router.post("/job/{job_id}/analyse", response_model=MdAnalysisJobResponse, status_code=status.HTTP_202_ACCEPTED)
def iniciar_analise(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    try:
        analise = uc.uc_iniciar_analise(db=db, job_id=job_id, usuario=usuario)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return analise


@router.get("/job/{job_id}/analysis", response_model=MdAnalysisJobResponse)
def get_analise(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    analise = uc.uc_get_analise(db=db, md_job_id=job_id, usuario=usuario)
    if analise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Análise não encontrada.")
    return analise


@router.get("/job/{job_id}/analysis/files")
def listar_arquivos_analise(
    job_id: int,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    job = uc.uc_get_job(db, job_id, usuario)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado.")
    if not job.base_output_path:
        return {"analysis": [], "visualization": []}

    dh_dir  = get_config(db, "drug_hunter_path") or ""
    out_dir = Path(dh_dir) / job.base_output_path.lstrip("/")

    def _list_dir(subdir: str) -> list[str]:
        d = out_dir / subdir
        if not d.exists():
            return []
        return sorted(f.name for f in d.iterdir() if f.is_file() and not f.name.startswith("."))

    return {"analysis": _list_dir("analysis"), "visualization": _list_dir("visualization")}


_ANALYSIS_MIME = {
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".html": "text/html",
    ".htm":  "text/html",
    ".csv":  "text/csv",
    ".txt":  "text/plain",
}

@router.get("/job/{job_id}/analysis/view/{subdir}/{filename}")
def visualizar_arquivo_analise(
    job_id: int,
    subdir: str,
    filename: str,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    """Serve arquivos de analysis/ ou visualization/ sem forçar download (para img/iframe)."""
    if subdir not in ("analysis", "visualization"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subdiretório inválido.")

    job = uc.uc_get_job(db, job_id, usuario)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado.")
    if not job.base_output_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sem output path.")

    safe_name = Path(filename).name
    dh_dir    = get_config(db, "drug_hunter_path") or ""
    file_path = Path(dh_dir) / job.base_output_path.lstrip("/") / subdir / safe_name

    if not file_path.resolve().is_relative_to(Path(dh_dir).resolve()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado.")
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Arquivo '{safe_name}' não encontrado.")

    suffix      = file_path.suffix.lower()
    media_type  = _ANALYSIS_MIME.get(suffix, "application/octet-stream")
    content     = file_path.read_bytes()
    return Response(content=content, media_type=media_type)


@router.get("/job/{job_id}/download/{filename}")
def download_arquivo(
    job_id: int,
    filename: str,
    db: Session = Depends(get_db),
    usuario: User = Depends(get_usuario_atual),
):
    job = uc.uc_get_job(db, job_id, usuario)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job não encontrado.")
    if job.status != "done":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job ainda não concluído.")

    safe_name = Path(filename).name
    dh_dir    = get_config(db, "drug_hunter_path") or ""
    file_path = Path(dh_dir) / job.base_output_path.lstrip("/") / safe_name

    if not file_path.resolve().is_relative_to(Path(dh_dir).resolve()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado.")
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Arquivo '{safe_name}' não encontrado.")

    return FileResponse(str(file_path), filename=safe_name)
