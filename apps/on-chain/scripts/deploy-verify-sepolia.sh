#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(realpath "${SCRIPT_DIR}/..")"
cd "${PROJECT_ROOT}"

NETWORK="sepolia"
TIMESTAMP="$(date +%s)"
LICENSE_DEPLOYMENT_DIR="ignition/deployments/license-manager-${TIMESTAMP}"
COMMITTEE_DEPLOYMENT_DIR="ignition/deployments/commitee-manager-${TIMESTAMP}"
BASE_URI="ipfs://base/{id}.json"

read_license_address() {
  local key="$1"
  node -e "const fs=require('fs');const path='${LICENSE_DEPLOYMENT_DIR}/deployed_addresses.json';const data=JSON.parse(fs.readFileSync(path));const addr=data['${key}'];if(!addr){process.exit(1);}process.stdout.write(addr);"
}

read_committee_address() {
  local key="$1"
  node -e "const fs=require('fs');const path='${COMMITTEE_DEPLOYMENT_DIR}/deployed_addresses.json';const data=JSON.parse(fs.readFileSync(path));const addr=data['${key}'];if(!addr){process.exit(1);}process.stdout.write(addr);"
}

echo "[Deploy+Verify] Deploying LicenseManager -> ${NETWORK} (deployment id: ${TIMESTAMP})"
npx hardhat ignition deploy ignition/modules/LicenseManager.ts --network "${NETWORK}" --deployment-id "license-manager-${TIMESTAMP}"

if [ ! -f "${LICENSE_DEPLOYMENT_DIR}/deployed_addresses.json" ]; then
  echo "LicenseManager deployment artifacts missing at ${LICENSE_DEPLOYMENT_DIR}" >&2
  exit 1
fi

LICENSE_ADDRESS="$(read_license_address 'LicenseManagerModule#LicenseManager')"
echo "[Deploy+Verify] LicenseManager deployed at ${LICENSE_ADDRESS}"

PARAMS="$(node -e "const addr=process.argv[1];process.stdout.write(JSON.stringify({CommitteeManagerModule:{licenseManagerAddress:addr}}));" "${LICENSE_ADDRESS}")"

echo "[Deploy+Verify] Deploying CommitteeManager -> ${NETWORK}"
npx hardhat ignition deploy ignition/modules/CommitteeManager.ts --network "${NETWORK}" --deployment-id "commitee-manager-${TIMESTAMP}" --parameters "${PARAMS}"

if [ ! -f "${COMMITTEE_DEPLOYMENT_DIR}/deployed_addresses.json" ]; then
  echo "CommitteeManager deployment artifacts missing at ${COMMITTEE_DEPLOYMENT_DIR}" >&2
  exit 1
fi

COMMITTEE_ADDRESS="$(read_committee_address 'CommitteeManagerModule#CommitteeManager')"
echo "[Deploy+Verify] CommitteeManager deployed at ${COMMITTEE_ADDRESS}"

echo "[Deploy+Verify] Verifying LicenseManager (${LICENSE_ADDRESS})"
npx hardhat verify --network "${NETWORK}" "${LICENSE_ADDRESS}" "${BASE_URI}"

echo "[Deploy+Verify] Verifying CommitteeManager (${COMMITTEE_ADDRESS})"
npx hardhat verify --network "${NETWORK}" "${COMMITTEE_ADDRESS}" "${LICENSE_ADDRESS}"

echo "[Deploy+Verify] Completed."
echo "LicenseManager:    ${LICENSE_ADDRESS}"
echo "CommitteeManager:  ${COMMITTEE_ADDRESS}"
