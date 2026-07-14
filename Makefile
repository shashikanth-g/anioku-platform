.PHONY: dev down build logs test test-backend test-frontend migrate migration lint lint-backend lint-frontend fmt

# Boot the full stack (postgres, redis, backend, frontend) via docker-compose.
dev:
	docker compose up --build

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

# Run backend + frontend test suites.
test: test-backend test-frontend

test-backend:
	docker compose exec backend pytest

test-frontend:
	docker compose exec frontend npm run test

# Apply pending alembic migrations.
migrate:
	docker compose exec backend alembic upgrade head

# Generate a new alembic revision: make migration name="add users table"
migration:
	docker compose exec backend alembic revision --autogenerate -m "$(name)"

# Lint everything.
lint: lint-backend lint-frontend

lint-backend:
	docker compose exec backend ruff check .

lint-frontend:
	docker compose exec frontend npm run lint

fmt:
	docker compose exec backend ruff format .
	docker compose exec frontend npm run format
