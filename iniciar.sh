#!/usr/bin/env bash
# iniciar.sh — Inicia o PDB Explorer
# Na primeira execução instala as dependências automaticamente (~1 minuto).
# Nas próximas execuções abre imediatamente.
#
# Requisito: Python 3.8+ instalado no sistema
#   Ubuntu/Debian: sudo apt install python3 python3-venv

set -e

DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
BACKEND="$DIR/backend"
VENV="$BACKEND/.venv"

# ── Verificar Python 3 ────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    MSG="Python 3 não encontrado.\nInstale com:\n\n  sudo apt install python3 python3-venv\n\ne tente novamente."
    zenity --error --text="$MSG" 2>/dev/null || echo -e "ERRO: $MSG"
    exit 1
fi

# ── Verificar python3-venv ────────────────────────────────────────────────────
if ! python3 -m venv --help &>/dev/null; then
    MSG="Módulo venv não encontrado.\nInstale com:\n\n  sudo apt install python3-venv\n\ne tente novamente."
    zenity --error --text="$MSG" 2>/dev/null || echo -e "ERRO: $MSG"
    exit 1
fi

# ── Criar ambiente virtual e instalar dependências (apenas primeira vez) ───────
if [ ! -f "$VENV/bin/python" ]; then
    echo "┌──────────────────────────────────────────────────────┐"
    echo "│  Primeira execução: configurando o ambiente...       │"
    echo "│  Isso leva cerca de 1 minuto. Não feche esta janela. │"
    echo "└──────────────────────────────────────────────────────┘"
    python3 -m venv "$VENV"
    "$VENV/bin/pip" install --quiet --upgrade pip
    "$VENV/bin/pip" install --quiet -r "$BACKEND/requirements.txt"
    echo "✅ Ambiente configurado com sucesso!"
    echo ""
else
    # Garante que o bcrypt está na versão correta (corrige instalações antigas)
    "$VENV/bin/pip" install --quiet "bcrypt==4.0.1"
fi

# ── Copiar .env.example se ainda não existir .env ────────────────────────────
if [ ! -f "$BACKEND/.env" ] && [ -f "$BACKEND/.env.example" ]; then
    cp "$BACKEND/.env.example" "$BACKEND/.env"
    # Gera uma SECRET_KEY única para esta instalação
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null | tr -d '-')
    sed -i "s|SECRET_KEY=TROQUE_ESTA_CHAVE_EM_PRODUCAO_abc123xyz789|SECRET_KEY=$SECRET|" "$BACKEND/.env"
fi

# ── Abrir navegador após 3 segundos ──────────────────────────────────────────
(sleep 3 && xdg-open http://localhost:8765 2>/dev/null) &

# ── Iniciar servidor ──────────────────────────────────────────────────────────
echo "🚀 Iniciando PDB Explorer em http://localhost:8765"
echo "   Pressione Ctrl+C para encerrar."
echo ""
cd "$BACKEND"
exec "$VENV/bin/python" -m uvicorn app.main:app --host 127.0.0.1 --port 8765

