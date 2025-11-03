
-include .env

CONTRACTS_DIR := apps/on-chain
WEB_DIR := apps/web
SESSION_DIR ?= session
DOCS_DIR    ?= docs

.PHONY: help \
	docs \
	contracts-install contracts-clean contracts-test contracts-deploy contracts-deploy-sepolia \
	web-install web-dev web-build web-start web-lint \
	docker-up docker-down docker-build

docs: ## Create HTML files for codelabs
	@cd ./session/week1 && claat export week1.md && cd ../../ && rm -rf ./docs/week1/** && mv ./session/week1/html/** ./docs/week1/
	@cd ./session/week2 && claat export week2.md && cd ../../ && rm -rf ./docs/week2/** && mv ./session/week2/html/** ./docs/week2/

# 
# Contracts
# 

contracts-install: ## Install contract dependencies
	@cd $(CONTRACTS_DIR) && npm install

contracts-clean: ## Clean contract artifacts
	@cd $(CONTRACTS_DIR) && npx hardhat clean

contracts-test: ## Run contract tests
	@cd $(CONTRACTS_DIR) && npx hardhat test

contracts-deploy: ## Deploy contracts to local network
	@cd $(CONTRACTS_DIR) && npx hardhat ignition deploy ignition/modules/LicenseManager.ts

contracts-deploy-sepolia: ## Deploy contracts to Sepolia network
	@cd $(CONTRACTS_DIR) && npx hardhat ignition deploy ignition/modules/LicenseManager.ts --network sepolia

# 
# Web
# 

web-install: ## Install web dependencies
	@cd $(WEB_DIR) && npm install

web-dev: ## Start web dev server
	@cd $(WEB_DIR) && npm run dev

web-build: ## Build web app
	@cd $(WEB_DIR) && npm run build

web-start: ## Start web app (production)
	@cd $(WEB_DIR) && npm run start

web-lint: ## Lint web project
	@cd $(WEB_DIR) && npm run lint

# 
# Docker helpers
#

build: ## Build web/contract containers
	@docker compose build

start: ## Start web/contract containers
	@docker compose up

stop: ## Stop web/contract containers
	@docker compose down


help: ## Show available targets
	@awk 'BEGIN {FS = ":.*?## "}; /^[a-zA-Z0-9_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
