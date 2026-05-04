#!/usr/bin/env bash
# build-windows.sh — Gera PDB-Explorer-Setup.exe para Windows
#
# Requer: makensis (sudo apt install nsis)
# Opcional: inkscape + imagemagick (para ícone personalizado)
#
# Fluxo do usuário:
#   1. Recebe PDB-Explorer-Setup.exe
#   2. Duplo clique → Next → Install → Finish
#   3. Ícone "PDB Explorer" aparece no Desktop e no Menu Iniciar
#   Sem terminal visível, sem admin necessário.
#
# Dados do usuário ficam em %LOCALAPPDATA%\PDB Explorer\ (isolado por usuário)

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
PKG="$ROOT/pdb-explorer-windows-pkg"

# ── Verificar makensis ────────────────────────────────────────────────────────
if ! command -v makensis &>/dev/null; then
    echo "❌ makensis não encontrado. Instale com:"
    echo "   sudo apt install nsis"
    exit 1
fi

# ── Build frontend ────────────────────────────────────────────────────────────
echo "▶ Buildando frontend..."
cd "$ROOT/frontend" && npm ci --silent && npm run build
rm -rf "$ROOT/backend/static"
cp -r "$ROOT/frontend/dist" "$ROOT/backend/static"

# ── Montar pacote ─────────────────────────────────────────────────────────────
echo "▶ Montando estrutura do pacote..."
rm -rf "$PKG"
mkdir -p "$PKG/backend"

rsync -a \
    --exclude='__pycache__' --exclude='*.pyc' --exclude='.venv' \
    --exclude='dist' --exclude='build' --exclude='*.db' \
    --exclude='*.db-shm' --exclude='*.db-wal' --exclude='.env' \
    --exclude='pdb_explorer.spec' --exclude='run.py' \
    "$ROOT/backend/app/"    "$PKG/backend/app/"
rsync -a "$ROOT/backend/static/" "$PKG/backend/static/"
mkdir -p "$PKG/backend/pdb_files"
cp "$ROOT/backend/requirements.txt" "$PKG/backend/"
cp "$ROOT/backend/.env.example"     "$PKG/backend/"
cp "$ROOT/backend/redocking.py"     "$PKG/backend/"

# ── Ícone SVG → ICO ───────────────────────────────────────────────────────────
HAS_ICON=0
if command -v inkscape &>/dev/null && command -v convert &>/dev/null; then
    echo "▶ Convertendo ícone SVG → ICO..."
    inkscape --export-type=png --export-width=256 \
        --export-filename="$PKG/_icon.png" \
        "$ROOT/assets/pdb-explorer.svg" 2>/dev/null || true
    if [ -f "$PKG/_icon.png" ]; then
        convert "$PKG/_icon.png" \
            -define icon:auto-resize=256,128,64,48,32,16 \
            "$PKG/pdb-explorer.ico" 2>/dev/null && HAS_ICON=1 || true
        rm -f "$PKG/_icon.png"
        [ $HAS_ICON -eq 1 ] && echo "   ✓ ícone gerado" || echo "   ⚠ falhou, usando ícone padrão"
    fi
else
    echo "ℹ️  inkscape/imagemagick não encontrado — ícone padrão (instale para personalizar)"
fi

# ── iniciar.ps1 ───────────────────────────────────────────────────────────────
cat > "$PKG/iniciar.ps1" << 'ENDPS1'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$APP_DIR  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$DATA_DIR = "$env:LOCALAPPDATA\PDB Explorer"
$VENV     = "$DATA_DIR\.venv"
$PID_FILE = "$DATA_DIR\.pid"
$PORT     = 8080

New-Item -ItemType Directory -Force -Path "$DATA_DIR\pdb_files" | Out-Null

# ── Já está rodando? ──────────────────────────────────────────────────────────
if (Test-Path $PID_FILE) {
    $savedPid = [int](Get-Content $PID_FILE -ErrorAction SilentlyContinue)
    $proc = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
    if ($proc) {
        $form = New-Object System.Windows.Forms.Form
        $form.Text = "PDB Explorer"
        $form.Size = New-Object System.Drawing.Size(340, 150)
        $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
        $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
        $form.MaximizeBox = $false
        $form.MinimizeBox = $false

        $lbl = New-Object System.Windows.Forms.Label
        $lbl.Text = "O PDB Explorer já está rodando."
        $lbl.AutoSize = $true
        $lbl.Location = New-Object System.Drawing.Point(20, 25)

        $btnAbrir = New-Object System.Windows.Forms.Button
        $btnAbrir.Text = "Abrir no navegador"
        $btnAbrir.Size = New-Object System.Drawing.Size(135, 30)
        $btnAbrir.Location = New-Object System.Drawing.Point(15, 70)
        $btnAbrir.DialogResult = [System.Windows.Forms.DialogResult]::OK

        $btnEncerrar = New-Object System.Windows.Forms.Button
        $btnEncerrar.Text = "Encerrar servidor"
        $btnEncerrar.Size = New-Object System.Drawing.Size(135, 30)
        $btnEncerrar.Location = New-Object System.Drawing.Point(175, 70)
        $btnEncerrar.DialogResult = [System.Windows.Forms.DialogResult]::Cancel

        $form.Controls.AddRange(@($lbl, $btnAbrir, $btnEncerrar))
        $form.AcceptButton = $btnAbrir
        $form.CancelButton = $btnEncerrar

        if ($form.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            Start-Process "http://localhost:$PORT"
        } else {
            Stop-Process -Id $savedPid -Force -ErrorAction SilentlyContinue
            Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
        }
        exit 0
    }
}
Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue

# ── Matar processo antigo na porta ────────────────────────────────────────────
try {
    $conn = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction Stop
    if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }
} catch {}

# ── Verificar Python ──────────────────────────────────────────────────────────
$python = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $ver = & $cmd --version 2>&1
        if ("$ver" -match "Python 3") { $python = $cmd; break }
    } catch {}
}
if (-not $python) {
    [System.Windows.Forms.MessageBox]::Show(
        "Python 3 não foi encontrado.`n`nInstale em: https://www.python.org/downloads/`n`nDurante a instalação, marque 'Add Python to PATH'.",
        "PDB Explorer — Python necessário",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
    Start-Process "https://www.python.org/downloads/"
    exit 1
}

# ── Primeira execução: criar venv ─────────────────────────────────────────────
if (-not (Test-Path "$VENV\Scripts\python.exe")) {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "PDB Explorer — Configuração"
    $form.Size = New-Object System.Drawing.Size(420, 120)
    $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
    $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false

    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Text = "Preparando o ambiente pela primeira vez...`nAguarde aproximadamente 1 minuto."
    $lbl.AutoSize = $true
    $lbl.Location = New-Object System.Drawing.Point(20, 25)
    $form.Controls.Add($lbl)
    $form.Show()
    [System.Windows.Forms.Application]::DoEvents()

    & $python -m venv $VENV 2>&1 | Out-Null
    & "$VENV\Scripts\pip.exe" install --quiet --upgrade pip 2>&1 | Out-Null
    & "$VENV\Scripts\pip.exe" install --quiet -r "$APP_DIR\backend\requirements.txt" 2>&1 | Out-Null

    if (-not (Test-Path "$DATA_DIR\.env") -and (Test-Path "$APP_DIR\backend\.env.example")) {
        Copy-Item "$APP_DIR\backend\.env.example" "$DATA_DIR\.env"
        $bytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $secret = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
        (Get-Content "$DATA_DIR\.env") -replace 'SECRET_KEY=TROQUE_ESTA_CHAVE_EM_PRODUCAO_abc123xyz789', "SECRET_KEY=$secret" |
            Set-Content "$DATA_DIR\.env"
    }
    $form.Close()
}

# ── .env se não existe ────────────────────────────────────────────────────────
if (-not (Test-Path "$DATA_DIR\.env") -and (Test-Path "$APP_DIR\backend\.env.example")) {
    Copy-Item "$APP_DIR\backend\.env.example" "$DATA_DIR\.env"
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
    (Get-Content "$DATA_DIR\.env") -replace 'SECRET_KEY=TROQUE_ESTA_CHAVE_EM_PRODUCAO_abc123xyz789', "SECRET_KEY=$secret" |
        Set-Content "$DATA_DIR\.env"
}

# ── Iniciar servidor ──────────────────────────────────────────────────────────
$dbPath = ("$DATA_DIR\pdb_explorer.db") -replace '\\', '/'
$pdbDir = ("$DATA_DIR\pdb_files") -replace '\\', '/'
$env:DATABASE_URL  = "sqlite:///$dbPath"
$env:PDB_FILES_DIR = $pdbDir
$env:DOTENV_PATH   = "$DATA_DIR\.env"

$proc = Start-Process `
    -FilePath "$VENV\Scripts\python.exe" `
    -ArgumentList @("-m", "uvicorn", "app.main:app",
        "--host", "127.0.0.1", "--port", "$PORT", "--log-level", "warning") `
    -WorkingDirectory "$APP_DIR\backend" `
    -WindowStyle Hidden `
    -PassThru

$proc.Id | Out-File -FilePath $PID_FILE -Encoding ASCII

# ── Aguardar servidor ─────────────────────────────────────────────────────────
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        Invoke-WebRequest "http://127.0.0.1:$PORT/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop | Out-Null
        break
    } catch {}
}

Start-Process "http://localhost:$PORT"
ENDPS1

# ── iniciar.vbs (lança PS sem flash de terminal) ──────────────────────────────
cat > "$PKG/iniciar.vbs" << 'ENDVBS'
Dim fso, scriptDir, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptDir & "\iniciar.ps1"""
CreateObject("WScript.Shell").Run cmd, 0, False
ENDVBS

# ── Gerar script NSIS ─────────────────────────────────────────────────────────
echo "▶ Gerando script NSIS..."

ICON_DEFINE=""
SHORTCUT_ICON=""
if [ "$HAS_ICON" -eq 1 ]; then
    ICON_DEFINE='!define MUI_ICON "pdb-explorer-windows-pkg\pdb-explorer.ico"
!define MUI_UNICON "pdb-explorer-windows-pkg\pdb-explorer.ico"'
    SHORTCUT_ICON=' "$INSTDIR\pdb-explorer.ico" 0'
fi

cat > "$ROOT/pdb-explorer.nsi" << ENDNSI
; PDB Explorer — Windows Installer
!include "MUI2.nsh"
Unicode True

Name "PDB Explorer"
OutFile "PDB-Explorer-Setup.exe"
InstallDir "\$LOCALAPPDATA\PDB Explorer"
RequestExecutionLevel user

${ICON_DEFINE}
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Abrir PDB Explorer agora"
!define MUI_FINISHPAGE_RUN_FUNCTION "LaunchApp"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "PortugueseBR"

Section "PDB Explorer"
  SetOutPath "\$INSTDIR"
  File /r "pdb-explorer-windows-pkg\*.*"

  CreateDirectory "\$SMPROGRAMS\PDB Explorer"
  CreateShortCut "\$SMPROGRAMS\PDB Explorer\PDB Explorer.lnk" "\$SYSDIR\wscript.exe" '"\$INSTDIR\iniciar.vbs"'${SHORTCUT_ICON}
  CreateShortCut "\$DESKTOP\PDB Explorer.lnk" "\$SYSDIR\wscript.exe" '"\$INSTDIR\iniciar.vbs"'${SHORTCUT_ICON}

  WriteUninstaller "\$INSTDIR\Desinstalar PDB Explorer.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\PDB Explorer" "DisplayName" "PDB Explorer"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\PDB Explorer" "UninstallString" '"\$INSTDIR\Desinstalar PDB Explorer.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\PDB Explorer" "DisplayVersion" "4.0.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\PDB Explorer" "Publisher" "PDB Explorer"
SectionEnd

Function LaunchApp
  ExecShell "" "\$INSTDIR\iniciar.vbs"
FunctionEnd

Section "Uninstall"
  ExecWait 'powershell.exe -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080 -State Listen -EA SilentlyContinue).OwningProcess -Force -EA SilentlyContinue"'
  RMDir /r "\$INSTDIR"
  Delete "\$SMPROGRAMS\PDB Explorer\PDB Explorer.lnk"
  RMDir "\$SMPROGRAMS\PDB Explorer"
  Delete "\$DESKTOP\PDB Explorer.lnk"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\PDB Explorer"
SectionEnd
ENDNSI

echo "   ✓ pdb-explorer.nsi gerado"

# ── Compilar .exe ─────────────────────────────────────────────────────────────
echo "▶ Compilando PDB-Explorer-Setup.exe..."
cd "$ROOT"
makensis pdb-explorer.nsi
rm -rf "$PKG" pdb-explorer.nsi

echo "✅ Pronto!"
ls -lh "$ROOT/PDB-Explorer-Setup.exe"
