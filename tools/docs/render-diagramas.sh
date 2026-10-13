#!/usr/bin/env bash
# Renderiza todos os .mmd (Mermaid) de docs/diagramas/src em PNG (alta resolução, p/ artigo) e SVG (vetorial).
# Uso:  cd tools/docs && npm install && bash render-diagramas.sh [nome-sem-extensao ...]
# Requer Chrome/Chromium instalado (usa o do sistema; defina CHROME_PATH se necessário).
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"
SRC="$ROOT/docs/diagramas/src"; PNG="$ROOT/docs/assets/diagramas/png"; SVG="$ROOT/docs/assets/diagramas/svg"
mkdir -p "$PNG" "$SVG"

CHROME="${CHROME_PATH:-$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)}"
PCONF="$(mktemp)"; trap 'rm -f "$PCONF"' EXIT
if [ -n "$CHROME" ]; then
  printf '{"executablePath":"%s","args":["--no-sandbox"]}' "$CHROME" > "$PCONF"
else
  printf '{"args":["--no-sandbox"]}' > "$PCONF"
fi
[ -d node_modules ] || PUPPETEER_SKIP_DOWNLOAD=1 npm install --no-audit --no-fund

if [ "$#" -gt 0 ]; then FILES=(); for n in "$@"; do FILES+=("$SRC/$n.mmd"); done; else FILES=("$SRC"/*.mmd); fi
fail=0
# Casos de uso: SVG desenhado por script (layout controlado) + PNG via Inkscape
if [ "$#" -eq 0 ] || [[ " $* " == *" 06-casos-de-uso "* ]]; then
  python3 gerar_casos_de_uso.py && inkscape "$SVG/06-casos-de-uso.svg" --export-type=png --export-dpi=288 --export-background=white -o "$PNG/06-casos-de-uso.png" >/dev/null 2>&1 || { echo "   FALHOU: 06-casos-de-uso"; fail=1; }
fi
for f in "${FILES[@]}"; do
  [ -e "$f" ] || continue
  n="$(basename "${f%.*}")"
  echo ">> $n"
  npx mmdc -p "$PCONF" -c mermaid-config.json -i "$f" -o "$PNG/$n.png" -s 3 -b white -q || { echo "   FALHOU (png): $n"; fail=1; continue; }
  npx mmdc -p "$PCONF" -c mermaid-config.json -i "$f" -o "$SVG/$n.svg" -b white -q || { echo "   FALHOU (svg): $n"; fail=1; }
done
exit $fail
