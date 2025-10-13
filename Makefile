
-include .env


docs: auth ## Create HTML files for codelabs
	@cd ./session/week1 && claat export week1.md && cd ../../ && rm -rf ./docs/week1/** && mv ./session/week1/html/** ./docs/week1/

deploy: ## Deploy to local network
	@cd apps/contracts && npx hardhat clean && npx hardhat ignition deploy ignition/modules/LicenseManager.ts

deploy-sepolia: ## Deploy to Sepolia network
	@cd apps/contracts && npx hardhat clean && npx hardhat ignition deploy ignition/modules/LicenseManager.ts --network sepolia

build: ## Start local blockchain
	@docker compose build

help: ## Show help message
	@awk 'BEGIN {FS = ":.*?## "}; /^[a-zA-Z0-9_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)


test: ## Run tests
	@cd apps/contracts && npx hardhat test
	
%:
	@: