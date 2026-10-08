#!/usr/bin/env bash
# build.sh — Gera drughunter-studio.deb para Ubuntu/Debian
#
# Fluxo do usuário:
#   1. Recebe drughunter-studio.deb
#   2. Duplo-clique → Ubuntu Software → "Instalar" (pede senha sudo uma vez)
#   3. App aparece no menu GNOME → clica → navegador abre
#   Sem terminal, sem "Permitir Execução", sem extrair em lugar específico.
#
# Dados do usuário ficam em ~/.local/share/drughunter-studio/ (isolado por usuário).

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
PKG="$ROOT/drughunter-studio-pkg"

# ── Credenciais SMTP ──────────────────────────────────────────────────────────
SMTP_SECRET_FILE="$ROOT/.smtp_secret"
if [ -f "$SMTP_SECRET_FILE" ]; then
    SMTP_PASSWORD="$(cat "$SMTP_SECRET_FILE")"
else
    echo "⚠️  Aviso: .smtp_secret não encontrado — notificações por e-mail desativadas no .deb gerado."
    SMTP_PASSWORD=""
fi

# ── Build frontend ─────────────────────────────────────────────────────────────
echo "▶ Buildando frontend..."
cd "$ROOT/frontend" && npm ci --silent && npm run build
rm -rf "$ROOT/backend/static"
cp -r "$ROOT/frontend/dist" "$ROOT/backend/static"

echo "▶ Montando estrutura do pacote..."
rm -rf "$PKG"
mkdir -p "$PKG/DEBIAN"
mkdir -p "$PKG/opt/drughunter-studio/backend"
mkdir -p "$PKG/usr/share/applications"
mkdir -p "$PKG/usr/share/icons/hicolor/scalable/apps"

# ── Backend ───────────────────────────────────────────────────────────────────
rsync -a \
    --exclude='__pycache__' --exclude='*.pyc' --exclude='.venv' \
    --exclude='dist' --exclude='build' --exclude='*.db' \
    --exclude='*.db-shm' --exclude='*.db-wal' --exclude='.env' \
    --exclude='drughunter_studio.spec' --exclude='run.py' \
    "$ROOT/backend/app/"    "$PKG/opt/drughunter-studio/backend/app/"
rsync -a "$ROOT/backend/static/"  "$PKG/opt/drughunter-studio/backend/static/"
mkdir -p "$PKG/opt/drughunter-studio/backend/pdb_files"
cp "$ROOT/backend/requirements.txt" "$PKG/opt/drughunter-studio/backend/"
cp "$ROOT/backend/.env.example"     "$PKG/opt/drughunter-studio/backend/"
cp "$ROOT/backend/redocking.py"     "$PKG/opt/drughunter-studio/backend/"

# Injeta a senha SMTP no email_sender.py do pacote (nunca no arquivo do repo)
sed -i "s|%%SMTP_PASSWORD%%|$SMTP_PASSWORD|g" \
    "$PKG/opt/drughunter-studio/backend/app/infra/email_sender.py"
cp "$ROOT/assets/drughunter-studio.svg"  "$PKG/usr/share/icons/hicolor/scalable/apps/drughunter-studio.svg"

# ── iniciar.sh instalado em /opt ──────────────────────────────────────────────
# Usa zenity para progresso/diálogo. Dados do usuário em ~/.local/share/drughunter-studio/
cat > "$PKG/opt/drughunter-studio/iniciar.sh" << 'ENDSCRIPT'
#!/usr/bin/env bash
APP_DIR="/opt/drughunter-studio"
DATA_DIR="$HOME/.local/share/drughunter-studio"
VENV="$DATA_DIR/.venv"
PID_FILE="$DATA_DIR/.pid"
LOG="$DATA_DIR/drughunter_studio.log"
PORT=8080

mkdir -p "$DATA_DIR/pdb_files"

# ── Já está rodando? ──────────────────────────────────────────────────────────
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    if command -v zenity &>/dev/null; then
        zenity --question \
            --title="DrugHunter Studio" \
            --text="O DrugHunter Studio já está rodando." \
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
            --title="DrugHunter Studio — Configuração" \
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

# ── Remover credenciais SMTP placeholder de instalações antigas ───────────────
if [ -f "$DATA_DIR/.env" ]; then
    sed -i '/^SMTP_USER=COLOQUE_/d;/^SMTP_PASSWORD=COLOQUE_/d;/^SMTP_HOST=COLOQUE_/d;/^SMTP_FROM=COLOQUE_/d;/^SMTP_PORT=COLOQUE_/d' \
        "$DATA_DIR/.env"
fi

# ── Iniciar servidor ──────────────────────────────────────────────────────────
export DATABASE_URL="sqlite:///$DATA_DIR/drughunter_studio.db"
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
chmod +x "$PKG/opt/drughunter-studio/iniciar.sh"

# ── .desktop em /usr/share/applications ──────────────────────────────────────
cat > "$PKG/usr/share/applications/drughunter-studio.desktop" << 'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=DrugHunter Studio
Comment=Interface para o DrugHunter: da busca de estruturas ao redocking e à dinâmica molecular
Exec=/opt/drughunter-studio/iniciar.sh
Icon=drughunter-studio
Terminal=false
Categories=Science;Education;
StartupNotify=true
EOF

# ── DEBIAN/control ────────────────────────────────────────────────────────────
cat > "$PKG/DEBIAN/control" << 'EOF'
Package: drughunter-studio
Version: 4.0.0
Section: science
Priority: optional
Architecture: all
Depends: python3, python3-venv
Conflicts: pdb-explorer
Replaces: pdb-explorer
Maintainer: DrugHunter Studio
Description: Interface para o DrugHunter, do RCSB PDB à dinâmica molecular
 Aplicação web local que torna o DrugHunter acessível a quem não programa.
 Dados do usuário ficam em ~/.local/share/drughunter-studio/.
EOF

# ── DEBIAN/postinst ───────────────────────────────────────────────────────────
cat > "$PKG/DEBIAN/postinst" << 'EOF'
#!/bin/sh
chmod -R a+rX /opt/drughunter-studio/
chmod +x /opt/drughunter-studio/iniciar.sh
exit 0
EOF
chmod +x "$PKG/DEBIAN/postinst"

# ── DEBIAN/prerm ──────────────────────────────────────────────────────────────
cat > "$PKG/DEBIAN/prerm" << 'EOF'
#!/bin/sh
for pid_file in /home/*/.local/share/drughunter-studio/.pid; do
    [ -f "$pid_file" ] && kill "$(cat "$pid_file")" 2>/dev/null || true
done
exit 0
EOF
chmod +x "$PKG/DEBIAN/prerm"

# ── Permissões ────────────────────────────────────────────────────────────────
find "$PKG/opt" -type f -exec chmod 644 {} \;
find "$PKG/opt" -type d -exec chmod 755 {} \;
chmod 755 "$PKG/opt/drughunter-studio/iniciar.sh"
find "$PKG/usr" -type f -exec chmod 644 {} \;
find "$PKG/usr" -type d -exec chmod 755 {} \;
chmod 644 "$PKG/usr/share/icons/hicolor/scalable/apps/drughunter-studio.svg"

# ── Gerar .deb ────────────────────────────────────────────────────────────────
echo "▶ Gerando drughunter-studio.deb..."
cd "$ROOT"
fakeroot dpkg-deb --build "$PKG" drughunter-studio.deb
rm -rf "$PKG"

echo "✅ Pronto!"
ls -lh "$ROOT/drughunter-studio.deb"
