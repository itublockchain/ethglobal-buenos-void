// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {Void} from "../src/Void.sol";

contract VoidScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        Void void = new Void(address(0x0D706cCF3Fe6a2fD2930861C033529d37A3fc48e), 12 hours, 12 hours);

        vm.stopBroadcast();
    }
}
