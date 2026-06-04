"""
services/visualizador.py — Parse e agrupamento de arquivos .pdb por registro.

Responsabilidade: leitura do arquivo e construção da árvore de grupos.
Não conhece HTTP nem usecases.
"""

from typing import Dict, List
from app.infra.storage.storage_service import LocalStorageService


def _parse_linha(line: str) -> dict:
    """Extrai campos de uma linha ATOM ou HETATM pelo formato de colunas fixas do PDB."""
    return {
        "tipo": line[0:6].strip(),
        "serial": line[6:11].strip(),
        "name": line[12:16].strip(),
        "resname": line[17:20].strip(),
        "chain": line[21:22].strip(),
        "resnum": line[22:26].strip(),
        "raw": line.rstrip(),
    }


def construir_arvore(storage: LocalStorageService, pdb_id: str) -> dict:
    """
    Lê o arquivo .pdb e retorna a árvore agrupada:
    {
      "ATOM":   { "GLN": [{"chain": "A", "resnum": "14", "n_atomos": 9}], ... },
      "HETATM": { "MN":  [{"chain": "A", "resnum": "2001", "n_atomos": 1}], ... }
    }
    """
    key = f"{pdb_id.upper()}.pdb"
    if not storage.exists(key):
        raise FileNotFoundError(f"Arquivo {key} não encontrado no storage.")

    conteudo = storage.read(key).decode("utf-8", errors="replace")

    # grupos[tipo][resname][(chain, resnum)] = contagem de átomos
    grupos: Dict[str, Dict[str, Dict[tuple, int]]] = {
        "ATOM": {},
        "HETATM": {},
    }

    for line in conteudo.splitlines():
        tipo = line[0:6].strip()
        if tipo not in ("ATOM", "HETATM"):
            continue
        parsed = _parse_linha(line)
        resname = parsed["resname"]
        chain = parsed["chain"]
        resnum = parsed["resnum"]

        bucket = grupos[tipo]
        if resname not in bucket:
            bucket[resname] = {}
        chave = (chain, resnum)
        bucket[resname][chave] = bucket[resname].get(chave, 0) + 1

    # Serializa para JSON-friendly
    resultado: Dict[str, Dict[str, List[dict]]] = {"ATOM": {}, "HETATM": {}}
    for tipo in ("ATOM", "HETATM"):
        for resname, folhas in grupos[tipo].items():
            resultado[tipo][resname] = [
                {"chain": ch, "resnum": rn, "n_atomos": n}
                for (ch, rn), n in sorted(
                    folhas.items(),
                    key=lambda x: (
                        x[0][0],
                        int(x[0][1]) if x[0][1].lstrip("-").isdigit() else x[0][1],
                    ),
                )
            ]

    return resultado


def buscar_linhas_grupo(
    storage: LocalStorageService,
    pdb_id: str,
    tipo: str,
    resname: str,
    chain: str,
    resnum: str,
) -> List[str]:
    """Retorna as linhas raw do arquivo para um grupo específico (lazy load)."""
    key = f"{pdb_id.upper()}.pdb"
    if not storage.exists(key):
        raise FileNotFoundError(f"Arquivo {key} não encontrado no storage.")

    conteudo = storage.read(key).decode("utf-8", errors="replace")
    tipo_norm = tipo.upper().ljust(6)[:6]
    resname_norm = resname.upper()
    chain_norm = chain.upper()
    resnum_norm = resnum.strip()

    linhas = []
    for line in conteudo.splitlines():
        if not line.startswith(tipo_norm):
            continue
        parsed = _parse_linha(line)
        if (
            parsed["resname"] == resname_norm
            and parsed["chain"] == chain_norm
            and parsed["resnum"] == resnum_norm
        ):
            linhas.append(line.rstrip())

    return linhas
