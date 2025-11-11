import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CommitteeManagerModule", (m) => {
  const licenseManagerAddress =
    m.getParameter<string>("licenseManagerAddress");

  const committeeManager = m.contract("CommitteeManager", [
    licenseManagerAddress,
  ]);

  return { committeeManager };
});
