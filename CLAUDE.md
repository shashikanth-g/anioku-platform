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
- **"Workspace" is overloaded — know which one is meant:** the backend's
  `Workspace` model/table (`app/models/workspace.py`, `/api/v1/workspaces/...`)
  is a team/org container that holds many `Project`s and has its own members +
  roles. The frontend route **`/workspace/[id]`** (singular, no relation to
  that resource's collection route) is the IDE screen for one **project** —
  `[id]` is a **project id**, not a `Workspace` id. This route reads
  `GET /api/v1/projects/{id}` and `GET /api/v1/projects/{id}/files`, never
  `/api/v1/workspaces/{id}`. Keep this distinction in mind in both codebases:
  a backend `Workspace` is "the team's account"; the frontend "workspace" page
  is "the editor you're working in for one project." `WorkspaceSection.tsx`
  on the dashboard links each project card to `/workspace/{project.id}`.
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

### Session 3 — 2026-07-16 — Phase 2: Frontend IDE shell (Milestone 3: IDE shell layout, COMPLETE)

**New permanent workflow rules as of this session** (apply to every future phase
until explicitly changed): the assistant no longer runs any git commands
(commit/push/branch/history) — the user handles all Git operations manually.
This log is strictly append-only (new entries go on top; existing entries are
never edited or removed). Work is broken into milestones; after each one the
assistant updates this log, runs formatting/lint/tests/build, summarizes, and
**stops for explicit approval** before starting the next milestone — it does
not push through an entire phase in one uninterrupted pass the way Phase 1 was
run. Secrets stay in `.env` only (never committed, never hardcoded); `.env.example`
gets placeholders only.

**Milestone 1 — Foundation + Auth (done):**
- shadcn/ui manually initialized (no interactive CLI — hand-wrote the standard
  output since `npx shadcn init` needs interactive prompts): `components.json`,
  CSS variable theme (light + `.dark`) in `src/app/globals.css`, extended
  `tailwind.config.ts` (color tokens, `borderRadius`, `tailwindcss-animate`
  plugin). Added `tailwindcss-animate`, `@radix-ui/react-label`,
  `@radix-ui/react-slot` to `package.json`. Hand-wrote `button.tsx`, `input.tsx`,
  `label.tsx`, `card.tsx` in `src/components/ui/` — these are the standard
  shadcn primitives (copy-paste-into-your-repo is shadcn's actual distribution
  model, not a hand-rolled substitute).
- `src/types/index.ts`: TS interfaces mirroring every backend Pydantic schema
  from Phase 1 (`User`, `Workspace`, `WorkspaceMember`, `Project`, `FileNode`,
  `Page<T>`, plus the `*Create`/`*Update`/`*Invite` request shapes and the
  `Plan`/`WorkspaceRole`/`ContainerStatus`/`TemplateName` string-literal unions)
  — the single source of truth other Phase 2 work should extend, not duplicate.
- `src/lib/api.ts`: typed fetch client, `credentials: "include"` on every call
  (HttpOnly cookies), `ApiError` (status + message + raw body). On a 401 it
  makes exactly one `POST /auth/refresh` attempt and retries the original
  request once; concurrent 401s share a single in-flight refresh promise
  instead of each firing their own refresh call (a real race avoided, not
  just theoretical — multiple components can call the API in the same tick
  right after an access token expires). `/auth/login`, `/auth/signup`, and
  `/auth/refresh` itself are excluded from the retry path to avoid loops.
  Covers every Phase 1 endpoint (auth, workspaces + members, projects, files)
  even though only auth is wired into UI this milestone — building the full
  typed surface once now means Milestones 2+ (dashboard, IDE) consume it
  without touching this file again.
- `src/stores/useAuthStore.ts` (zustand) + `src/hooks/useAuth.ts`: the hook
  triggers exactly one `GET /auth/me` the first time any component mounts it
  (guarded by `status === "idle"`, checked synchronously so concurrent mounts
  in the same render pass don't double-fire), and exposes
  `{ user, status, isAuthenticated, isLoading, login, signup, logout, error }`
  from the shared store — no context provider needed.
- `src/middleware.ts` (Next.js middleware lives under `src/` since the app
  uses a `src/` layout): redirects to `/login?from=<path>` if **neither**
  `access_token` nor `refresh_token` cookie is present on `/dashboard/*` or
  `/workspace/*`; redirects away from `/login`/`/signup` if either cookie is
  present. Deliberately does **not** verify the JWT's signature/expiry at the
  edge (that would mean sharing `JWT_SECRET` with the frontend, which
  shouldn't cross that trust boundary) — this is a coarse, fast gate; the
  backend is still the actual authority on every real request, and
  `lib/api.ts`'s auto-refresh handles the "access token expired but refresh
  token still valid" case entirely client-side.
- Real `src/app/(auth)/login/page.tsx` and `signup/page.tsx`: shadcn
  Card/Input/Label/Button, client components, call `useAuth().login()` /
  `.signup()`, show the `ApiError` message inline, redirect to `/dashboard`
  (or `?from=` target) on success. **Gotcha hit:** `useSearchParams()` in the
  login page requires a `<Suspense>` boundary or Next.js can't statically
  prerender the route — split into a `LoginForm` client component wrapped in
  `<Suspense>` inside the page; confirmed in the production build output that
  `/login` still prerenders as static (`○`).
- `vitest.config.ts` + `src/test/setup.ts` (jsdom, `@testing-library/jest-dom/vitest`,
  path alias matching `tsconfig.json`'s `@/*`). `src/lib/api.test.ts` (6 tests:
  success parsing, 204-as-no-content, `ApiError` carries the backend's `detail`
  message, the 401→refresh→retry path, refresh-also-fails still throws,
  login/signup/refresh itself never triggers a refresh loop) and
  `src/stores/useAuthStore.test.ts` (5 tests, `vi.spyOn` on the real `api.auth.*`
  methods rather than `vi.mock`-ing the whole module — avoids fighting the
  module's full exported type shape). **11/11 passing.**
- Verified against the live stack (not mocked): `docker compose exec backend`
  signup sets cookies with the right CORS headers for `http://localhost:3000`;
  `curl -b <cookies> http://localhost:3000/dashboard` → 200 (middleware lets it
  through); no-cookie request to `/dashboard` → 307 to `/login?from=%2Fdashboard`.
  Cleaned up the smoke-test user row afterward.
  **Gotcha:** Next dev's hot-reload does not pick up a brand-new `middleware.ts`
  file without a container/dev-server restart — first curl attempt returned a
  plain 200 instead of a redirect until `docker compose restart frontend`.
- `npx tsc --noEmit` clean, `next lint` clean, `next build` succeeds (7 routes,
  middleware compiles at 26.6 kB), `npm test` 11/11. Ran `npx prettier --write`
  over `src/**/*.{ts,tsx}` (no `.prettierrc` exists — default Prettier config —
  this reformatted every file touched this milestone; re-ran the full
  typecheck/lint/test/build pass afterward to confirm nothing broke).

**Milestone 2 — Dashboard (done):**
- Added `@radix-ui/react-dialog`, `@radix-ui/react-select` and hand-wrote the
  matching shadcn primitives (`dialog.tsx`, `select.tsx`, plus `badge.tsx` for
  role/owner tags) — same "copy the standard output into the repo" approach as
  Milestone 1's Button/Input/Label/Card.
- `src/stores/useWorkspaceStore.ts`: `workspaces` + `projectsByWorkspace` +
  `membersByWorkspace` (all keyed/scoped so multiple workspaces' data can be
  loaded concurrently without clobbering each other), each with its own
  `FetchStatus` (`idle`/`loading`/`loaded`/`error`) so the UI can show
  per-section loading/error states independently. `inviteMember` /
  `updateMemberRole` / `removeMember` all call their endpoint then refetch that
  workspace's member list rather than hand-patching the array — simpler and
  guaranteed consistent with the server. `currentProjectId`/`fileTree` fields
  the Milestone 1 note mentioned are still deferred to Milestone 3, since
  nothing here needs them yet.
- `src/components/dashboard/`: `CreateWorkspaceDialog.tsx`,
  `CreateProjectDialog.tsx` (template picker over all 5 backend templates —
  blank/node/next/python/fastapi — with a one-line description each),
  `MembersDialog.tsx` (invite-by-email + role `Select`, per-row role change +
  remove, owner row shown as a static "owner" badge instead of controls since
  the backend rejects demoting/removing the owner), `WorkspaceSection.tsx`
  (fetches+renders one workspace's projects as cards linking to
  `/workspace/[id]`). `src/app/dashboard/page.tsx` assembles all of it plus a
  header with the logged-in user's email and a logout button.
- **Known limitation, not fixed this milestone (explicitly not a backend
  change — Phase 2 is scoped to `frontend/`):** `WorkspaceMemberRead` only
  returns `{workspace_id, user_id, role}` — no email or name. The members list
  can only show a friendly identity for the current user (via `useAuth()`);
  every other member renders as a truncated UUID. Flagging this for the user
  to decide: a small additive (non-breaking) backend change — adding
  `email`/`name` to `WorkspaceMemberRead` via the existing `user` relationship
  — would fix this, but wasn't done since it's outside this phase's stated
  scope.
- **Routing decision worth recording:** `/workspace/[id]` uses the **project**
  id, not the Workspace resource's id — "workspace" here means "the IDE
  workspace for one project," distinct from the backend's `Workspace` (a
  team/org container for many projects). `WorkspaceSection` links each project
  card to `/workspace/{project.id}`. Keeping this consistent matters for
  Milestone 3, which will read `params.id` as a project id and call
  `GET /projects/{id}` + `GET /projects/{id}/files`.
- `src/stores/useWorkspaceStore.test.ts`: 9 tests (`vi.spyOn` on the real
  `api.workspaces.*`/`api.projects.*` methods, same pattern as the auth store
  tests) covering every action including that invite/role-update/remove all
  trigger the expected refetch. **20/20 total tests passing** (11 from
  Milestone 1 + 9 new).
- `npx tsc --noEmit` clean, `next lint` clean, `next build` succeeds (same 7
  routes, `/dashboard` now 34.6 kB instead of 146 B), `npm test` 20/20. Ran
  `npx prettier --write` again; re-verified the full pipeline afterward.
- **Verified against the live stack, not mocked:** drove the exact HTTP calls
  `lib/api.ts` makes — signup → list workspaces (empty) → create workspace →
  list projects (empty) → create project from the `fastapi` template → list
  members (owner, role `admin`) → signup a second user → invite them as
  `viewer` → promote to `editor` → remove them (204) — every response body
  matched the frontend's TS types exactly, field-for-field. Cleaned up the
  smoke-test users/workspace/project afterward, including the orphaned
  on-disk project directory (raw `DELETE FROM users` cascades through the DB
  but bypasses `project_service.delete_project`'s disk cleanup, so a
  smoke-test project directory was left under `projects_root/` until removed
  by hand — a real app flow going through `DELETE /projects/{id}` wouldn't
  have this gap).
  **Not verified this milestone:** actual interactive browser use (clicking
  dialogs, typing into forms, watching React state update) — no browser
  automation tool is available in this environment. The data-layer
  verification above exercises the same HTTP calls the UI makes and confirms
  every shape lines up with what the components expect, but it does not
  prove the dialogs render/open/submit correctly in an actual browser.
  Worth keeping in mind if something looks visually off later.

**Not done yet (deliberately out of scope for this milestone):** the entire
IDE shell — FileTree, Monaco, EditorTabs, resizable-panel layout, StatusBar,
theme toggle, keyboard shortcuts — is untouched (Milestone 3+); no Playwright
yet (needs a working IDE to have anything to click through). `useEditorStore.ts`
is still a stub.

**Approved follow-up — real member identities (done, backend + frontend):**
The Milestone 2 note above flagged `WorkspaceMemberRead` returning only
`{workspace_id, user_id, role}`; this was approved as a small additive backend
change rather than left as a frontend workaround.
- `app/schemas/workspace.py`: `WorkspaceMemberRead` gained `email: str` and
  `name: str`, populated via a new `WorkspaceMemberRead.from_member(member)`
  classmethod that reads `member.user.email`/`.user.name` — plain
  `model_validate()`/`from_attributes` can't reach into a relationship for a
  flat field, so the three call sites in `app/api/workspaces.py`
  (`list_members`, `invite_member`, `update_member_role`) now call
  `.from_member(...)` instead.
- `app/services/workspace_service.py`: added `get_membership_with_user()`
  (eager-loads `.user` via `selectinload`) and eager-loads it in
  `list_members` too. `invite_member`/`update_member_role` now re-fetch through
  this helper after their commit rather than returning the bare `db.refresh()`
  result, since refresh reloads columns but not relationships.
- `tests/test_workspace_permissions.py`: extended the existing invite/promote
  assertions to check `email`/`name` are present and correct — no new test
  file needed since this rides on the same flow already being exercised.
  **10/10 backend tests still passing.**
- Frontend: `WorkspaceMember` in `src/types/index.ts` gained `email`/`name`;
  `MembersDialog.tsx` now renders the real name (+ email as a subtitle) for
  every member instead of special-casing only the current user via
  `useAuth()` and truncating everyone else's UUID. Updated the `member` test
  fixture in `useWorkspaceStore.test.ts` to match the wider type.
  **20/20 frontend tests still passing**, `tsc`/lint/build clean.
- Verified live against the real stack (not mocked): fresh signup → create
  workspace → `GET .../members` and `POST .../members` (invite) both now
  return `email`/`name` for the owner and the invited user respectively,
  exactly matching the updated frontend type. Cleaned up the smoke-test users
  afterward.
- Also documented the `/workspace/[id]` (project id) vs. backend `Workspace`
  (team/org container) distinction directly in this file's **Coding
  conventions** section, per the same approval, so it's not just buried in a
  progress-log entry from one session.

**Milestone 3 — IDE shell layout (done):**
- Added `react-resizable-panels`, `next-themes`, `@radix-ui/react-tabs`; wrote
  the matching shadcn `tabs.tsx` primitive.
- `src/components/theme/ThemeProvider.tsx` (wraps `next-themes`) +
  `ThemeToggle.tsx` (Sun/Moon button, guards against a hydration mismatch by
  rendering a stable icon until mounted). Root layout (`src/app/layout.tsx`)
  wraps `{children}` in it with `defaultTheme="dark"`, `enableSystem={false}`
  — dark by default, no OS-preference override, per the task. `<html>` needs
  `suppressHydrationWarning` since `next-themes` mutates its class after
  hydration; this is documented, expected behavior, not a bug being papered
  over.
- `src/stores/useWorkspaceStore.ts` gained the `currentProject`/
  `currentProjectStatus`/`fetchProject()` fields the Milestone 1 and 2 notes
  both said were coming "once the IDE shell consumes them" — now it does.
- `src/components/layout/WorkspaceShell.tsx`: the actual resizable layout —
  `PanelGroup`/`Panel`/`PanelResizeHandle` nested horizontal (sidebar / main /
  right) then vertical inside "main" (editor / bottom). Sidebar, bottom, and
  right panels are all `collapsible` with `collapsedSize={0}`. Ctrl/Cmd+B is
  wired for real: a `window` keydown listener calls the sidebar panel's
  imperative `.collapse()`/`.expand()` via a ref
  (`ImperativePanelHandle`) — this is a genuine, working shortcut, not a
  placeholder.
- `src/components/layout/{Sidebar,BottomPanel,RightPanel}.tsx` (`BottomPanel`/
  `RightPanel` are new files, not in the original scaffold list): `Sidebar`
  wraps `FileTree` with an "Explorer" header; `BottomPanel` is a real `Tabs`
  (Terminal/Problems) but each tab's content is a "coming in Phase 3/4" note;
  `RightPanel` is the "AI Chat" placeholder. Deliberately did **not** touch
  `components/terminal/TerminalPanel.tsx` or `components/chat/AIChatPanel.tsx`
  for these placeholders — those files are reserved for their real Phase 3/4
  implementations, and wiring fake content into them now would create
  confusion later about what's real.
- `src/components/layout/StatusBar.tsx` is **genuinely functional, not a
  placeholder**, for the one piece of data already available this phase: it
  takes a `containerStatus` prop (from the real `Project.container_status`
  the backend already returns) and renders it with a status-colored dot.
  Branch ("main"), language ("Plain Text"), and cursor position ("Ln 1, Col
  1") stay static placeholders since there's no git/file/editor data to back
  them yet — faking those would violate "no placeholder implementations
  unless the roadmap explicitly allows them," but `container_status` isn't
  fake, it's real data simply not wired anywhere else yet.
- `src/components/editor/{FileTree,EditorTabs,MonacoWrapper}.tsx` upgraded
  from bare `return null` to real empty-state placeholder UI ("File tree will
  appear here...", "No files open", "Select a file to start editing.") — this
  is what Milestone 3 owns (the shell's visual chrome); the TODO comments now
  point at "follow-up milestone" instead of "Phase 2" so it's unambiguous
  that wiring real data is the very next piece of work, not a future phase.
  `Breadcrumbs.tsx` was left as `return null` — with no active file there is
  legitimately nothing to show, so that's correct behavior, not a gap.
- `src/app/workspace/[id]/page.tsx`: now a real page — calls
  `fetchProject(params.id)` on mount, shows a loading state, an error state
  with a link back to `/dashboard` if the project can't be found, and
  otherwise a slim title bar (back arrow + project name) above
  `<WorkspaceShell containerStatus={currentProject.container_status} />`.
  Fixed a height-nesting bug caught before it shipped: `WorkspaceShell`
  originally set `h-screen` on its own root div, which double-counted height
  once the page wrapped it in its own `h-screen` column with a title bar
  above — changed `WorkspaceShell` to `h-full` so it fills whatever the page
  gives it.
- `src/stores/useWorkspaceStore.test.ts`: 2 new tests for `fetchProject()`
  (success and failure paths), same `vi.spyOn(api.projects, "get")` pattern
  as everything else. **22/22 frontend tests passing.**
- `npx tsc --noEmit` clean, `next lint` clean, `next build` succeeds
  (`/workspace/[id]` is now 16.7 kB instead of 142 B — confirms real content
  is bundled, not still a stub), `npm test` 22/22. Ran `npx prettier --write`
  again; re-verified the full pipeline afterward.
- **Verified against the live stack:** created a real workspace + project via
  the API, then `curl`'d `/workspace/{project_id}` through the Next.js dev
  server with valid auth cookies → 200 OK, server-rendered HTML shows the
  expected "Loading project..." state (client-side fetch takes over from
  there) and the injected theme script correctly defaults to `dark`. Cleaned
  up the smoke-test user, workspace/project, and its on-disk project
  directory afterward.
  **Not verified this milestone (same limitation as Milestones 1-2):** actual
  panel dragging/collapsing, the Ctrl+B shortcut firing, and the theme toggle
  visually switching — no browser automation tool is available in this
  environment, so none of react-resizable-panels' or next-themes' runtime
  behavior has been exercised by anything other than reading the library docs
  correctly. Worth a manual click-through pass once a real browser is
  available.

**Not done yet (deliberately out of scope, follow-up milestone):** FileTree
isn't wired to `GET /projects/{id}/files` (no lazy-loading, context-menu
create/rename/delete, drag-and-drop move, or `.gitignore`-aware dimming yet);
Monaco isn't actually mounted (no syntax highlighting, IntelliSense,
find/replace, minimap, split view); `EditorTabs` doesn't track real open
files/dirty state; Cmd/Ctrl+S (save) and Cmd/Ctrl+P (fuzzy quick-open) aren't
wired since both need that real file/editor data to act on; no localStorage
tab-layout persistence yet; no Playwright yet (the login → create project →
open file → edit → save → reload smoke test needs a working editor to exist
first). `useEditorStore.ts` is still a stub.

This closes out Milestone 3 and, with it, the layout/scaffolding half of
Phase 2. The next piece of work (not started, no milestone number assigned
yet) is wiring the FileTree and Monaco editor to real project data — that's
substantial enough it should be its own milestone rather than folded into
whatever comes next.

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
