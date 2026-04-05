#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# superberater — Install & Setup Script
# Supports: Supabase Cloud  OR  Supabase Local (via supabase CLI)
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# ──────────────────────────────────────────────────────────────
# 0. Pre-flight checks
# ──────────────────────────────────────────────────────────────
info "Checking prerequisites..."

command -v python3 >/dev/null 2>&1 || err "Python 3 is required. Install: https://python.org"
command -v node    >/dev/null 2>&1 || err "Node.js is required. Install: https://nodejs.org"
command -v npm     >/dev/null 2>&1 || err "npm is required (comes with Node.js)"

PY_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
ok "Python $PY_VERSION, Node $NODE_VERSION"

[[ "$NODE_VERSION" -ge 18 ]] || err "Node.js 18+ required, found $NODE_VERSION"

# ──────────────────────────────────────────────────────────────
# 1. Database mode selection
# ──────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     superberater — Database Configuration        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "  [1] Supabase Cloud  (recommended — Auth + RLS + hosted DB)"
echo "  [2] Supabase Local  (via 'supabase start' — for development)"
echo ""
read -rp "Choose database mode [1/2]: " DB_MODE
DB_MODE="${DB_MODE:-1}"

if [[ "$DB_MODE" == "2" ]]; then
    info "Supabase Local setup..."
    echo ""
    echo "  Make sure you have the Supabase CLI installed and running:"
    echo "    brew install supabase/tap/supabase   (macOS)"
    echo "    supabase start                        (in project root)"
    echo ""
    read -rp "Supabase Local URL [http://localhost:54321]: " SUPA_URL
    SUPA_URL="${SUPA_URL:-http://localhost:54321}"
    read -rp "Supabase Anon Key: " SUPA_ANON
    read -rp "Supabase Service Role Key: " SUPA_SECRET

    [[ -n "$SUPA_ANON" ]]   || err "Supabase Anon Key is required (get it from 'supabase status')"
    [[ -n "$SUPA_SECRET" ]] || err "Supabase Service Role Key is required"

    DB_TYPE="supabase"
    echo ""
    info "Run init.sql in your local Supabase SQL editor (http://localhost:54323):"
    echo "  1. backend/supabase/init.sql"
    echo ""
    read -rp "Press ENTER after you've run the SQL file..."
else
    info "Configuring Supabase Cloud..."
    echo ""
    echo "  Get your keys from: https://supabase.com → Project → Settings → API"
    echo ""
    read -rp "Supabase URL (https://xxx.supabase.co): " SUPA_URL
    read -rp "Supabase Anon/Publishable Key: "          SUPA_ANON
    read -rp "Supabase Service Role/Secret Key: "        SUPA_SECRET

    [[ -n "$SUPA_URL" ]]    || err "Supabase URL is required"
    [[ -n "$SUPA_ANON" ]]   || err "Supabase Anon Key is required"
    [[ -n "$SUPA_SECRET" ]] || err "Supabase Service Role Key is required"

    DB_TYPE="supabase"
    echo ""
    warn "Run these SQL files in your Supabase SQL Editor (in order):"
    echo "  1. backend/supabase/init.sql"
    echo "  2. backend/supabase/rls_supabase.sql"
    echo ""
    read -rp "Press ENTER after you've run both SQL files in Supabase..."
fi

# ──────────────────────────────────────────────────────────────
# 2. OpenRouter API Key
# ──────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}OpenRouter API Key${NC}"
echo "  Get a free key at: https://openrouter.ai/keys (no credit card needed)"
echo ""
read -rp "OpenRouter API Key (sk-or-v1-...): " OPENROUTER_KEY
[[ -n "$OPENROUTER_KEY" ]] || err "OpenRouter API key is required. Get one at https://openrouter.ai/keys"

# ──────────────────────────────────────────────────────────────
# 3. Demo mode
# ──────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}Deployment mode${NC}"
echo "  [1] Self-hosted  (all models available via your .env key)"
echo "  [2] Public demo  (free models only, users enter own key for paid models)"
echo ""
read -rp "Choose mode [1/2]: " DEPLOY_MODE
DEPLOY_MODE="${DEPLOY_MODE:-1}"

if [[ "$DEPLOY_MODE" == "2" ]]; then
    DEMO_MODE="true"
    info "Demo mode enabled — free models will be the default"
else
    DEMO_MODE="false"
fi

# ──────────────────────────────────────────────────────────────
# 4. Backend setup
# ──────────────────────────────────────────────────────────────
info "Setting up backend..."
cd "$BACKEND_DIR"

if [[ ! -d .venv ]]; then
    python3 -m venv .venv
    ok "Virtual environment created"
fi
source .venv/bin/activate

pip install -q --upgrade pip
pip install -q -r requirements.txt
ok "Python dependencies installed"

cat > .env << ENVEOF
# ══════════════════════════════════════════════════════════════
# superberater Backend — Environment Variables (generated by install.sh)
# ══════════════════════════════════════════════════════════════

# OpenRouter
OPENROUTER_API_KEY=${OPENROUTER_KEY}
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Supabase
SUPABASE_URL=${SUPA_URL}
SUPABASE_ANON_KEY=${SUPA_ANON}
SUPABASE_SERVICE_ROLE_KEY=${SUPA_SECRET}

# App
BACKEND_URL=http://localhost:9000
FRONTEND_URL=http://localhost:3000

# Defaults (in DEMO_MODE=true, auto-overridden to free models)
DEFAULT_MODERATOR_MODEL=anthropic/claude-sonnet-4.6
DEFAULT_AGENT_MODEL=anthropic/claude-haiku-4.5
AGENT_TIMEOUT_SECONDS=60
MODERATOR_TIMEOUT_SECONDS=120

# Demo mode
DEMO_MODE=${DEMO_MODE}
ENVEOF

ok "Backend .env written"

info "Seeding personalities..."
python seed_personalities.py || warn "Seeding failed — re-run: cd backend && source .venv/bin/activate && python seed_personalities.py"

deactivate

# ──────────────────────────────────────────────────────────────
# 5. Frontend setup
# ──────────────────────────────────────────────────────────────
info "Setting up frontend..."
cd "$FRONTEND_DIR"

npm install --silent 2>/dev/null
ok "Node dependencies installed"

cat > .env.local << ENVEOF
NEXT_PUBLIC_API_URL=http://localhost:9000
NEXT_PUBLIC_SUPABASE_URL=${SUPA_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPA_ANON}
ENVEOF

ok "Frontend .env.local written"

# ──────────────────────────────────────────────────────────────
# 6. Done
# ──────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup complete!                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Start everything:"
echo "    ./start.sh"
echo ""
echo "  Open: http://localhost:3000"
echo ""
if [[ "$DEMO_MODE" == "true" ]]; then
    echo -e "  ${YELLOW}Demo mode is ON — only free models by default.${NC}"
fi
echo ""
