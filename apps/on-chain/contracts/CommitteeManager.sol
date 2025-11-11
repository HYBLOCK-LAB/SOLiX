// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ILicenseManager} from "./interfaces/ILicenseManager.sol";

contract CommitteeManager is AccessControl {}
