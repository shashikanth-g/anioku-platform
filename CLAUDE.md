# CLAUDE.md

Persistent memory for ANKU across build sessions. Read this file in full before
starting work in a new session. Update the **Build Progress Log** at the end of
every session — it is the source of truth for what exists and what's next.

## Product summary

ANKU is an AI-native collaborative software engineering platform: a browser-based
cloud IDE where developers and multiple specialized AI agents build software
together in real time. It combines a full code editor, integrated terminal, live
preview, Git workflow, and one-click deployment with a project-aware multi-model
AI layer that can read, write, and reason about an entire codebase — and with
real-time multiplayer collaboration so humans and agents share the same
workspace. Think "VS Code + ChatGPT + Slack + GitHub + Vercel," unified into one
intelligent workspace.

## Tech stack (fixed — do not substitute without explicit user approval)

**Frontend**
- Next.js 14+ (App Router), React 18, TypeScript (strict mode)
- TailwindCSS, shadcn/ui
- Zustand for client state
- Monaco Editor (`@monaco-editor/react`) for code editing
- xterm.js for the integrated terminal
- socket.io-client for realtime
- Vitest + React Testing Library for tests

**Backend**
- Python 3.11+, FastAPI
- SQLAlchemy 2.0 (async) + Alembic migrations
- Pydantic v2 (schemas), pydantic-settings (config)
- python-socketio (ASGI, mounted into the FastAPI app)
- Celery + Redis for background jobs (indexing, deploys, long agent runs)
- PyJWT + passlib[bcrypt] for auth
- GitPython for git operations
- docker SDK for Python for sandbox container orchestration

**AI layer**
- LiteLLM as the unified multi-model gateway (OpenAI, Anthropic, Google, DeepSeek, etc.)
- LangGraph for multi-agent orchestration
- OpenAI `text-embedding-3-small` for code embeddings

**Data**
- PostgreSQL 16 with the `pgvector` extension (relational data + vector search in one store)
- Redis 7 (cache, Celery broker/backend, socket.io pub/sub across workers)

**Runtime**
- Docker: every user project executes inside its own isolated container, orchestrated
  by the backend via the docker SDK (hence the backend container mounts the host
  docker socket).

## Architecture overview

```
 Browser (Next.js client)
   │  REST (fetch) + WebSocket (socket.io-client)
   ▼
 FastAPI app  ──mounts──  python-socketio ASGI app
   │                            │
   │ SQLAlchemy (async)         │ realtime/ (presence, rooms, doc sync)
   ▼                            ▼
 PostgreSQL 16 + pgvector     Redis 7 (pub/sub, cache, Celery broker)
   │                            │
   │                     Celery workers (workers/)
   │                            │
   ▼                            ▼
 ai/gateway.py (LiteLLM)  ──►  ai/orchestrator.py (LangGraph multi-agent graph)
   │                            │
   ▼                            ▼
 ai/context.py + ai/indexer.py (pgvector retrieval)   ai/agents/* (planner, architect,
                                                        frontend, backend, database,
                                                        testing, review, security, docs, devops)
   │
   ▼
 runtime/docker_manager.py  ──►  Docker: per-project sandbox container
                                  (infra/project-runtime image: node + python)
                                  runtime/terminal.py (PTY), runtime/preview.py (port proxy)
```

Flow in one paragraph: the Next.js client talks to FastAPI over REST for CRUD and
over socket.io for everything live (file changes, terminal I/O, cursors, chat
streaming). FastAPI persists state in Postgres and coordinates via Redis. AI
requests go through `ai/gateway.py` (LiteLLM) for single-model calls or
`ai/orchestrator.py` (LangGraph) for multi-agent workflows; both pull project
context assembled by `ai/context.py` from embeddings indexed into pgvector by
`ai/indexer.py`. Anything that needs to actually execute code (terminal
commands, running the project, agent tool calls) is routed through
`runtime/docker_manager.py` into a per-project Docker sandbox built from the
`infra/project-runtime` base image. Long-running or expensive work (indexing,
deploys, long agent runs) is offloaded to Celery workers backed by Redis.

## Coding conventions

- **TypeScript**: strict mode everywhere in `frontend/`. No `any` without a comment
  explaining why. Shared types that mirror backend Pydantic schemas live in
  `frontend/src/types/`.
- **Python**: async SQLAlchemy 2.0 style throughout (`AsyncSession`, `select()`,
  no legacy `Query` API). Pydantic v2 schemas separate from ORM models
  (`app/models/` = ORM, `app/schemas/` = Pydantic).
- **API routes**: every HTTP endpoint is versioned under `/api/v1/...`. Routers
  live in `app/api/`, one file per resource, included from `app/main.py`.
- **Socket.io events**: namespaced as `domain:action`, e.g. `file:update`,
  `terminal:output`, `presence:join`, `chat:stream`. Server-side handlers live in
  `app/realtime/`, one concern per module (`presence.py`, `sync.py`, `rooms.py`).
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`,
  `refactor:`, `test:`) — this keeps the history readable across a 10-phase build.
- **No premature abstraction**: build what the current phase needs; later phases
  will extend, not rewrite, this foundation.

## Running everything

```bash
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
make dev        # docker compose up --build — postgres, redis, backend, frontend
make migrate    # apply alembic migrations
make test       # run backend + frontend test suites
make lint       # ruff (backend) + eslint (frontend)
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000 — health check at `GET /api/v1/health`

## Roadmap (10 phases)

1. **Backend core** — auth, DB models, workspace/project/file CRUD
2. **Frontend IDE shell** — Monaco, file tree, tabs, layout
3. **Docker runtime** — integrated terminal + live preview
4. **Multi-model AI gateway** — chat panel with streaming
5. **Project-aware AI** — pgvector indexing, context retrieval, multi-file editing agent
6. **Real-time collaboration** — presence, cursors, doc sync, shared terminal
7. **Git & GitHub integration** — AI commit messages / PR descriptions
8. **Multi-agent orchestration (LangGraph)** — planner/architect/frontend/backend/database
   agents + natural-language project generation
9. **Testing agent + automated code review agent**
10. **One-click deployment** (Vercel/Railway) + auto-documentation agent

Each phase should leave `make dev` working end-to-end and this log updated
before the session ends.

## Build Progress Log

<!--
Update this section at the end of every session. Append, don't overwrite —
newest entry on top. Include: what was completed, what was verified, what's
left, and anything the next session needs to know that isn't obvious from the
code itself.
-->

### Session 1 — 2026-07-15 — Foundation (pre-Phase 1)

**Completed:**
- Scaffolded the full monorepo: `frontend/` (Next.js App Router structure,
  component/lib/store/type directories per the design), `backend/` (FastAPI app
  structure: `core/`, `models/`, `schemas/`, `api/`, `services/`, `ai/` incl.
  `agents/`, `realtime/`, `runtime/`, `workers/`, `tests/`), and
  `infra/project-runtime/` for the sandbox base image. Most files are stubs with
  docstring/TODO headers — implementation starts in Phase 1.
- Wrote root config: `docker-compose.yml` (postgres/pgvector, redis, backend,
  frontend, healthchecks, shared network, backend mounts host docker socket),
  `Makefile` (`dev`, `test`, `migrate`, `migration`, `lint`, `fmt`),
  `.env.example`, `.gitignore`, `README.md`, this `CLAUDE.md`.
- Backend: minimal working FastAPI app (`app/main.py`) with
  `GET /api/v1/health` → `{"status": "ok"}`, `pydantic-settings`-based config in
  `app/core/config.py`. The socket.io ASGI app is really wired (combined via
  `socketio.ASGIApp(sio, other_asgi_app=fastapi_app)`, exported as `app` since
  uvicorn is pointed at `app.main:app`) — it accepts connections, but no event
  handlers exist yet (`realtime/presence.py`, `sync.py`, `rooms.py` are stubs
  for Phase 6).
- Frontend: minimal working landing page (`app/page.tsx`) with Next.js 14
  App Router, TypeScript strict, Tailwind configured. shadcn/ui primitives
  aren't generated yet (see `src/components/ui/README.md` — run
  `npx shadcn add ...` when Phase 2 needs specific components).
- Alembic initialized in `backend/alembic/` (async env template driven by
  `app.core.config.settings` and `app.models.Base.metadata`), no migrations yet
  — first migration comes with Phase 1 models.
- Initialized git repo, initial commit.

**Verified (in this sandbox, without Docker):**
- Backend: created a local venv, installed the minimal subset of deps needed to
  import `app.main` (fastapi, uvicorn, python-socketio, pydantic-settings,
  httpx, pytest — not the full pyproject.toml dependency list, which also
  includes celery/litellm/langgraph/docker-sdk/etc. not yet exercised by any
  code). `pytest tests/test_health.py` passed; booting real uvicorn and
  curling it confirmed `GET /api/v1/health` → `{"status":"ok"}` and that
  `/socket.io/...` responds (200).
- Frontend: `npm install` succeeded (546 packages; `npm audit` reports the
  usual transitive-dependency advisories, not addressed this session — revisit
  before shipping). `npm run dev` compiled cleanly and served the landing page
  with the expected `<h1>ANKU</h1>`.
- `docker-compose.yml` is syntactically valid YAML with the 4 expected
  services (postgres, redis, backend, frontend).
- **Not verified this session: a real `docker compose up` boot.** This sandbox
  had no Docker daemon at all (`docker` CLI missing from both bash and
  PowerShell). The compose file, both Dockerfiles, and `make dev` need a real
  smoke test — all four containers healthy, backend reachable through its
  container, frontend through its container — on a machine with Docker before
  or at the very start of Phase 1. Also double-check the backend Dockerfile's
  `pip install -e ".[dev]"` actually resolves every pyproject.toml dependency
  (litellm/langgraph/docker-sdk pull in a lot; only a small slice was installed
  and tested here).

**Next (Phase 1):**
- Implement real DB models (`User`, `Workspace`, `Project`, `File`,
  `Conversation`, `AgentRun`, `Deployment`, `Memory`) and their Alembic
  migration.
- Implement auth (`app/api/auth.py`, `app/core/security.py`, JWT + passlib).
- Implement workspace/project/file CRUD routers + services.
- First real Docker boot test with all four services healthy (see caveat above).
