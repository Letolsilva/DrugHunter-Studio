"""
infra/pdb_preparador.py — Garante que os arquivos .pdb do alvo existam na pasta correta.

Ordem de resolução por código:
  1. Já presente e válido na pasta do alvo → usa como está
  2. Presente em pdb_files/ (cache de downloads) → copia com o nome certo
  3. Download direto do RCSB (.pdb) → grava {PDB_CODE}.pdb
"""

import logging
import urllib.request
import urllib.error
from pathlib import Path

logger = logging.getLogger("pdb_explorer")

RCSB_PDB_URL = "https://files.rcsb.org/download/{code}.pdb"

_PDB_PREFIXES = ("HEADER", "ATOM", "HETATM", "REMARK", "MODEL", "COMPND", "TITLE")


def resolver_pasta_alvo(drug_hunter_path: str, base_input_path: str, target: str) -> Path:
    """Monta o caminho da pasta do alvo, idêntico ao que o DrugHunter usa."""
    return Path(drug_hunter_path + base_input_path + "/" + target)


def _pdb_valido(caminho: Path) -> bool:
    try:
        cabecalho = caminho.read_bytes()[:200].decode("ascii", errors="ignore")
        return any(cabecalho.startswith(p) for p in _PDB_PREFIXES)
    except Exception:
        return False


def verificar_pdb(pasta: Path, codigo: str) -> dict:
    """Verifica se {codigo}.pdb está presente e parece um PDB válido."""
    caminho = pasta / f"{codigo}.pdb"
    if not caminho.exists():
        return {"presente": False, "formato_ok": False}
    return {"presente": True, "formato_ok": _pdb_valido(caminho)}


def _baixar_url(url: str, timeout: int = 30) -> bytes | None:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        logger.warning("HTTP %d ao baixar %s", exc.code, url)
        return None
    except Exception as exc:
        logger.warning("Falha ao baixar %s: %s", url, exc)
        return None


def preparar_codigo(
    pasta: Path,
    codigo: str,
    pdb_files_dir: Path | None = None,
) -> dict:
    """Garante que {codigo}.pdb existe e é válido na pasta do alvo.

    Retorna dict com presente, formato_ok, origem.
    """
    status = verificar_pdb(pasta, codigo)
    if status["presente"] and status["formato_ok"]:
        return {**status, "origem": "pasta"}

    # Cache local (pdb_files/)
    if pdb_files_dir:
        for nome_candidato in (f"{codigo}.pdb", f"{codigo.upper()}.pdb", f"{codigo.lower()}.pdb"):
            cached = pdb_files_dir / nome_candidato
            if cached.exists():
                try:
                    pasta.mkdir(parents=True, exist_ok=True)
                    (pasta / f"{codigo}.pdb").write_bytes(cached.read_bytes())
                    logger.info("Preparou %s do cache local", codigo)
                    return {"presente": True, "formato_ok": True, "origem": "cache"}
                except Exception as exc:
                    logger.warning("Falha ao copiar cache %s: %s", codigo, exc)

    # Download do RCSB
    dados = _baixar_url(RCSB_PDB_URL.format(code=codigo))
    if dados:
        try:
            pasta.mkdir(parents=True, exist_ok=True)
            (pasta / f"{codigo}.pdb").write_bytes(dados)
            logger.info("Baixou %s do RCSB", codigo)
            return {"presente": True, "formato_ok": True, "origem": "rcsb"}
        except Exception as exc:
            logger.warning("Falha ao gravar %s.pdb: %s", codigo, exc)

    return {"presente": False, "formato_ok": False, "origem": "faltando"}
