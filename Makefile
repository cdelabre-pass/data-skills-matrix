.PHONY: help install dev build build-data check-data validate-data lint format audit test hooks

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	npm install
	cd web && npm install

dev: ## Start web dev server (http://localhost:5173)
	cd web && npm run dev

build: build-data ## Build everything (data + web)
	cd web && npm run build:web

build-data: ## Regenerate skills-data.json from YAML sources
	node scripts/build-data.mjs

check-data: ## Verify skills-data.json is in sync with YAML
	node scripts/check-data.mjs

validate-data: ## Validate YAML data structure
	node scripts/validate-data.mjs

lint: ## Lint web app (ESLint + Prettier check)
	cd web && npm run lint && npm run format:check

format: ## Auto-fix lint and format issues
	cd web && npm run lint:fix && npm run format

test: ## Run web app tests with coverage
	cd web && npm run test:coverage

audit: ## Check for high/critical security vulnerabilities
	cd web && npm run audit

hooks: ## Install pre-commit hooks
	pre-commit install
