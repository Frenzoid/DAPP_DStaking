// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; //https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol

/**
 * @author MrFrenzoid
 * @title External receiving contract.
 * @notice A contract that receives and stacks all stacked ETH.
 */

contract ExampleExternalContract is Ownable {
    /// - Attributes.
    // Last winning stake.
    uint256 public lastStackValue;

    // - Events.
    event stakeCompleted(uint256 stake);
    event stakeWithdrawed(address transeferedTo, uint256 stake);

    /// - Constructor.
    constructor() public {
        lastStackValue = 0;
    }

    ///. - Public methods.
    function complete() public payable {
        lastStackValue = address(this).balance;

        emit stakeCompleted(lastStackValue);

        // The admins will be the ones to do the transactions.
    }

    /// - Admin methods.
    /**
     * @notice Withdrawal function
     * @param _to Address to send the ETH to.
     */
    function adminWithdrawAll(address _to) public onlyOwner {
        require(_to != address(0), "DSA: Invalid address.");

        emit stakeWithdrawed(_to, address(this).balance);

        (bool success, ) = _to.call{value: address(this).balance}("");
        require(success, "DSA: CRITICAL! adminWithdrawAll transfer failed.");
    }

    /// - Fallback & receive
    fallback() external payable {
        revert();
    }

    receive() external payable {
        revert();
    }
}
