// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol"; //https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol


contract ExampleExternalContract is Ownable {

  // - Events
  event stakeCompleted(uint256 stake);
  event stakeWithdrawed(address transeferedTo, uint256 stake);

  constructor () public { }

  // - Public methods.
  function complete() public payable {
    emit stakeCompleted(address(this).balance);
  }
  
  
  // - Admin methods.
  // Withdrawal function.
  function adminWithdrawAll(address _to) public onlyOwner {
    require(_to != address(0), "DSA: Invalid address.");
    
    emit stakeWithdrawed(_to, address(this).balance);

    (bool success, ) = _to.call{value: address(this).balance}("");
    require(success, "DSA: CRITICAL! adminWithdrawAll transfer failed.");
  }
  
  
  // - Fallback & receive
  fallback() external payable { revert(); }
  receive() external payable { revert(); }
}