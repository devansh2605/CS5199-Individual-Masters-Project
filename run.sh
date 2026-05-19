set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

REQUIRED_NODE_MAJOR=20

DEV_MODE=0
SKIP_INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --dev) DEV_MODE=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    --help|-h) echo "Usage: ./run.sh [--dev] [--skip-install]"; exit 0 ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

case "$(uname -s)" in
  Darwin) OS="mac" ;;
  Linux)  OS="linux" ;;
  *) echo "Unsupported OS — this project runs on macOS or Linux only."; exit 1 ;;
esac

node_major=0
command -v node >/dev/null 2>&1 && node_major=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
if [ "$node_major" -lt "$REQUIRED_NODE_MAJOR" ] && [ "$SKIP_INSTALL" -eq 0 ]; then
  if [ "$OS" = "mac" ]; then
    brew install node@$REQUIRED_NODE_MAJOR
    export PATH="/opt/homebrew/opt/node@$REQUIRED_NODE_MAJOR/bin:$PATH"
  else
    curl -fsSL "https://deb.nodesource.com/setup_${REQUIRED_NODE_MAJOR}.x" | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
fi
echo "Node OK"

if ! command -v stockfish >/dev/null 2>&1 && [ "$SKIP_INSTALL" -eq 0 ]; then
  if [ "$OS" = "mac" ]; then brew install stockfish; else sudo apt-get install -y stockfish; fi
fi
echo "Stockfish OK"

if command -v python3 >/dev/null 2>&1 && [ -f requirements.txt ]; then
  python3 -m pip install --quiet --user -r requirements.txt 2>/dev/null || true
fi
echo "Python deps OK"

[ ! -f .env ] && [ -f .env.example ] && cp .env.example .env
echo ".env OK"

if [ ! -d node_modules ] || [ package.json -nt node_modules/.package-lock.json ]; then
  npm install --silent
fi
echo "npm install OK"

if [ "$DEV_MODE" -eq 1 ]; then
  npm run dev >/tmp/iac-webpack.log 2>&1 &
  trap 'kill $! 2>/dev/null || true' EXIT INT TERM
elif [ ! -f src/client/public/bundle.js ]; then
  npm run build
fi
echo "Build OK"

echo "Starting server at http://localhost:1000"
exec npm start
