#!/usr/bin/env bash
# build.sh — Gera pdb-explorer.deb para Ubuntu/Debian
#
# Fluxo do usuário:
#   1. Recebe pdb-explorer.deb
#   2. Duplo-clique → Ubuntu Software → "Instalar" (pede senha sudo uma vez)
#   3. App aparece no menu GNOME → clica → navegador abre
#   Sem terminal, sem "Permitir Execução", sem extrair em lugar específico.
#
# Dados do usuário ficam em ~/.local/share/pdb-explorer/ (isolado por usuário).

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
PKG="$ROOT/pdb-explorer-pkg"

# ── Build frontend ─────────────────────────────────────────────────────────────
echo "▶ Buildando frontend..."
cd "$ROOT/frontend" && npm ci --silent && npm run build
rm -rf "$ROOT/backend/static"
cp -r "$ROOT/frontend/dist" "$ROOT/backend/static"

echo "▶ Montando estrutura do pacote..."
rm -rf "$PKG"
mkdir -p "$PKG/DEBIAN"
mkdir -p "$PKG/opt/pdb-explorer/backend"
mkdir -p "$PKG/usr/share/applications"
mkdir -p "$PKG/usr/share/icons/hicolor/scalable/apps"

# ── Backend ───────────────────────────────────────────────────────────────────
rsync -a \
    --exclude='__pycache__' --exclude='*.pyc' --exclude='.venv' \
    --exclude='dist' --exclude='build' --exclude='*.db' \
    --exclude='*.db-shm' --exclude='*.db-wal' --exclude='.env' \
    --exclude='pdb_explorer.spec' --exclude='run.py' \
    "$ROOT/backend/app/"    "$PKG/opt/pdb-explorer/backend/app/"
rsync -a "$ROOT/backend/static/"  "$PKG/opt/pdb-explorer/backend/static/"
mkdir -p "$PKG/opt/pdb-explorer/backend/pdb_files"
cp "$ROOT/backend/requirements.txt" "$PKG/opt/pdb-explorer/backend/"
cp "$ROOT/backend/.env.example"     "$PKG/opt/pdb-explorer/backend/"
cp "$ROOT/backend/redocking.py"     "$PKG/opt/pdb-explorer/backend/"
cp "$ROOT/assets/pdb-explorer.svg"  "$PKG/usr/share/icons/hicolor/scalable/apps/pdb-explorer.svg"

# ── iniciar.sh instalado em /opt ──────────────────────────────────────────────
# Usa zenity para progresso/diálogo. Dados do usuário em ~/.local/share/pdb-explorer/
cat > "$PKG/opt/pdb-explorer/iniciar.sh" << 'ENDSCRIPT'
#!/usr/bin/env bash
APP_DIR="/opt/pdb-explorer"
DATA_DIR="$HOME/.local/share/pdb-explorer"
VENV="$DATA_DIR/.venv"
PID_FILE="$DATA_DIR/.pid"
LOG="$DATA_DIR/pdb_explorer.log"
PORT=8080

mkdir -p "$DATA_DIR/pdb_files"

# ── Já está rodando? ──────────────────────────────────────────────────────────
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    if command -v zenity &>/dev/null; then
        zenity --question \
            --title="PDB Explorer" \
            --text="O PDB Explorer já está rodando." \
            --ok-label="Abrir no navegador" \
            --cancel-label="Encerrar servidor" \
            --width=320 2>/dev/null \
        && xdg-open "http://localhost:$PORT" \
        || { kill "$(cat "$PID_FILE")" 2>/dev/null; rm -f "$PID_FILE"; }
    else
        xdg-open "http://localhost:$PORT"
    fi
    exit 0
fi
rm -f "$PID_FILE"

# ── Matar processo antigo na porta (caso PID file sumiu mas servidor ainda roda)
OLD_PID=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
if [ -n "$OLD_PID" ]; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 0.5
fi

# ── Primeira execução: criar venv e instalar dependências ─────────────────────
if [ ! -f "$VENV/bin/python" ]; then
    _instalar() {
        echo "5";  echo "# Verificando Python..."
        python3 -m venv "$VENV" > /dev/null 2>&1
        echo "25"; echo "# Atualizando pip..."
        "$VENV/bin/pip" install --quiet --upgrade pip > /dev/null 2>&1
        echo "35"; echo "# Instalando dependências (~1 minuto)..."
        "$VENV/bin/pip" install --quiet \
            -r "$APP_DIR/backend/requirements.txt" > /dev/null 2>&1
        echo "90"; echo "# Configurando..."
        if [ ! -f "$DATA_DIR/.env" ] && [ -f "$APP_DIR/backend/.env.example" ]; then
            cp "$APP_DIR/backend/.env.example" "$DATA_DIR/.env"
            SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
            sed -i "s|SECRET_KEY=TROQUE_ESTA_CHAVE_EM_PRODUCAO_abc123xyz789|SECRET_KEY=$SECRET|" \
                "$DATA_DIR/.env"
        fi
        echo "100"; echo "# Pronto!"
    }

    if command -v zenity &>/dev/null; then
        _instalar | zenity --progress \
            --title="PDB Explorer — Configuração" \
            --text="Preparando o ambiente pela primeira vez..." \
            --width=400 --auto-close 2>/dev/null
        [ $? -ne 0 ] && exit 1
    else
        python3 -m venv "$VENV"
        "$VENV/bin/pip" install --quiet --upgrade pip
        "$VENV/bin/pip" install --quiet -r "$APP_DIR/backend/requirements.txt"
        if [ ! -f "$DATA_DIR/.env" ] && [ -f "$APP_DIR/backend/.env.example" ]; then
            cp "$APP_DIR/backend/.env.example" "$DATA_DIR/.env"
            SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
            sed -i "s|SECRET_KEY=TROQUE_ESTA_CHAVE_EM_PRODUCAO_abc123xyz789|SECRET_KEY=$SECRET|" \
                "$DATA_DIR/.env"
        fi
    fi
fi

# ── Configurar .env se ainda não existe ──────────────────────────────────────
if [ ! -f "$DATA_DIR/.env" ] && [ -f "$APP_DIR/backend/.env.example" ]; then
    cp "$APP_DIR/backend/.env.example" "$DATA_DIR/.env"
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s|SECRET_KEY=TROQUE_ESTA_CHAVE_EM_PRODUCAO_abc123xyz789|SECRET_KEY=$SECRET|" \
        "$DATA_DIR/.env"
fi

# ── Iniciar servidor ──────────────────────────────────────────────────────────
export DATABASE_URL="sqlite:///$DATA_DIR/pdb_explorer.db"
export PDB_FILES_DIR="$DATA_DIR/pdb_files"
export DOTENV_PATH="$DATA_DIR/.env"

cd "$APP_DIR/backend"
"$VENV/bin/python" -m uvicorn app.main:app \
    --host 127.0.0.1 --port "$PORT" --log-level warning \
    >> "$LOG" 2>&1 &
echo $! > "$PID_FILE"

# ── Aguardar servidor ficar pronto ────────────────────────────────────────────
for _ in $(seq 1 40); do
    sleep 0.5
    "$VENV/bin/python" -c \
        "import urllib.request; urllib.request.urlopen('http://127.0.0.1:$PORT/health', timeout=1)" \
        2>/dev/null && break
done

xdg-open "http://localhost:$PORT" 2>/dev/null
ENDSCRIPT
chmod +x "$PKG/opt/pdb-explorer/iniciar.sh"

# ── .desktop em /usr/share/applications ──────────────────────────────────────
cat > "$PKG/usr/share/applications/pdb-explorer.desktop" << 'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=PDB Explorer
Comment=Busca e análise de estruturas proteicas do RCSB PDB
Exec=/opt/pdb-explorer/iniciar.sh
Icon=pdb-explorer
Terminal=false
Categories=Science;Education;
StartupNotify=true
EOF

# ── DEBIAN/control ────────────────────────────────────────────────────────────
cat > "$PKG/DEBIAN/control" << 'EOF'
Package: pdb-explorer
Version: 4.0.0
Section: science
Priority: optional
Architecture: all
Depends: python3, python3-venv
Maintainer: PDB Explorer
Description: Busca e análise de estruturas proteicas do RCSB PDB
 Aplicação web local para explorar dados moleculares do RCSB PDB.
 Dados do usuário ficam em ~/.local/share/pdb-explorer/.
EOF

# ── DEBIAN/postinst ───────────────────────────────────────────────────────────
cat > "$PKG/DEBIAN/postinst" << 'EOF'
#!/bin/sh
chmod -R a+rX /opt/pdb-explorer/
chmod +x /opt/pdb-explorer/iniciar.sh
exit 0
EOF
chmod +x "$PKG/DEBIAN/postinst"

# ── DEBIAN/prerm ──────────────────────────────────────────────────────────────
cat > "$PKG/DEBIAN/prerm" << 'EOF'
#!/bin/sh
for pid_file in /home/*/.local/share/pdb-explorer/.pid; do
    [ -f "$pid_file" ] && kill "$(cat "$pid_file")" 2>/dev/null || true
done
exit 0
EOF
chmod +x "$PKG/DEBIAN/prerm"

# ── Permissões ────────────────────────────────────────────────────────────────
find "$PKG/opt" -type f -exec chmod 644 {} \;
find "$PKG/opt" -type d -exec chmod 755 {} \;
chmod 755 "$PKG/opt/pdb-explorer/iniciar.sh"
find "$PKG/usr" -type f -exec chmod 644 {} \;
find "$PKG/usr" -type d -exec chmod 755 {} \;
chmod 644 "$PKG/usr/share/icons/hicolor/scalable/apps/pdb-explorer.svg"

# ── Gerar .deb ────────────────────────────────────────────────────────────────
echo "▶ Gerando pdb-explorer.deb..."
cd "$ROOT"
fakeroot dpkg-deb --build "$PKG" pdb-explorer.deb
rm -rf "$PKG"

echo "✅ Pronto!"
ls -lh "$ROOT/pdb-explorer.deb"
