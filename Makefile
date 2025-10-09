
-include .env


docs: auth ## Create HTML files for codelabs
	@cd ./session/week1 && claat export week1.md && cd ../../ && rm -rf ./docs/week1/** && mv ./session/week1/html/** ./docs/week1/
	@cd ./session/week2 && claat export week2.md && cd ../../ && rm -rf ./docs/week2/** && mv ./session/week2/html/** ./docs/week2/


help: ## Show help message
	@awk 'BEGIN {FS = ":.*?## "}; /^[a-zA-Z0-9_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

deploy: ## Deploy to local network
	@cd apps/contracts && npx hardhat clean && npx hardhat ignition deploy ignition/modules/LicenseManager.ts

deploy-sepolia: ## Deploy to Sepolia network
	@cd apps/contracts && npx hardhat ignition deploy --network sepolia

test: ## Run tests
	@cd apps/contracts && npx hardhat test
	
%:
	@: