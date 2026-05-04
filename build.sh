#!/usr/bin/env bash
# build.sh — Gera o pacote de distribuição PDB-Explorer-linux.zip
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/PDB-Explorer-dist"

echo "▶ Buildando frontend..."
cd "$ROOT/frontend" && npm ci --silent && npm run build

echo "▶ Copiando build para backend/static/..."
rm -rf "$ROOT/backend/static"
cp -r "$ROOT/frontend/dist" "$ROOT/backend/static"

echo "▶ Montando pasta de distribuição..."
rm -rf "$DIST" && mkdir -p "$DIST/backend"

rsync -a \
    --exclude='__pycache__' --exclude='*.pyc' --exclude='.venv' \
    --exclude='dist' --exclude='build' --exclude='*.db' \
    --exclude='*.db-shm' --exclude='*.db-wal' --exclude='.env' \
    --exclude='pdb_explorer.spec' --exclude='run.py' \
    "$ROOT/backend/app/"           "$DIST/backend/app/"
rsync -a "$ROOT/backend/static/"   "$DIST/backend/static/"
# pdb_files vai vazia — cada usuário baixa os seus via busca
mkdir -p "$DIST/backend/pdb_files"
cp "$ROOT/backend/requirements.txt"  "$DIST/backend/requirements.txt"
# Usa .env real (tem SMTP) se existir; senão cai para .env.example (sem SMTP)
if [ -f "$ROOT/backend/.env" ]; then
    cp "$ROOT/backend/.env" "$DIST/backend/.env.example"
else
    cp "$ROOT/backend/.env.example" "$DIST/backend/.env.example"
fi
cp "$ROOT/backend/redocking.py"      "$DIST/backend/redocking.py"

cp "$ROOT/iniciar.sh"           "$DIST/iniciar.sh"
cp "$ROOT/PDB Explorer.desktop" "$DIST/PDB Explorer.desktop"
chmod +x "$DIST/iniciar.sh"

cat > "$DIST/LEIA-ME.txt" << 'EOF'
════════════════════════════════════════════════
  PDB Explorer — Como Usar
════════════════════════════════════════════════
REQUISITO: Python 3.8+ instalado
  Ubuntu/Debian: sudo apt install python3 python3-venv

PASSO 1 — Dar permissão ao iniciar.sh
  Botão direito → Propriedades → Permissões
  → "Permitir execução como programa"
  OU: chmod +x iniciar.sh

PASSO 2 — Iniciar
  Clique duas vezes em iniciar.sh → "Executar"
  OU: bash iniciar.sh

  Primeira vez: instala dependências (~1 min)
  Próximas vezes: abre imediatamente
  Acesse: http://localhost:8765

PASSO 3 — Encerrar
  Pressione Ctrl+C no terminal.
════════════════════════════════════════════════
EOF

echo "▶ Gerando zip..."
cd "$ROOT" && rm -f PDB-Explorer-linux.zip
zip -r PDB-Explorer-linux.zip PDB-Explorer-dist/

echo "✅ Pronto!" && ls -lh "$ROOT/PDB-Explorer-linux.zip"
