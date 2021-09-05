pragma solidity >=0.6.0 <0.7.0;

import "hardhat/console.sol";
import "./ExampleExternalContract.sol";

contract Staker {

  // - Attributes.
  // Mapping of balances of users.
  mapping(address => uint256) public balances;

  // Threshold.
  uint256 public constant threshold = 1 ether;

  // External Contract.
  ExampleExternalContract public exampleExternalContract;

  // Deadline date.
  uint256 public deadline = now + 30 seconds;



  // - Events.
  event Stake(address user, uint256 amount);
  event Withdraw(address sender, address reciever, uint256 amount);
  event Completed(uint256 staked);



  // - Modifiers.
  // The timer still goes on!.
  modifier deadlineNotPassed() {
    require(timeLeft() != 0, "DSA: Sorry, the deadile has passed!");
    _;
  }

  // External contract not yet completed.
  modifier notCompleted() {
    require(exampleExternalContract.completed() == false, "DSA: Operation is already completed!");
    _;
  }



  // - Constructor and Methods
  constructor(address exampleExternalContractAddress) public {
    exampleExternalContract = ExampleExternalContract(exampleExternalContractAddress);
  }

  function stake() public payable notCompleted deadlineNotPassed{
    balances[msg.sender] += msg.value;

    if (balances[msg.sender] >= threshold) {
        exampleExternalContract.complete();
    }

    emit Stake(msg.sender, msg.value);
  }

  function execute() public notCompleted deadlineNotPassed{
    require(address(this).balance >= threshold, "DSA: Can't execute yet, treshold hasn't been met.");

    uint256 balance = balances[msg.sender];
    exampleExternalContract.complete{value: address(this).balance}();

    emit Completed(balance);
}

  function withdraw(address payable _reciever) public notCompleted {
    require(timeLeft() == 0, "DSA: You cannot withdraw during the staking period. Wait until the timer is done.");
    require(balances[msg.sender] > 0, "DSA: You dont have funds to withdraw.");

    uint256 balance = balances[msg.sender];
    balances[msg.sender] = 0;
    _reciever.transfer(balance);

    emit Withdraw(msg.sender, _reciever, balance);
  }

  function timeLeft() public view returns (uint256) {
    return (now >= deadline) ? 0 : deadline - now;
  }

}