
-include .env

SESSION_DIR ?= session
DOCS_DIR    ?= docs

.PHONY: help \
	docs \
	contracts-install contracts-clean contracts-test contracts-deploy contracts-deploy-sepolia \
	web-install web-dev web-build web-start web-lint \
	committee-install committee-dev committee-build committee-start \
	docker-up docker-down docker-build

docs: ## Create HTML files for codelabs
	@cd ./session/week1 && claat export week1.md && cd ../../ && rm -rf ./docs/week1/** && mv ./session/week1/html/** ./docs/week1/
	@cd ./session/week2 && claat export week2.md && cd ../../ && rm -rf ./docs/week2/** && mv ./session/week2/html/** ./docs/week2/
	@cd ./session/week3 && claat export week3.md && cd ../../ && rm -rf ./docs/week3/** && mv ./session/week3/html/** ./docs/week3/

# 
# Contracts
# 

contracts-install: ## Build contracts-node Docker image
	@docker compose build contracts-node

contracts-clean: ## Clean contract artifacts
	@docker compose run --rm contracts-node npx hardhat clean

contracts-test: ## Run contract tests
	@docker compose run --rm contracts-node npx hardhat test

contracts-deploy: ## Deploy contracts to local network
	@docker compose run --rm contracts-node npx hardhat ignition deploy ignition/modules/LicenseManager.ts

contracts-deploy-sepolia: ## Deploy contracts to Sepolia network
	@docker compose run --rm contracts-node npx hardhat ignition deploy ignition/modules/LicenseManager.ts --network sepolia

# 
# Web
# 

web-install: ## Build license-web Docker image
	@docker compose build license-web

web-dev: ## Start web dev server
	@docker compose up license-web

web-build: ## Build web app
	@docker compose build license-web

web-start: ## Start web app (production)
	@docker compose up -d license-web

web-lint: ## Lint web project
	@cd apps/web && npm run lint

# 
# Committee
#
committee-build: ## Build committee app
	@docker compose build committee

committee-dev: ## Start committee dev server
	@docker compose up committee-1 committee-2 committee-3 committee-4 committee-5

committee-start: ## Start committee app (production)
	@docker compose up -d committee

# 
# Docker helpers
#

build: ## Build web/contract containers
	@docker compose build

rebuild: ## Rebuild web/contract containers
	@docker compose build --no-cache

dev: ## Start web/contract containers
	@docker compose up

start: ## Start web/contract containers
	@docker compose up -d

stop: ## Stop web/contract containers
	@docker compose down


help: ## Show available targets
	@awk 'BEGIN {FS = ":.*?## "}; /^[a-zA-Z0-9_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
