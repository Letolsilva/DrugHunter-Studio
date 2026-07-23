"""Utilitários de normalização de strings para caminhos de arquivos e subprocessos."""

import re
import unicodedata


def normalizar_target(nome: str) -> str:
    """Normaliza o nome do alvo para uso seguro em caminhos e shell.

    Regras (superconjunto do comportamento do DrugHunter de `target.replace(" ", "")`):
    - Remove acentos (NFD → ASCII)
    - Remove espaços (igual ao DrugHunter)
    - Remove caracteres que quebram shell/Tcl: [ ] ( ) { } < > | & ; $ ` ' " * ? \\ /
    - Mantém apenas [A-Za-z0-9_-]

    Exemplos:
        "[Candida] auris"  → "Candidaauris"
        "Protease (HIV-1)" → "ProteaseHIV-1"
    """
    sem_acentos = unicodedata.normalize("NFD", nome)
    sem_acentos = sem_acentos.encode("ascii", "ignore").decode("ascii")
    apenas_seguros = re.sub(r"[^A-Za-z0-9_-]", "", sem_acentos)
    return apenas_seguros
