"""
services/visualizador_cif.py — Parse e agrupamento de arquivos .cif (PDBx/mmCIF).

Responsabilidade: leitura do arquivo e construção da árvore de grupos.
Não conhece HTTP nem usecases.

Formato PDBx/mmCIF — posições (0-based, split por whitespace):
  [0]  group_PDB     → ATOM / HETATM
  [16] auth_seq_id   → número do resíduo (autor)
  [17] auth_comp_id  → nome do resíduo 3 letras (autor)
  [18] auth_asym_id  → cadeia (autor)
  [19] auth_atom_id  → nome do átomo (autor)
"""

from typing import Dict, List, Optional

from app.infra.storage.storage_service import LocalStorageService


def _parse_linha_cif(line: str) -> Optional[dict]:
    """
    Extrai campos de uma linha ATOM/HETATM de arquivo PDBx/mmCIF.
    Retorna None se a linha não for ATOM/HETATM ou tiver tokens insuficientes.
    """
    tokens = line.split()
    if len(tokens) < 20:
        return None
    if tokens[0] not in ("ATOM", "HETATM"):
        return None
    return {
        "tipo": tokens[0],
        "resname": tokens[17],  # auth_comp_id
        "chain": tokens[18],  # auth_asym_id
        "resnum": tokens[16],  # auth_seq_id
        "name": tokens[19],  # auth_atom_id
        "raw": line.rstrip(),
    }


def construir_arvore_cif(storage: LocalStorageService, pdb_id: str) -> dict:
    """
    Lê o arquivo .cif e retorna a árvore agrupada no mesmo formato do .pdb:
    {
      "ATOM":   { "ASN": [{"chain": "A", "resnum": "22", "n_atomos": 8}], ... },
      "HETATM": { "MN":  [{"chain": "A", "resnum": "501", "n_atomos": 1}], ... }
    }
    """
    key = f"{pdb_id.upper()}.cif"
    if not storage.exists(key):
        raise FileNotFoundError(f"Arquivo {key} não encontrado no storage.")

    conteudo = storage.read(key).decode("utf-8", errors="replace")

    grupos: Dict[str, Dict[str, Dict[tuple, int]]] = {
        "ATOM": {},
        "HETATM": {},
    }

    for line in conteudo.splitlines():
        parsed = _parse_linha_cif(line)
        if parsed is None:
            continue
        tipo = parsed["tipo"]
        resname = parsed["resname"]
        chain = parsed["chain"]
        resnum = parsed["resnum"]

        bucket = grupos[tipo]
        if resname not in bucket:
            bucket[resname] = {}
        chave = (chain, resnum)
        bucket[resname][chave] = bucket[resname].get(chave, 0) + 1

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


def buscar_linhas_grupo_cif(
    storage: LocalStorageService,
    pdb_id: str,
    tipo: str,
    resname: str,
    chain: str,
    resnum: str,
) -> List[str]:
    """Retorna as linhas raw CIF para um grupo específico (lazy load)."""
    key = f"{pdb_id.upper()}.cif"
    if not storage.exists(key):
        raise FileNotFoundError(f"Arquivo {key} não encontrado no storage.")

    conteudo = storage.read(key).decode("utf-8", errors="replace")
    tipo_norm = tipo.upper()
    resname_norm = resname.upper()
    chain_norm = chain.upper()
    resnum_norm = resnum.strip()

    linhas = []
    for line in conteudo.splitlines():
        parsed = _parse_linha_cif(line)
        if parsed is None:
            continue
        if (
            parsed["tipo"] == tipo_norm
            and parsed["resname"] == resname_norm
            and parsed["chain"] == chain_norm
            and parsed["resnum"] == resnum_norm
        ):
            linhas.append(line.rstrip())

    return linhas
