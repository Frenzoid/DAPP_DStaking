// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; //https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol

contract Staker is Ownable {

  // - Attributes.
  // User struct.
  struct Gambler {
    address addr;
    uint256 bal;
  }

  // Array of balances of users (because we will want to iterate over them).
  mapping(uint256 => Gambler) public gamblers;

  // stakers count.
  uint256 public gamblerCount;

  // Threshold.
  uint256 public threshold;

  // Deadline date.
  uint256 public deadline;

  // completed
  bool public completed;

  

  // - Events.
  event Stake(address user, uint256 amount);
  event Withdraw(address sender, address reciever, uint256 amount);
  event Completed(uint256 staked);
  event newStakingPeriod(uint256 deadline);
  event newTreshold(uint256 treshold);



  // - Modifiers.
  // The timer still goes on!.
  modifier deadlineNotPassed() {
    require(timeLeft() != 0, "DSA: Sorry, the deadile has passed!");
    _;
  }

  // External contract not yet completed.
  modifier notCompleted() {
    require(completed == false, "DSA: Operation is already completed!");
    _;
  }



  // - Constructor
  constructor() public {
    gamblerCount = 1;
    threshold = 1 ether;
    deadline = block.timestamp + 5 minutes;
    completed = false;
  }



  // - Public methods.
  // Staker function, users will use this function to stake their eth.
  function stake() public payable notCompleted deadlineNotPassed{
    (uint256 index, bool found) = findUserIndex(msg.sender);
    console.log(index);

    if (found) {
      gamblers[index].bal += msg.value;
    } else {
      gamblers[gamblerCount] = Gambler(msg.sender, msg.value);

      gamblerCount++;
    }

    emit Stake(msg.sender, msg.value);

    if (address(this).balance >= threshold) {
        execute();
    }
  }

  // Execute function, will triger after deadline and treshold. For now it sends all eth to me :), for now..
  function execute() public notCompleted deadlineNotPassed{
    require(address(this).balance >= threshold, "DSA: Can't execute yet, treshold hasn't been met.");

    completed = true;
    emit Completed(address(this).balance);

    (bool success, ) = owner().call{value: address(this).balance}("");
    require(success, "DSA: CRITICAL! Execute transfer failed.");

    clear();
  }

  // Makes users able to withdraw if deadline is met, but treshold isn't.
  function withdraw(address payable _reciever) public notCompleted {
    require(_reciever != address(0), "DSA: Invalid reciever address.");
    require(timeLeft() == 0, "DSA: You cannot withdraw during the staking period. Wait until the timer is done.");
    
    (uint256 index, bool found) = findUserIndex(msg.sender);
    require(found, "DSA: You dont have funds staked to withdraw.");

    uint256 balance = gamblers[index].bal;
    gamblers[index].bal = 0;

    (bool success, ) = _reciever.call{value: balance}("");
    require(success, "DSA: CRITICAL! Withdrawal transfer failed.");

    emit Withdraw(msg.sender, _reciever, balance);
  }

  // Returns the time left of the deadline.
  function timeLeft() public view returns (uint256) {
    return (block.timestamp >= deadline) ? 0 : deadline - block.timestamp;
  }

  // Returns the staked balance of the caller.
  function stakedBalance(address _user) public view returns (uint256) {
    (uint256 index, bool found) = findUserIndex(_user);
    require(found, "DSA: You dont have funds staked.");
    return gamblers[index].bal;
  }


  // - Admin methods.
  // Restarts the staking period, with a new time and treshold.
  function newStakingPeriodMinutes(uint256 _stakingPeriod, uint256 _treshold) public onlyOwner {
    require(_stakingPeriod > 0, "DSA: Minutes can't be 0 or negative.");
    require(_treshold > 0, "DSA: treshold must be atleast 1.");

    completed = false;
    deadline = block.timestamp + ( _stakingPeriod * 1 minutes );

    setTreshold(_treshold);

    emit newStakingPeriod(deadline);
  }

  // Sets a treshold.
  function setTreshold(uint256 _eth) public onlyOwner {
    threshold = _eth * 1 ether;

    emit newTreshold(threshold);
  }

  // Emergency withdrawal function.
  function adminForceWithdrawAll(address _to) public onlyOwner {
    require(_to != address(0), "DSA: Invalid address.");

    (bool success, ) = _to.call{value: address(this).balance}("");
    require(success, "DSA: CRITICAL! ForceWithdraw transfer failed.");

    clear();
  }

  // Emergency function to force clear mappings.
  function adminForceClear() public onlyOwner {
    clear();
  }


  // - Internal methods.
  // Clears the mappings.
  function clear() internal {
    for(uint256 i = gamblerCount; i > 0; i--) {
      delete gamblers[i];
    }

    gamblerCount = 1;
  }

  // Finds a user inside the mapping 
  function findUserIndex(address _addr) internal view returns (uint256, bool) {
    require(_addr != address(0), "DSA: Invalid Address.");
    if(gamblerCount == 0) return (0, false);

    for(uint256 i = gamblerCount; i > 0; i--){
      if(gamblers[i].addr == _addr) {
          console.log(gamblers[i].addr);
          return (i, true);
      }
    }

    return (0, false);
  }

}