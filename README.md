# 🤖 superberater — Multi-Agent Decision Engine

Send a crew of AI agents with different perspectives to analyze your topic — and reach better decisions, faster.

superberater is an open-source web app where multiple AI agents (Skeptic, CFO, Engineer, Strategist, etc.) debate a topic in structured rounds. An active moderator guides the discussion, gives feedback between rounds, and delivers a final recommendation with next steps.

**Try it free** — no credit card needed. Works with [OpenRouter's free models](https://openrouter.ai/keys) out of the box.

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat&logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## DEMO

https://superberater.ai


## How It Works

1. **Define your topic** — Describe the decision or question. Add context, upload documents (PDF, DOCX, XLSX, etc.)
2. **AI assembles your crew** — superberater suggests agents, models, and discussion style. Or configure everything manually.
3. **Watch the debate live** — Agents argue in real-time via streaming. The moderator guides the discussion and gives inter-round feedback.
4. **Get a recommendation** — The moderator synthesizes all arguments into a structured summary with a clear recommendation and next steps.

## Architecture

```
Browser (Next.js 14)
    │  REST + SSE
FastAPI Backend (Python)
    │  httpx async streaming
OpenRouter API ──→ Claude / GPT-5.4 / Gemini / DeepSeek / Free Models
    │  supabase-py
Supabase Cloud  OR  Local PostgreSQL
```

## Features

| Feature | Description |
|---------|-------------|
| **12+ Agent Personalities** | Skeptic, CFO, Strategist, Engineer, Legal, Innovator — each with a unique perspective. Or create your own via manual input or AI generator. |
| **Active Moderator** | Opens the debate, gives inter-round feedback, corrects deviations, and writes a final structured recommendation. |
| **Multi-Model Support** | Claude, GPT-5.4, Gemini, DeepSeek + 8 free models. Assign different LLMs to each agent. Free to Premium tiers. |
| **AI Setup Suggestions** | Enter a topic, and AI recommends the best agents, models, style, and number of rounds. |
| **Live Streaming** | SSE with thinking indicators, elapsed timer, round progress bars, and live character count. |
| **Free Models** | 8 curated free models (Qwen3, Nemotron, Llama, DeepSeek R1, etc.) — $0 cost, no credit card required. |
| **Session API Key** | Enter your OpenRouter key per run — it is used once and never stored. |
| **Demo Mode** | Host a public demo with free models only. Users can enter their own key for premium models. |
| **Document Upload** | PDF, DOCX, XLSX, PPTX, TXT, CSV, MD — extracted as context for the debate. |
| **Bilingual (EN/DE)** | Full i18n across all pages, prompts, and agent instructions. Instant toggle, no reload. |
| **Model Fallback** | If a model fails, automatically switches to an alternative from the same tier. |
| **Export & Share** | PDF and Markdown export. Publish superRuns to the community with a share link. |
| **Configurable Summary** | Short (~200 words), Medium (~500), or Long (~1200) with adapted prompts and token budgets. |

## Available Models

| Tier | Models | Cost |
|------|--------|------|
| **Free** | Qwen3 Coder 480B, Nemotron 3 Super 120B, Llama 3.3 70B, DeepSeek R1, Devstral 2, Gemma 3 27B, Mistral Small 3.1 | $0 (rate-limited) |
| **Budget** | GPT-5.4 Nano, Claude Haiku 4.5, GPT-4o Mini, Gemini 2.5 Flash | $0.15–$1/1M |
| **Standard** | GPT-5.4 Mini, Claude Sonnet 4, Gemini 2.5 Pro | $0.75–$3/1M |
| **Premium** | GPT-5.4, Claude Sonnet 4.6, Claude Opus 4.6 | $1.25–$15/1M |

All models accessed through [OpenRouter](https://openrouter.ai) — one API key, all providers.

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- [OpenRouter API key](https://openrouter.ai/keys) (free, no credit card)
- [Supabase Cloud](https://supabase.com) project **OR** Supabase CLI for local development

### Install

```bash
git clone https://github.com/supbrt/crewai.git
cd crewai
chmod +x install.sh start.sh
./install.sh
```

The install script will:
1. Ask you to choose **Supabase Cloud** or **Supabase Local**
2. Guide you through database setup
3. Ask for your OpenRouter API key
4. Ask for deployment mode (Self-hosted or Demo)
5. Install Python and Node dependencies
6. Create all `.env` files
7. Seed the 12 default agent personalities

### Configure

Edit `backend/.env`:

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-...       # Get free at https://openrouter.ai/keys
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Optional
DEMO_MODE=false                        # true = public demo (free models only by default)
DEFAULT_MODERATOR_MODEL=anthropic/claude-sonnet-4.6
AGENT_TIMEOUT_SECONDS=60
MODERATOR_TIMEOUT_SECONDS=120
```

### Start

```bash
./start.sh              # Start backend + frontend
./start.sh stop         # Stop all
./start.sh restart      # Restart all
./start.sh status       # Show running processes
```

Open **http://localhost:3000** and create your first superRun.

### Docker

```bash
# Requires backend/.env with Supabase + OpenRouter credentials
docker compose up --build
```

## API Key Handling

superberater never stores API keys in the database. There are two modes:

### Self-Hosted (default)

Set `OPENROUTER_API_KEY` in `backend/.env`. All users share this key. This is the simplest setup — all models are available, the server admin pays.

Users can optionally enter their own key per run in the wizard. That key overrides the `.env` key for that single run and is never persisted.

### Demo Mode

Set `DEMO_MODE=true` in `backend/.env`. Create an OpenRouter account with no credits (free).

- **Default:** Only free models are shown. Free models are $0 but rate-limited (~20 req/min, ~50 req/day).
- **With own key:** Users enter their own OpenRouter key in the wizard. That key is used for one run only, never stored. All paid models become available.

```bash
# Demo instance .env
OPENROUTER_API_KEY=sk-or-v1-your-free-account-key
DEMO_MODE=true
```

## superRun Flow

```
4-Step Wizard: Topic → Crew → Parameters → Start
  → Moderator: Opening (Round 0) — Set the frame, assign focus
    → Round 1: Agents respond (parallel/sequential/hybrid)
      → Moderator: Interlude — Summary, corrections, targeted questions
        → Round 2: Agents react to feedback + each other
          → [...more rounds + interludes...]
            → Moderator: Final Summary (Round 99) — Recommendation + next steps
```

## Manual Setup

If you prefer not to use the install script:

### Database

**Option A — Supabase Cloud (recommended):**
1. Create a project at [supabase.com](https://supabase.com)
2. Run `backend/supabase/init.sql` in the SQL Editor
3. Run `backend/supabase/rls_supabase.sql` for Row Level Security
4. Copy your Project URL, Anon Key, and Service Role Key to `.env`

**Option B — Supabase Local (for development):**
```bash
brew install supabase/tap/supabase
supabase init
supabase start
# Copy API URL, Anon Key, Service Role Key from 'supabase status'
# Run init.sql in local SQL editor at http://localhost:54323
```

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Edit with your keys
python seed_personalities.py
python -m uvicorn main:app --reload --port 9000
```

### Frontend

```bash
cd frontend
npm install
echo 'NEXT_PUBLIC_API_URL=http://localhost:9000' > .env.local
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/debates` | Create a superRun |
| `POST` | `/api/debates/{id}/start` | Start run (accepts `session_api_key`, `free_mode`) |
| `GET` | `/api/debates/{id}/stream/all` | SSE stream (all agents multiplexed) |
| `GET` | `/api/debates/{id}/result` | Get results + messages |
| `DELETE` | `/api/debates/{id}` | Delete a run |
| `POST` | `/api/debates/suggest-setup` | AI setup suggestion |
| `GET` | `/api/models` | Available models (free + paid, cached) |
| `GET` | `/api/config` | Public config (demo_mode, has_global_key) |
| `GET` | `/api/personalities` | List agent personalities |
| `POST` | `/api/personalities` | Create custom personality |
| `POST` | `/api/personalities/generate` | AI-generate a personality |
| `POST` | `/api/upload/extract` | Upload & extract document text |
| `GET` | `/api/debates/{id}/export/pdf` | PDF export |
| `GET` | `/api/debates/{id}/export/markdown` | Markdown export |
| `POST` | `/api/debates/{id}/publish` | Publish to community |
| `GET` | `/api/community/debates` | List public runs |
| `GET` | `/api/shared/{token}` | Shared run (read-only) |
| `GET` | `/api/health` | Health check |

## Project Structure

```
crewai/
├── install.sh                 ← Interactive setup
├── start.sh                   ← Start/stop/restart
├── docker-compose.yml         ← Docker deployment
├── backend/
│   ├── main.py                ← FastAPI app + /api/config
│   ├── config.py              ← Settings incl. DEMO_MODE
│   ├── orchestrator.py        ← Debate engine + model fallback
│   ├── openrouter_client.py   ← Async HTTP streaming client
│   ├── schemas.py             ← Pydantic models
│   ├── models.py              ← Database layer (Supabase)
│   ├── auth.py                ← JWT auth middleware
│   ├── seed_personalities.py  ← 12 default agents
│   ├── routers/
│   │   ├── debates.py         ← CRUD + start + export + AI suggest
│   │   ├── streaming.py       ← SSE endpoints
│   │   ├── personalities.py   ← Agent CRUD + AI generator
│   │   ├── models.py          ← Model list (free + paid tiers)
│   │   └── community.py       ← Public superRuns
│   ├── services/
│   │   ├── prompt_builder.py  ← 8 prompt types, bilingual (EN/DE)
│   │   ├── export.py          ← PDF + Markdown generation
│   │   └── file_parser.py     ← PDF/DOCX/XLSX/PPTX/TXT/CSV/MD
│   └── supabase/
│       ├── init.sql           ← Full schema
│       ├── rls_supabase.sql   ← Row Level Security policies
│       └── migrations/        ← Incremental migrations (001–006)
├── frontend/
│   ├── app/                   ← Next.js 14 pages (App Router)
│   │   ├── page.tsx           ← Landing page
│   │   ├── debate/new/        ← 4-step wizard
│   │   ├── debate/[id]/       ← Live view + results
│   │   ├── dashboard/         ← My runs + community
│   │   └── auth/              ← Login + signup
│   ├── components/Header.tsx  ← Branding + DE/EN toggle
│   ├── hooks/                 ← useDebateStream, useAuth, useLocale
│   └── lib/                   ← API client, i18n (~300 keys), types
└── docs/                      ← Internal docs (not in repo)
```

## Configuration Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | — (required) |
| `SUPABASE_URL` | Supabase project URL | — (required) |
| `SUPABASE_ANON_KEY` | Supabase publishable key | — (required) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key | — (required) |
| `DEMO_MODE` | Public demo: free models only by default | `false` |
| `DEFAULT_MODERATOR_MODEL` | Default moderator model | `anthropic/claude-sonnet-4.6` |
| `DEFAULT_AGENT_MODEL` | Default agent model | `anthropic/claude-haiku-4.5` |
| `AGENT_TIMEOUT_SECONDS` | Agent response timeout | `60` |
| `MODERATOR_TIMEOUT_SECONDS` | Moderator response timeout | `120` |

## Cost Estimates

| Scenario | Estimated Cost |
|----------|---------------|
| 3 agents (free models), 2 rounds + moderator | **$0.00** |
| 3 agents (budget), 2 rounds + moderator | ~$0.02 |
| 4 agents (standard), 2 rounds + active moderator | ~$0.10 |
| 5 agents (premium), 3 rounds + active moderator | ~$0.50 |

## Contributing

Contributions are welcome! Please open an issue or pull request.

## License

MIT — © 2026 [superLAB]