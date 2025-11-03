
-include .env

CONTRACTS_DIR := apps/on-chain
WEB_DIR := apps/web
SESSION_DIR ?= session
DOCS_DIR    ?= docs

# 빌드할 주차 목록: 필요시 week1 week2 …를 추가하거나 자동탐색으로 교체 가능
WEEKS ?= week1 week2

.PHONY: help \
	docs \
	contracts-install contracts-clean contracts-test contracts-deploy contracts-deploy-sepolia \
	web-install web-dev web-build web-start web-lint \
	docker-up docker-down docker-build

docs2: ## Create HTML files for codelabs
	@cd ./session/week1 && claat export week1.md && cd ../../ && rm -rf ./docs/week1/** && mv ./session/week1/html/** ./docs/week1/
	@cd ./session/week2 && claat export week2.md && cd ../../ && rm -rf ./docs/week2/** && mv ./session/week2/html/** ./docs/week2/

# docs: ## Create HTML files for codelabs
# 	@set -e; \
# 	for week in $(WEEKS); do \
# 		echo "==> Building $$week"; \
# 		claat export "$(SESSION_DIR)/$$week/$$week.md"; \
# 		mkdir -p "$(DOCS_DIR)/$$week"; \
# 		rm -rf "$(DOCS_DIR)/$$week"/**; \
# 		mv "$(SESSION_DIR)/$$week/html"/** "$(DOCS_DIR)/$$week/"; \
# 	done
docs:
	@set -e; \
	for week in $(WEEKS); do \
	  src="$(SESSION_DIR)/$$week"; dst="$(DOCS_DIR)/$$week"; \
	  echo "==> Building $$week"; \
	  mkdir -p "$$src/html"; \
	  claat export -o "$$src/html" "$$src/$$week.md"; \
	  rm -rf "$$dst"; mkdir -p "$(DOCS_DIR)"; \
	  mv "$$src/html" "$$dst"; \
	done

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
