#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# superberater — Start Backend + Frontend
# Usage:  ./start.sh           (both)
#         ./start.sh backend   (backend only)
#         ./start.sh frontend  (frontend only)
#         ./start.sh stop      (kill both)
# ══════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
PID_DIR="$SCRIPT_DIR/.pids"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

mkdir -p "$PID_DIR"

start_backend() {
    if [[ -f "$PID_DIR/backend.pid" ]] && kill -0 "$(cat "$PID_DIR/backend.pid")" 2>/dev/null; then
        echo -e "${YELLOW}Backend already running (PID $(cat "$PID_DIR/backend.pid"))${NC}"
        return
    fi
    echo -e "${CYAN}Starting backend...${NC}"
    [[ -d "$BACKEND_DIR/.venv" ]] || { echo -e "${RED}No venv found. Run ./install.sh first.${NC}"; exit 1; }
    [[ -f "$BACKEND_DIR/.env" ]] || { echo -e "${RED}No .env found. Run ./install.sh first.${NC}"; exit 1; }
    cd "$BACKEND_DIR"
    source .venv/bin/activate
    python -m uvicorn main:app --reload --port 9000 &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > "$PID_DIR/backend.pid"
    deactivate 2>/dev/null || true
    cd "$SCRIPT_DIR"
    for i in {1..15}; do
        if curl -sf http://localhost:9000/api/health >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend running on http://localhost:9000 (PID $BACKEND_PID)${NC}"
            return
        fi
        sleep 1
    done
    echo -e "${GREEN}✓ Backend started (PID $BACKEND_PID) — waiting for first request${NC}"
}

start_frontend() {
    if [[ -f "$PID_DIR/frontend.pid" ]] && kill -0 "$(cat "$PID_DIR/frontend.pid")" 2>/dev/null; then
        echo -e "${YELLOW}Frontend already running (PID $(cat "$PID_DIR/frontend.pid"))${NC}"
        return
    fi
    echo -e "${CYAN}Starting frontend...${NC}"
    [[ -d "$FRONTEND_DIR/node_modules" ]] || { echo -e "${RED}No node_modules found. Run ./install.sh first.${NC}"; exit 1; }
    cd "$FRONTEND_DIR"
    npm run dev &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "$PID_DIR/frontend.pid"
    cd "$SCRIPT_DIR"
    sleep 3
    echo -e "${GREEN}✓ Frontend running on http://localhost:3000 (PID $FRONTEND_PID)${NC}"
}

stop_all() {
    echo -e "${CYAN}Stopping superberater...${NC}"
    local stopped=0
    if [[ -f "$PID_DIR/backend.pid" ]]; then
        PID=$(cat "$PID_DIR/backend.pid")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null || true
            echo -e "  Stopped backend (PID $PID)"
            stopped=$((stopped + 1))
        fi
        rm -f "$PID_DIR/backend.pid"
    fi
    if [[ -f "$PID_DIR/frontend.pid" ]]; then
        PID=$(cat "$PID_DIR/frontend.pid")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null || true
            echo -e "  Stopped frontend (PID $PID)"
            stopped=$((stopped + 1))
        fi
        rm -f "$PID_DIR/frontend.pid"
    fi
    lsof -ti:9000 2>/dev/null | xargs kill 2>/dev/null || true
    lsof -ti:3000 2>/dev/null | xargs kill 2>/dev/null || true
    if [[ $stopped -eq 0 ]]; then
        echo -e "${YELLOW}Nothing was running${NC}"
    else
        echo -e "${GREEN}✓ Stopped $stopped process(es)${NC}"
    fi
}

status() {
    echo -e "${CYAN}superberater Status:${NC}"
    if [[ -f "$PID_DIR/backend.pid" ]] && kill -0 "$(cat "$PID_DIR/backend.pid")" 2>/dev/null; then
        echo -e "  Backend:  ${GREEN}running${NC} (PID $(cat "$PID_DIR/backend.pid")) — http://localhost:9000"
    else
        echo -e "  Backend:  ${RED}stopped${NC}"
    fi
    if [[ -f "$PID_DIR/frontend.pid" ]] && kill -0 "$(cat "$PID_DIR/frontend.pid")" 2>/dev/null; then
        echo -e "  Frontend: ${GREEN}running${NC} (PID $(cat "$PID_DIR/frontend.pid")) — http://localhost:3000"
    else
        echo -e "  Frontend: ${RED}stopped${NC}"
    fi
}

case "${1:-all}" in
    backend|b)  start_backend; wait ;;
    frontend|f) start_frontend; wait ;;
    stop|kill|down) stop_all ;;
    status|s)   status ;;
    restart|r)
        stop_all; sleep 1; start_backend; start_frontend
        echo ""
        echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║     superberater restarted!              ║${NC}"
        echo -e "${GREEN}║     http://localhost:3000                ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
        wait ;;
    all|start|"")
        start_backend; start_frontend
        echo ""
        echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║     superberater is running!             ║${NC}"
        echo -e "${GREEN}║     http://localhost:3000                ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "  ${CYAN}Stop:${NC}    ./start.sh stop"
        echo -e "  ${CYAN}Restart:${NC} ./start.sh restart"
        echo -e "  ${YELLOW}Press Ctrl+C to stop both.${NC}"
        trap 'echo ""; stop_all; exit 0' INT TERM
        wait ;;
    *)
        echo "Usage: ./start.sh [backend|frontend|stop|restart|status]" ;;
esac
