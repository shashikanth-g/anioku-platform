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

### Session 2 — 2026-07-15 — Phase 1: Backend core (COMPLETE)

**Environment change:** Docker Desktop + WSL2/Ubuntu 24.04 is now set up on the
dev machine; `docker compose up -d` boots all 4 services for real (previously
only verified on paper — see Session 1's caveat, now resolved).

**Checkpoint — models + migration (done):**
- Fixed two dependency bugs found while verifying the environment, before
  writing any Phase 1 code (see `backend/pyproject.toml`):
  - passlib 1.7.4's bcrypt backend probes `bcrypt.__about__.__version__`,
    removed in bcrypt>=4.1 — every hash/verify call raised `ValueError`. Pinned
    `bcrypt>=4.0.1,<4.1`.
  - Added `email-validator` (required by Pydantic's `EmailStr`, used in the new
    auth/workspace schemas).
  - Rebuilt the backend image (`docker compose build backend`) after the
    pyproject.toml change — dependency changes need a rebuild; plain `.py`
    edits hot-reload via the bind mount + `--reload`.
- Implemented all 10 models from `app/models/enums.py` (7 shared Python enums)
  and `app/models/{user,workspace,workspace_member,project,project_file,
  conversation,message,agent_run,deployment,memory}.py`: `User`, `Workspace`,
  `WorkspaceMember` (composite PK), `Project`, `ProjectFile` (unique on
  `(project_id, path)`), `Conversation`, `Message` (column named `metadata` in
  Postgres, Python attribute `metadata_` since `metadata` is reserved on
  `DeclarativeBase`), `AgentRun`, `Deployment`, `MemoryEntry` (pgvector
  `Vector(1536)`). `UUIDPKMixin`/`CreatedAtMixin` in `app/models/base.py` share
  the id/created_at boilerplate. Every model uses `TYPE_CHECKING` imports for
  its cross-model `relationship()` string refs (ruff F821-clean, and real type
  checkers/IDEs can resolve them too).
- Fixed `alembic/env.py`: it was importing `app.models.base` directly (only
  the empty `Base` class, never triggering the model modules to register their
  tables) — changed to `from app.models import Base` so the package `__init__`
  runs first. Also made the `sqlalchemy.url` override conditional
  (`if not config.get_main_option(...)`) so tests can point migrations at an
  isolated database programmatically without env.py clobbering it back to the
  dev DB.
- Generated the migration via `alembic revision --autogenerate`, then hand-edited it:
  added `CREATE EXTENSION IF NOT EXISTS vector` (upgrade) / `DROP EXTENSION IF
  EXISTS vector` (downgrade), and the missing `import pgvector.sqlalchemy` the
  autogenerate output needed but didn't add itself.
- Applied to the live dev Postgres (`docker compose exec backend alembic
  upgrade head`) and verified via `psql`: all 10 tables + `alembic_version`,
  the `vector` extension (0.8.5), and all 7 Postgres enum types with correct
  values.
- `ruff format` + `ruff check` clean on `app/models/` and `alembic/`.

**Checkpoint — auth (done):**
- `app/core/security.py`: bcrypt hashing via passlib, JWT access (15 min) +
  refresh (7 day) tokens via PyJWT, each carrying a `type` claim so an access
  token can't be replayed as a refresh token or vice versa.
- `app/core/deps.py`: `get_db` (async sessionmaker over an engine bound to
  `settings.DATABASE_URL`), `get_current_user` (reads the `access_token`
  cookie), and two dependency-factory pairs for authorization —
  `require_workspace_role(*roles)` / `require_project_role(*roles)` — called
  with no roles for "any member" (read access) or specific roles (e.g.
  `ADMIN, EDITOR`) for writes. `require_project_role` resolves the project's
  `workspace_id` internally so file routes don't need a workspace_id in the URL.
- `app/services/auth_service.py` + `app/api/auth.py`: signup/login set both
  cookies (`HttpOnly`, `SameSite=lax`, `secure` gated on
  `settings.ENVIRONMENT == "production"`); refresh rotates both; logout clears
  both; `/me` returns the current user. Generated a fresh random `JWT_SECRET`
  into the local `.env` (was still the repo's placeholder string) — `.env` is
  git-ignored, confirmed with `git check-ignore`.
- Manually smoke-tested end-to-end against the live backend + Postgres:
  signup → cookies set → `/me` → logout → `/me` now 401. Cleaned up the
  smoke-test user row afterward. Formal `tests/test_auth.py` comes in the same
  pass as `conftest.py` (next), since the test-database bootstrap is shared
  infrastructure for every Phase 1 test file.
- `ruff format` + `ruff check` clean on everything touched so far.

**Checkpoint — workspaces/projects/files + full test suite (done, Phase 1 complete):**
- `app/services/workspace_service.py` + `app/api/workspaces.py`: workspace
  CRUD, member invite-by-email (looks up an existing user; 404s if none
  matches — there's no pending-invite/email-send flow yet, that's a later
  phase if ever needed), role updates, member removal. The workspace creator
  is auto-added as an `admin` member; `OwnerRoleChangeError` blocks demoting
  or removing the owner.
- `app/services/project_service.py` + `app/api/projects.py`: project create
  (nested under `/workspaces/{id}/projects`, admin/editor only) copies a
  template skeleton via `file_service.instantiate_template`; project
  read/update/delete live at `/projects/{id}`. Five templates in
  `app/templates/`: `blank` (README), `node`, `next` (minimal App Router
  skeleton, not a full `create-next-app` output), `python`, `fastapi` — real
  minimal skeletons, not placeholders.
- `app/services/file_service.py` (`/projects/{id}/files...` routes in
  `app/api/files.py`): the single authority for disk I/O, keeping
  `ProjectFile` rows in lockstep with `PROJECTS_ROOT/<project_id>/`.
  `resolve_path()` is the path-traversal guard — rejects absolute paths
  up front (pathlib's `root / "/etc/passwd"` silently discards `root` and
  returns `/etc/passwd`, so this has to be checked explicitly, not just
  relied on `.resolve()` + containment) and then confirms the resolved path
  is inside the project root via `relative_to()`, catching `../../etc/passwd`
  style escapes → mapped to 400 in the router. Rename/delete use a
  properly-escaped `LIKE` prefix match (`_like_prefix`) to move/remove a
  directory's descendants, since raw `%`/`_` in a real filename would
  otherwise be misinterpreted as SQL wildcards.
- Read routes (`require_project_role()`/`require_workspace_role()` called
  with no roles) allow any member incl. viewers; write routes require
  `ADMIN`/`EDITOR` — this is what `test_workspace_permissions.py` exercises.
- `tests/conftest.py`: creates `anku_test` (via a raw asyncpg connection to
  the `postgres` maintenance db, `CREATE DATABASE` can't run inside a
  transaction) and runs the real Alembic migration against it
  (`command.upgrade`, off the main thread via `asyncio.to_thread` since
  `env.py`'s `asyncio.run()` can't nest inside pytest-asyncio's already-running
  loop) — so Phase 1 tests prove the migration works, not just the models.
  Each test gets an `AsyncSession` bound to a connection with
  `join_transaction_mode="create_savepoint"`, rolled back at teardown, so
  `db.commit()` calls in service code only release a savepoint. **Important
  gotcha hit here:** the test engine must use `poolclass=NullPool` — pytest-
  asyncio gives every test function its own event loop, and a pooled asyncpg
  connection checked out in a different loop than the one that created it
  raises `RuntimeError: Task got Future attached to a different loop`.
  `PROJECTS_ROOT` is monkeypatched to a fresh `tmp_path` per test (autouse),
  so file tests never touch the real dev `projects_root/`.
- Found and fixed a real bug via the refresh-token test: JWTs had no `jti`,
  so two tokens minted for the same user within the same wall-clock second
  (e.g. signup immediately followed by refresh) were byte-identical — added
  a `jti` (uuid4) claim to every issued token in `core/security.py`.
- `tests/test_auth.py`, `test_workspace_permissions.py`, `test_files.py` (plus
  the existing `test_health.py`): **10/10 passing**, run 3x in a row with no
  flakiness. Covers: full auth flow incl. duplicate-email 409 and wrong-password
  401; viewer-cannot-write / editor-can, and owner-cannot-be-demoted-or-removed;
  file CRUD round-trip (create → write → read → rename → delete → 404),
  path-traversal → 400, and project creation from all 5 templates.
- Fixed an Alembic deprecation warning (`path_separator = os` in
  `alembic.ini`) surfaced while running the suite.
- Final state: `ruff format --check` and `ruff check` clean across all of
  `app/` and `tests/`; `docker compose` stack healthy; `GET /api/v1/health`
  live.

**Everything from the Phase 1 task list is done.** Not yet built (intentionally
out of scope until their phase): terminal/git/ai/agents/deploy/search routers
are still stubs (Phase 3/4/5/7/8/10 respectively); no frontend work (Phase 2).

**Next session (Phase 2):** frontend IDE shell — Monaco, file tree, tabs,
layout — wired against the now-real `/api/v1` backend.

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
