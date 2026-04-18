.PHONY: dev dev-build stop logs \
        test test-backend \
        lint lint-backend lint-frontend \
        build build-backend build-frontend \
        migrate seed clean help

# ── Config ────────────────────────────────────────────────────────────────────
COMPOSE     = docker compose
BACKEND_SVC = backend
FRONTEND_SVC= frontend

# ── Dev ───────────────────────────────────────────────────────────────────────
dev:          ## Start all services (hot-reload)
	$(COMPOSE) up

dev-build:    ## Rebuild images and start all services
	$(COMPOSE) up --build

stop:         ## Stop all services
	$(COMPOSE) down

logs:         ## Follow logs of all services
	$(COMPOSE) logs -f

logs-backend: ## Follow backend logs only
	$(COMPOSE) logs -f $(BACKEND_SVC)

# ── Test ──────────────────────────────────────────────────────────────────────
test: test-backend  ## Run all tests

test-backend: ## Run backend tests with pytest
	$(COMPOSE) run --rm $(BACKEND_SVC) \
		python -m pytest tests/ -v --tb=short

# ── Lint ──────────────────────────────────────────────────────────────────────
lint: lint-backend lint-frontend  ## Lint backend and frontend

lint-backend: ## Lint Python code with ruff
	$(COMPOSE) run --rm $(BACKEND_SVC) \
		python -m ruff check app/ --output-format=concise

lint-frontend: ## Lint JS/JSX with eslint
	$(COMPOSE) run --rm $(FRONTEND_SVC) npm run lint

format: format-backend format-frontend  ## Format all code

format-backend: ## Format Python code with ruff
	$(COMPOSE) run --rm $(BACKEND_SVC) \
		python -m ruff format app/

format-frontend: ## Format JS/JSX with prettier
	$(COMPOSE) run --rm $(FRONTEND_SVC) npm run format

typecheck: ## Type check Python with mypy
	$(COMPOSE) run --rm $(BACKEND_SVC) \
		python -m mypy app/ --ignore-missing-imports

# ── Build ─────────────────────────────────────────────────────────────────────
build: build-backend build-frontend  ## Build all Docker images

build-backend: ## Build backend Docker image
	docker build -t onesync-backend:latest ./backend

build-frontend: ## Build frontend Docker image
	docker build -t onesync-frontend:latest ./frontend

# ── DB ────────────────────────────────────────────────────────────────────────
migrate:      ## Run Alembic migrations (upgrade head)
	$(COMPOSE) run --rm $(BACKEND_SVC) \
		alembic upgrade head

migrate-down: ## Rollback last migration
	$(COMPOSE) run --rm $(BACKEND_SVC) \
		alembic downgrade -1

migrate-status: ## Show current migration status
	$(COMPOSE) run --rm $(BACKEND_SVC) \
		alembic current

seed:         ## Run collaborators seed (profile: tools)
	$(COMPOSE) run --rm --profile tools seed

# ── Clean ─────────────────────────────────────────────────────────────────────
clean:        ## Remove containers, volumes and orphans
	$(COMPOSE) down -v --remove-orphans

clean-cache:  ## Remove Python/JS cache files locally
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name node_modules -path "*/frontend/*" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name dist -exec rm -rf {} + 2>/dev/null || true

# ── Help ──────────────────────────────────────────────────────────────────────
help:         ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
