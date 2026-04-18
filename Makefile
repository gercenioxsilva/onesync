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

# ── Terraform (AWS MVP) ───────────────────────────────────────────────────────
TF_DIR = terraform

tf-init:      ## Inicializa o Terraform (primeira vez)
	cd $(TF_DIR) && terraform init

tf-plan:      ## Mostra o plano de execução (não aplica nada)
	cd $(TF_DIR) && terraform plan

tf-apply:     ## Aplica a infraestrutura na AWS
	cd $(TF_DIR) && terraform apply

tf-destroy:   ## Destroi toda a infraestrutura (CUIDADO!)
	cd $(TF_DIR) && terraform destroy

tf-output:    ## Exibe os outputs (URLs, IPs, etc.)
	cd $(TF_DIR) && terraform output

# ── Deploy (ECR + S3) ─────────────────────────────────────────────────────────
ECR_URL       ?= $(shell cd $(TF_DIR) && terraform output -raw ecr_backend_url 2>/dev/null)
S3_BUCKET     ?= $(shell cd $(TF_DIR) && terraform output -raw s3_frontend_bucket 2>/dev/null)
AWS_REGION    ?= us-east-1
CDN_ID        ?= $(shell cd $(TF_DIR) && terraform output -raw cloudfront_domain 2>/dev/null)

deploy-backend: ## Build e push da imagem backend para ECR
	aws ecr get-login-password --region $(AWS_REGION) \
		| docker login --username AWS --password-stdin $(ECR_URL)
	docker build -t $(ECR_URL):latest ./backend
	docker push $(ECR_URL):latest
	@echo "Imagem enviada. Reinicie o EC2 ou rode: make ec2-restart"

deploy-frontend: ## Build e sync do frontend para S3 + invalida CloudFront
	cd frontend && npm run build
	aws s3 sync frontend/dist/ s3://$(S3_BUCKET)/ --delete
	aws cloudfront create-invalidation \
		--distribution-id $(CDN_ID) --paths "/*"

# ── Help ──────────────────────────────────────────────────────────────────────
help:         ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
