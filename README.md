# ANKU

AI-native collaborative software engineering platform — a browser-based cloud IDE
where developers and multiple specialized AI agents build software together in
real time, with shared project context, real-time collaboration, an integrated
terminal, Docker-sandboxed execution, Git integration, and one-click deployment.

See [CLAUDE.md](./CLAUDE.md) for the full architecture, tech stack, conventions,
build roadmap, and progress log.

## Quickstart

```bash
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
make dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Health check: http://localhost:8000/api/v1/health

## Repository layout

- `frontend/` — Next.js 14 (App Router) IDE client
- `backend/` — FastAPI + socket.io server, AI orchestration, Docker runtime management
- `infra/` — base images and infrastructure definitions (e.g. the sandbox image user projects run in)

## Development commands

See the [Makefile](./Makefile): `make dev`, `make test`, `make migrate`, `make lint`.
