// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.4.22 <0.9.0;
contract ExampleExternalContract {

  // - Attributes.
  // Deployer address.
  address private deployer;

  // Staking completed?
  bool public completed;

  constructor() public {
    deployer = msg.sender;
  }

  function complete() public payable {
    (bool success, ) = deployer.call{value: address(this).balance}("");
    require(success, "DSA-E: CRITICAL! Complete transfer failed.");
    completed = true;
  }

}