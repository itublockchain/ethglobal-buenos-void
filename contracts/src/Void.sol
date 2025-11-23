// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IERC20 {
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract Void {
    struct StateRootInfo {
        bytes32 stateRoot;
        uint256 term;
        bytes32 signature;
    }

    address public TeeAddress;
    bool public isTeeDead = false; // false = alive, true = dead
    bool public isChallangePeriodActive = false;
    uint256 public lastPingTimestamp;
    uint256 public pingTimeout = 2 hours; // Configurable timeout period
    StateRootInfo lastRoot;
    uint256 public challangePeriod; // Configurable timeout period

    event TeeRegistered(address indexed teeAddress, uint256 timestamp);
    event PingReceived(address indexed teeAddress, uint256 timestamp);
    event TeeMarkedDead(uint256 timestamp);
    event TeeRevived(address indexed teeAddress, uint256 timestamp);
    event Deposited(address indexed user, uint256 amount, address tokenAddress);
    event EmergencyWithdraw(address indexed user, uint256 amount, address tokenAddress);
    event WithdrawNonInclusive(address indexed user, uint256 amount, address tokenAddress);

    modifier onlyTee() {
        require(msg.sender == TeeAddress, "Only TEE can call this");
        _;
    }

    modifier whenTeeAlive() {
        require(!isTeeDead, "TEE is dead");
        _;
    }

    modifier whenTeeDead() {
        require(isTeeDead, "TEE is still alive");
        _;
    }

    modifier whenChallangePeriodIsActive() {
        require(isChallangePeriodActive, "Challange Period Is Not Active");
        _;
    }

    modifier whenChallangePeriodIsFinished() {
        require(lastPingTimestamp + challangePeriod < block.timestamp, "Challange Period Is Not Finished");
        _;
    }

    constructor(address _teeAddress, uint256 _pingTimeout, uint256 _challangePeriod) {
        require(_teeAddress != address(0), "Invalid TEE address");
        TeeAddress = _teeAddress;
        challangePeriod = _challangePeriod;
        pingTimeout = _pingTimeout;
        lastPingTimestamp = block.timestamp;
        emit TeeRegistered(_teeAddress, block.timestamp);
    }

    // TEE sends ping to prove it's alive
    function ping() external onlyTee whenTeeAlive {
        if (lastPingTimestamp + pingTimeout < block.timestamp) {
            emit TeeRevived(TeeAddress, block.timestamp);
        } else {
            lastPingTimestamp = block.timestamp;

            emit PingReceived(TeeAddress, block.timestamp);
        }
    }

    function markDead() external {
        if (lastPingTimestamp + pingTimeout < block.timestamp) {
            isTeeDead = true;
            emit TeeRevived(TeeAddress, block.timestamp);
        }
    }

    function isTeeAlive() public returns (bool) {
        if (block.timestamp > lastPingTimestamp + pingTimeout) {
            if (!isTeeDead) {
                isTeeDead = true;
                emit TeeMarkedDead(block.timestamp);
            }
        }
        return !isTeeDead;
    }

    function deposit(uint256 amount, address tokenAddress) public whenTeeAlive {
        require(amount > 0, "Amount must be greater than 0");

        // Transfer ERC20 tokens from user to this contract
        bool success = IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");
        emit Deposited(msg.sender, amount, tokenAddress);
    }

    function withdraw(address to, uint256 amount, address tokenAddress) public onlyTee {
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");

        // Transfer ERC20 tokens to the specified recipient
        bool success = IERC20(tokenAddress).transfer(to, amount);
        require(success, "Token transfer failed");

        emit WithdrawNonInclusive(to, amount, tokenAddress);
    }

    function emergencyWithdrawWithInclusive(uint256 amount, address tokenAddress)
        public
        whenTeeDead
        whenChallangePeriodIsFinished
    {
        require(amount > 0, "Amount must be greater than 0");

        // SparseMerkleProof.computeRootFromProof()

        bool success = IERC20(tokenAddress).transfer(msg.sender, amount);
        require(success, "Token transfer failed");

        emit EmergencyWithdraw(msg.sender, amount, tokenAddress);
    }

    function withdrawWithNonInclusive(uint256 amount, address tokenAddress)
        public
        whenTeeDead
        whenChallangePeriodIsFinished
    {
        require(amount > 0, "Amount must be greater than 0");

        // SparseMerkleProof.computeRootFromProof()

        // Transfer ERC20 tokens to the user
        bool success = IERC20(tokenAddress).transfer(msg.sender, amount);
        require(success, "Token transfer failed");

        emit WithdrawNonInclusive(msg.sender, amount, tokenAddress);
    }

    function challangeLastRoot(bytes32 amount) public whenTeeDead whenChallangePeriodIsActive {}

    // View function to check TEE status without state change
    function checkTeeStatus() public view returns (bool isAlive, uint256 timeSinceLastPing, uint256 timeUntilTimeout) {
        uint256 elapsed = block.timestamp - lastPingTimestamp;
        isAlive = elapsed <= pingTimeout;
        timeSinceLastPing = elapsed;
        timeUntilTimeout = elapsed >= pingTimeout ? 0 : pingTimeout - elapsed;
    }
}
