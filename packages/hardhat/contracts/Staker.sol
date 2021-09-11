// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol
import "./ExampleExternalContract.sol";

contract Staker is Ownable {
    /**
     * @author MrFrenzoid
     * @title Decentralized Staking.
     * @notice A contract that allows users to stack ETH.
     */

    /// - Attributes.
    // User struct.
    struct User {
        address addr;
        uint256 bal;
    }

    // mapping of balances of users (slower since we need to iterate, but gives more control and storage cleanance).
    mapping(uint256 => User) public stakers;

    // stakers count.
    uint256 public stakersCount;

    // Threshold.
    uint256 public threshold;

    // Deadline date.
    uint256 public deadline;

    // Completed
    bool public completed;

    // External Contract.
    ExampleExternalContract public exampleExternalContract;

    /// - Events.
    event Stake(address user, uint256 amount);
    event Withdraw(address sender, address receiver, uint256 amount);
    event Completed(uint256 staked);
    event newStakingPeriod(uint256 deadline);
    event newThreshold(uint256 threshold);

    /// - Modifiers.
    // The timer still goes on!.
    modifier deadlineNotPassed() {
        require(timeLeft() != 0, "DSA: Sorry, the deadile has passed!");
        _;
    }

    /**
     * @notice Modifier that require the contract to not be completed
     */
    modifier notCompleted() {
        require(completed == false, "DSA: Operation is already completed!");
        _;
    }

    /**
     * @notice Constructor of the contract
     * @param exampleExternalContractAddress Address of the external contract that will hold stacked funds
     */
    /// - Constructor
    constructor(address payable exampleExternalContractAddress) public {
        exampleExternalContract = ExampleExternalContract(
            exampleExternalContractAddress
        );
        stakersCount = 0;
        threshold = 1 ether;
        completed = false;
        deadline = block.timestamp + 15 minutes;
    }

    /// - Public methods.
    /**
     * @notice Staker function, users will use this function to stake their eth.
     */
    function stake() public payable notCompleted deadlineNotPassed {
        (uint256 index, bool found) = findUserIndex(msg.sender);

        if (found) {
            stakers[index].bal += msg.value;
        } else {
            stakersCount++;
            stakers[stakersCount] = User(msg.sender, msg.value);
        }

        emit Stake(msg.sender, msg.value);

        if (address(this).balance >= threshold) {
            execute();
        }
    }

    /**
     * @notice Execute function, will triger after deadline and threshold or threshold reaching. It sends all eth to the external contract.
     */
    function execute() public notCompleted deadlineNotPassed {
        require(
            address(this).balance >= threshold,
            "DSA: Can't execute yet, threshold hasn't been met."
        );

        completed = true;

        emit Completed(address(this).balance);

        exampleExternalContract.complete{value: address(this).balance}();
    }

    /**
     * @notice Makes users able to withdraw if deadline is met, but threshold isn't.
     * @param _receiver Address of the reciver account, if the users wants to send the ETH to a specific account.
     */
    function withdraw(address payable _receiver) public notCompleted {
        // Check if timer is done.
        require(
            timeLeft() == 0,
            "DSA: You cannot withdraw during the staking period. Wait until the timer is done."
        );

        // Check if address is empty, if it is, withraw to its account.
        if (address(_receiver) == address(0)) _receiver = msg.sender;

        // Check if user has staked eth.
        (uint256 index, bool found) = findUserIndex(msg.sender);
        require(found, "DSA: You dont have funds staked to withdraw.");

        // Withdraw and delete.
        uint256 balance = stakers[index].bal;
        delete stakers[index];

        // Transfer balance
        (bool success, ) = _receiver.call{value: balance}("");
        require(success, "DSA: CRITICAL! Withdrawal transfer failed.");

        emit Withdraw(msg.sender, _receiver, balance);
    }

    /**
     * @notice Returns the time left of the deadline.
     */
    function timeLeft() public view returns (uint256) {
        return (block.timestamp >= deadline) ? 0 : deadline - block.timestamp;
    }

    /**
     * @notice Returns the staked balance of the caller.
     * @param _user User address to return its balance.
     */
    function stakedBalance(address _user) public view returns (uint256) {
        (uint256 index, bool found) = findUserIndex(_user);
        if (!found) return 0;
        return stakers[index].bal;
    }

    /// - Admin methods.
    /**
     * @notice Restarts the staking period, with a new time and threshold.
     * @param _stakingPeriod Staking deadline time in Minutes.
     * @param _threshold Threshold value to set in ETH.
     */
    function newStakingPeriodMinutes(uint256 _stakingPeriod, uint256 _threshold)
        public
        onlyOwner
    {
        // Check if the period is 0 or negative.
        require(_stakingPeriod > 0, "DSA: Minutes can't be 0 or negative.");

        // Check if the threshold is 0 or negative.
        require(_threshold > 0, "DSA: threshold must be atleast 1.");

        // Clears mapping.
        clear();

        // Sets complete state
        completed = false;

        // Sets a new deadline in minutes.
        deadline = block.timestamp + (_stakingPeriod * 1 minutes);

        // Sets a new threshold.
        setThreshold(_threshold);

        emit newStakingPeriod(deadline);
    }

    /**
     * @notice Sets a threshold.
     * @param _eth Threshold value in ETH
     */
    function setThreshold(uint256 _eth) public onlyOwner {
        threshold = _eth * 1 ether;
        emit newThreshold(threshold);
    }

    /**
     * @notice Emergency function to force clear mappings.
     */
    function adminForceClear() public onlyOwner {
        clear();
    }

    /**
     * @notice Emergency function to withdraw all ETH.
     * @param _to Address to send the ETH to.
     */
    function adminWithdrawAll(address _to) public onlyOwner {
        require(_to != address(0), "DSA: Invalid address.");

        (bool success, ) = _to.call{value: address(this).balance}("");
        require(success, "DSA: CRITICAL! adminWithdrawAll transfer failed.");
    }

    /// - Internal methods.
    /**
     * @notice Clears the mappings.
     */
    function clear() internal {
        // Reverse loops are faster :)
        for (uint256 i = stakersCount; i > 0; i--) {
            delete stakers[i];
        }

        stakersCount = 0;
    }

    /**
     * @notice Finds a user inside the mapping.
     * @param _addr Address of the user we want to find its index, inside the mapping.
     */
    function findUserIndex(address _addr)
        internal
        view
        returns (uint256, bool)
    {
        // Check if the address is valid.
        require(_addr != address(0), "DSA: Invalid Address.");

        // If there are no accounts, return false.
        if (stakersCount == 0) return (0, false);

        // Reverse loops are faster :)
        for (uint256 i = stakersCount; i > 0; i--) {
            if (stakers[i].addr == _addr) {
                return (i, true);
            }
        }

        return (0, false);
    }

    /// - Fallback & receive
    fallback() external payable {
        revert();
    }

    receive() external payable {
        revert();
    }
}
