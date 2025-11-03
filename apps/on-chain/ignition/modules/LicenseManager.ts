import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LicenseManagerModule", (m) => {
  // 배포 파라미터
  const baseUri = m.getParameter("baseUri", "ipfs://base/{id}.json");

  const licenseManager = m.contract("LicenseManager", [baseUri]);

  return { licenseManager };
});
