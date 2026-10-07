"""
usecases/admin.py — Orquestração das operações administrativas.

Valida regras de negócio (chaves válidas, limites),
delega persistência para o service. Não conhece HTTP.
"""

import glob
import os
import shutil
import subprocess
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.services import admin as service
from app.infra.db.database import get_config

CHAVES_VALIDAS = {
    "ttl_dias",
    "max_por_proteina",
    "limpeza_automatica",
    "drug_hunter_path",
    "python_bin",
    "chimera_path",
    "dock6_path",
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_password",
    "smtp_from",
}


def uc_stats(db: Session) -> dict:
    return service.stats_cache(db)


def uc_listar_configs(db: Session) -> dict:
    return service.listar_configs(db)


def uc_atualizar_config(db: Session, chave: str, valor: str) -> dict:
    """Valida e atualiza uma configuração do sistema."""
    if chave not in CHAVES_VALIDAS:
        raise HTTPException(
            status_code=400,
            detail=f"Chave inválida. Chaves válidas: {sorted(CHAVES_VALIDAS)}",
        )

    if chave == "ttl_dias":
        try:
            v = int(valor)
            if v < 1 or v > 365:
                raise ValueError
        except ValueError:
            raise HTTPException(
                status_code=400, detail="ttl_dias deve ser um número entre 1 e 365"
            )

    if chave == "max_por_proteina":
        try:
            v = int(valor)
            if v < 1 or v > 500:
                raise ValueError
        except ValueError:
            raise HTTPException(
                status_code=400, detail="max_por_proteina deve ser entre 1 e 500"
            )

    if chave == "limpeza_automatica":
        if valor.lower() not in ("true", "false"):
            raise HTTPException(
                status_code=400, detail="limpeza_automatica deve ser 'true' ou 'false'"
            )
        valor = valor.lower()

    if chave == "drug_hunter_path":
        valor = valor.strip()

    if chave == "python_bin":
        valor = valor.strip()
        if not valor:
            raise HTTPException(
                status_code=400, detail="python_bin não pode ser vazio"
            )

    if chave in ("chimera_path", "dock6_path"):
        valor = valor.strip()

    if chave == "smtp_port":
        try:
            v = int(valor)
            if v < 1 or v > 65535:
                raise ValueError
        except ValueError:
            raise HTTPException(
                status_code=400, detail="smtp_port deve ser um número entre 1 e 65535"
            )

    if chave == "smtp_password":
        valor = valor.strip()
        if not valor:
            # Senha em branco → manter a existente sem sobrescrever
            existente = get_config(db, "smtp_password", "")
            sentinela = "__set__" if existente else ""
            return {"chave": chave, "valor": sentinela, "mensagem": "Senha mantida sem alteração."}
        from app.infra.crypto import encrypt_value
        valor = encrypt_value(valor)

    cfg = service.atualizar_config(db, chave, valor)

    # Para smtp_password retorna sentinela, nunca o valor criptografado
    valor_retorno = "__set__" if chave == "smtp_password" else cfg.valor
    return {
        "chave": cfg.chave,
        "valor": valor_retorno,
        "mensagem": "Configuração atualizada.",
    }


def uc_limpar_cache(db: Session) -> dict:
    return service.limpar_proteinas_expiradas(db)


def uc_proximas_expirar(db: Session, aviso_dias: int) -> dict:
    return {
        "aviso_dias": aviso_dias,
        "proteinas": service.proteinas_proximas_expiracao(db, aviso_dias),
    }


def uc_organismos(db: Session) -> dict:
    orgs = service.listar_organismos(db)
    return {"total": len(orgs), "organismos": orgs}


def uc_listar_usuarios(db: Session) -> dict:
    return service.listar_usuarios(db)


def uc_set_admin(
    db: Session, usuario_id: int, is_admin: bool, current_user_id: int
) -> dict:
    try:
        return service.set_admin_usuario(db, usuario_id, is_admin, current_user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


def uc_validar_drughunter(db: Session) -> dict:
    """Verifica se o ambiente do DrugHunter está corretamente configurado."""

    drug_hunter_path = get_config(db, "drug_hunter_path") or os.environ.get("DRUG_HUNTER_PATH", "")
    python_bin = get_config(db, "python_bin") or os.environ.get("PYTHON_BIN", "")
    chimera_cfg = get_config(db, "chimera_path") or os.environ.get("CHIMERA_PATH", "")
    dock6_cfg = get_config(db, "dock6_path") or os.environ.get("DOCK6_PATH", "")

    checks = []

    # 1. Pasta do DrugHunter existe
    dh_ok = bool(drug_hunter_path) and os.path.isdir(drug_hunter_path)
    checks.append({
        "nome": "Pasta do DrugHunter",
        "ok": dh_ok,
        "mensagem": drug_hunter_path if dh_ok else f"Não encontrada: {drug_hunter_path or '(não configurado)'}",
        "como_corrigir": None if dh_ok else (
            "Vá em Configurações → DrugHunter e preencha o caminho completo da pasta. "
            "Para obter o caminho: navegue até a pasta no gerenciador de arquivos, clique com o botão direito "
            "→ Copiar caminho; ou abra um terminal dentro dela e execute pwd."
        ),
    })

    # 2. Estrutura src/wrappers/docking.py
    struct_ok = False
    if dh_ok:
        docking_py = os.path.join(drug_hunter_path, "src", "wrappers", "docking.py")
        struct_ok = os.path.isfile(docking_py)
        checks.append({
            "nome": "Estrutura interna (src/wrappers/docking.py)",
            "ok": struct_ok,
            "mensagem": "Arquivo encontrado" if struct_ok else f"Não encontrado: {docking_py}",
            "como_corrigir": None if struct_ok else (
                "A pasta do DrugHunter parece incompleta. Verifique se o ZIP foi extraído corretamente "
                "e se o caminho configurado aponta para a pasta raiz do DrugHunter."
            ),
        })
    else:
        checks.append({
            "nome": "Estrutura interna (src/wrappers/docking.py)",
            "ok": False,
            "mensagem": "Não verificado — pasta do DrugHunter não encontrada.",
            "como_corrigir": "Configure a pasta do DrugHunter primeiro.",
        })

    # 3. Python bin existe
    python_ok = bool(python_bin) and (
        os.path.isfile(python_bin) or shutil.which(python_bin) is not None
    )
    checks.append({
        "nome": "Executável Python (ambiente DrugHunter)",
        "ok": python_ok,
        "mensagem": python_bin if python_ok else f"Não encontrado: {python_bin or '(não configurado)'}",
        "como_corrigir": None if python_ok else (
            "Ative o ambiente conda com 'conda activate DrugHunter' e execute 'which python' no terminal. "
            "Cole o caminho completo em Configurações → DrugHunter → Executável Python."
        ),
    })

    # 4. DrugHunter importável
    if dh_ok and struct_ok and python_ok:
        try:
            result = subprocess.run(
                [
                    python_bin, "-c",
                    "import sys; sys.path.insert(0,'src'); from wrappers.docking import perform_redocking; print('ok')",
                ],
                capture_output=True, text=True, cwd=drug_hunter_path, timeout=20,
            )
            import_ok = result.returncode == 0 and "ok" in result.stdout
            checks.append({
                "nome": "DrugHunter importável",
                "ok": import_ok,
                "mensagem": "perform_redocking importado com sucesso" if import_ok
                    else (result.stderr or result.stdout or "Erro desconhecido")[:300],
                "como_corrigir": None if import_ok else (
                    "Verifique se o ambiente conda 'DrugHunter' foi criado com 'conda env create -f requirements.yml' "
                    "e se o Executável Python em Configurações aponta para esse ambiente."
                ),
            })
        except subprocess.TimeoutExpired:
            checks.append({
                "nome": "DrugHunter importável",
                "ok": False,
                "mensagem": "Tempo limite excedido ao tentar importar (>20 s).",
                "como_corrigir": "Verifique se o ambiente conda está correto e se o Python configurado é do ambiente DrugHunter.",
            })
    else:
        checks.append({
            "nome": "DrugHunter importável",
            "ok": False,
            "mensagem": "Não verificado — configure os itens anteriores primeiro.",
            "como_corrigir": "Corrija os itens marcados em vermelho acima e teste novamente.",
        })

    # 5. Conflito bson/pymongo — pacote standalone 'bson' do PyPI quebra o pymongo
    #    Sintoma: "module 'bson' has no attribute 'encode'" ao rodar o ChEMBL/ADMET
    if python_ok:
        try:
            result_bson = subprocess.run(
                [python_bin, "-c",
                 "import bson; print('conflict' if not hasattr(bson, 'encode') else 'ok')"],
                capture_output=True, text=True, timeout=10,
            )
            bson_output = result_bson.stdout.strip()
            if result_bson.returncode != 0 or bson_output == "ok":
                # bson não instalado OU é o bson do pymongo (tem encode) → sem conflito
                bson_ok = True
                bson_msg = "Nenhum conflito detectado"
            else:
                # bson standalone instalado sem o atributo encode → conflito real
                bson_ok = False
                bson_msg = (
                    "Pacote 'bson' standalone detectado — causa o erro "
                    "\"module 'bson' has no attribute 'encode'\" ao rodar análises."
                )
        except subprocess.TimeoutExpired:
            bson_ok = True  # não bloqueia se o check travar
            bson_msg = "Não verificado (timeout)"
        checks.append({
            "nome": "Conflito bson/pymongo",
            "ok": bson_ok,
            "mensagem": bson_msg,
            "como_corrigir": None if bson_ok else (
                "Abra um terminal e execute os dois comandos abaixo, um de cada vez:\n"
                "  1. conda activate DrugHunter\n"
                "  2. pip uninstall bson -y\n"
                "Depois clique em 'Verificar ambiente' novamente para confirmar."
            ),
        })
    else:
        checks.append({
            "nome": "Conflito bson/pymongo",
            "ok": False,
            "mensagem": "Não verificado — configure o executável Python primeiro.",
            "como_corrigir": "Corrija o item 'Executável Python' acima e teste novamente.",
        })

    # 7. UCSF Chimera
    chimera_dir = chimera_cfg
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
    chimera_ok = bool(chimera_dir) and os.path.isdir(chimera_dir)
    checks.append({
        "nome": "UCSF Chimera",
        "ok": chimera_ok,
        "mensagem": f"Encontrado em: {chimera_dir}" if chimera_ok else "Não encontrado",
        "como_corrigir": None if chimera_ok else (
            "Verifique se o install.sh foi executado (Linux) ou se o Chimera foi instalado manualmente (Windows). "
            "Se instalado em local não padrão, preencha o caminho do diretório bin em "
            "Configurações → DrugHunter → Caminho do Chimera."
        ),
        "path_detectado": chimera_dir if chimera_ok else None,
    })

    # 8. Dock6
    dock6_dir = dock6_cfg
    if not dock6_dir:
        cand = Path.home() / "progs" / "dock6" / "bin"
        if cand.is_dir():
            dock6_dir = str(cand)
    dock6_ok = bool(dock6_dir) and os.path.isdir(dock6_dir)
    checks.append({
        "nome": "Dock6",
        "ok": dock6_ok,
        "mensagem": f"Encontrado em: {dock6_dir}" if dock6_ok else "Não encontrado",
        "como_corrigir": None if dock6_ok else (
            "Verifique se o install.sh foi executado (Linux) ou se o Dock6 foi instalado manualmente (Windows). "
            "Se instalado em local não padrão, preencha o caminho do diretório bin em "
            "Configurações → DrugHunter → Caminho do Dock6."
        ),
        "path_detectado": dock6_dir if dock6_ok else None,
    })

    # 9. DMS (binário de geração de superfície molecular — necessário para o consenso)
    dms_binary = ""
    if dh_ok:
        bundled = Path(drug_hunter_path) / "apps" / "dms" / "dms"
        if bundled.is_file():
            dms_binary = str(bundled)
    if not dms_binary:
        found_dms = shutil.which("dms")
        if found_dms:
            dms_binary = found_dms
    dms_ok = bool(dms_binary)
    checks.append({
        "nome": "DMS (superfície molecular — Consenso)",
        "ok": dms_ok,
        "mensagem": f"Encontrado em: {dms_binary}" if dms_ok else "Não encontrado (apps/dms/dms ou PATH)",
        "como_corrigir": None if dms_ok else (
            "O binário DMS não foi encontrado. Execute o install.sh do DrugHunter (Linux) para compilá-lo. "
            "No Windows, compile manualmente a partir da pasta apps/dms/ incluída no DrugHunter. "
            "Sem o DMS, o docking de consenso (Dock6) não funcionará."
        ),
    })

    # 10. Open Babel (obabel CLI no env DH — opcional, tem fallback RDKit)
    obabel_ok = False
    obabel_msg = "Não verificado — configure o executável Python primeiro."
    if python_ok:
        obabel_bin = str(Path(python_bin).parent / "obabel")
        if os.path.isfile(obabel_bin):
            obabel_ok = True
            obabel_msg = f"Encontrado em: {obabel_bin}"
        else:
            found_ob = shutil.which("obabel")
            if found_ob:
                obabel_ok = True
                obabel_msg = f"Encontrado em: {found_ob}"
            else:
                obabel_msg = "Não encontrado no ambiente DrugHunter (fallback RDKit ativo para MD)"
    checks.append({
        "nome": "Open Babel — obabel (preparação do ligante — MD)",
        "ok": obabel_ok,
        "mensagem": obabel_msg,
        "como_corrigir": None if obabel_ok else (
            "Opcional — o PDB Explorer usa RDKit como fallback. "
            "Para resultados de maior qualidade: conda activate DrugHunter && conda install -c conda-forge openbabel"
        ),
        "opcional": True,
    })

    # 11. AmberTools / antechamber (opcional, cargas AM1-BCC — tem fallback MMFF94)
    antechamber_ok = False
    antechamber_msg = "Não verificado — configure o executável Python primeiro."
    if python_ok:
        antechamber_bin = str(Path(python_bin).parent / "antechamber")
        if os.path.isfile(antechamber_bin):
            antechamber_ok = True
            antechamber_msg = f"Encontrado em: {antechamber_bin}"
        else:
            found_ac = shutil.which("antechamber")
            if found_ac:
                antechamber_ok = True
                antechamber_msg = f"Encontrado em: {found_ac}"
            else:
                antechamber_msg = "Não encontrado no ambiente DrugHunter (fallback MMFF94 ativo para MD)"
    checks.append({
        "nome": "AmberTools / antechamber (cargas AM1-BCC — MD)",
        "ok": antechamber_ok,
        "mensagem": antechamber_msg,
        "como_corrigir": None if antechamber_ok else (
            "Opcional — o PDB Explorer usa cargas MMFF94 como fallback. "
            "Não recomendado para MD de publicação. "
            "Para instalar: conda activate DrugHunter && conda install -c conda-forge ambertools"
        ),
        "opcional": True,
    })

    # 12. Kaleido (necessário para gerar gráficos PNG da análise de trajetória)
    kaleido_ok = False
    kaleido_msg = "Não verificado — configure o executável Python primeiro."
    if python_ok:
        try:
            result_kal = subprocess.run(
                [python_bin, "-c", "from kaleido.scopes.plotly import PlotlyScope; print('ok')"],
                capture_output=True, text=True, timeout=10,
            )
            kaleido_ok = result_kal.returncode == 0 and "ok" in result_kal.stdout
            kaleido_msg = "Importado com sucesso" if kaleido_ok else (
                (result_kal.stderr or result_kal.stdout or "Não instalado")[:200].strip()
            )
        except subprocess.TimeoutExpired:
            kaleido_ok = False
            kaleido_msg = "Timeout ao verificar"
    checks.append({
        "nome": "Kaleido (gráficos de análise de trajetória — MD)",
        "ok": kaleido_ok,
        "mensagem": kaleido_msg,
        "como_corrigir": None if kaleido_ok else (
            "Necessário para gerar os gráficos PNG ao final da análise de trajetória. "
            "conda activate DrugHunter && pip install kaleido==0.2.1 --force-reinstall"
        ),
    })

    return {"checks": checks}


def uc_corrigir_bson(db: Session) -> dict:
    """Remove o pacote bson standalone do env DH, resolvendo o conflito com pymongo."""
    python_bin = get_config(db, "python_bin") or os.environ.get("PYTHON_BIN", "")
    if not python_bin or not (os.path.isfile(python_bin) or shutil.which(python_bin)):
        return {"ok": False, "mensagem": "Executável Python não configurado. Configure em Configurações → DrugHunter → Executável Python."}
    try:
        result = subprocess.run(
            [python_bin, "-m", "pip", "uninstall", "bson", "-y"],
            capture_output=True, text=True, timeout=30,
        )
        saida = (result.stderr + result.stdout).strip()
        if result.returncode == 0:
            if "not installed" in saida.lower() or "WARNING: Skipping" in saida:
                return {"ok": True, "mensagem": "O pacote 'bson' standalone não estava instalado. Ambiente sem conflito."}
            return {"ok": True, "mensagem": "Pacote 'bson' removido com sucesso. Execute 'Testar Configuração' novamente para confirmar."}
        return {"ok": False, "mensagem": f"Erro ao remover: {saida[:300]}"}
    except subprocess.TimeoutExpired:
        return {"ok": False, "mensagem": "Timeout ao tentar remover o pacote bson (>30 s)."}
