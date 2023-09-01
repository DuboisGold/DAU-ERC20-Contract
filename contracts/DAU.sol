// SPDX-License-Identifier: Copyright all rights reserved.
pragma solidity ^0.8.12;

import "./ERC20/CATERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";


contract DAU is
    CATERC20Upgradeable,
    ERC20BurnableUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ERC20PermitUpgradeable,
    UUPSUpgradeable
{

    /// @dev Constant for the pauser role
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    /// @dev Constant for the minter role
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    /// @dev Constant for the controller role
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    /// @dev Constant for the fee controller role
    bytes32 public constant FEE_ROLE = keccak256("FEE_ROLE");
    /// @dev Constant for the fee upgrader role
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    mapping(address => bool) internal _frozen;
    mapping(address => bool) internal _notpaying;

    /// @dev Current fee rate
    uint256 public feeRate;
    /// @dev Address where fees get sent
    address public feeAccumulator;

    /// @dev Fee rate denominator
    uint256 public feeParts;

    string internal _websiteLink;

    /**
     * @dev Emitted when `addr` has been frozen
     */
    event AddressFrozen(address indexed addr);
    /**
     * @dev Emitted when `addr` has been unfrozen
     */
    event AddressUnfrozen(address indexed addr);
    /**
     * @dev Emitted in addition to transfer event during transfer when fee is being transfered to accumulator
     */
    event FeeCollected(address indexed from, address indexed to, uint256 value);
    /**
     * @dev Emitted every time trasfer fee rate is changed
     */
    event FeeRateSet(uint256 indexed oldFeeRate, uint256 indexed newFeeRate);

    /**
     * @dev Emitted every time trasfer fee accumulator is changed
     */
    event FeeAccumulatorSet(
        address indexed oldFeeAccumulator,
        address indexed newFeeAccumulator
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(){
        _disableInitializers();
    }

    /// @dev Function to initialize contract
    function initialize(
        string memory name,
        string memory symbol,
        uint8 decimal,
        uint16 chainId,
        address wormhole,
        uint8 finality
    ) public initializer {
        __ERC20_init(name, symbol);
        __CATERC20_init(decimal, chainId, wormhole, finality);
        __ERC20Burnable_init();
        __Pausable_init();
        __AccessControl_init();
        __ERC20Permit_init(name);
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(CONTROLLER_ROLE, msg.sender);
        _grantRole(FEE_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        feeRate = 0;
        feeParts = 1000000;
        feeAccumulator = msg.sender;
    }

    /**
     * @dev Freezes an address balance from being transferred.
     * @param addr The address to freeze.
     */
    function freeze(address addr) public onlyRole(CONTROLLER_ROLE) {
        require(!_frozen[addr], "address already frozen");
        _frozen[addr] = true;
        emit AddressFrozen(addr);
    }

    /**
     * @dev Unfreezes an address balance allowing transfer.
     * @param addr The new address to unfreeze.
     */
    function unfreeze(address addr) public onlyRole(CONTROLLER_ROLE) {
        require(_frozen[addr], "address already unfrozen");
        _frozen[addr] = false;
        emit AddressUnfrozen(addr);
    }

    /**
     * @dev Gets whether the address is currently frozen.
     * @param addr The address to check if frozen.
     * @return A bool representing whether the given address is frozen.
     */
    function isFrozen(address addr) public view returns (bool) {
        return _frozen[addr];
    }

    /**
     * @dev Adds an address to the list of nonpaying addresses
     * @param addr The address to add.
     */
    function addNotPaying(address addr) public onlyRole(FEE_ROLE) {
        require(!_notpaying[addr], "address already notpaying");
        _notpaying[addr] = true;
    }

    /**
     * @dev Removes an address from notpaying.
     * @param addr The  address to remove.
     */
    function removeNotPaying(address addr) public onlyRole(FEE_ROLE) {
        require(_notpaying[addr], "address is not notpaying");
        _notpaying[addr] = false;
    }

    /**
     * @dev Gets whether the address is currently notpaying.
     * @param addr The address to check if notpaying.
     * @return A bool representing whether the given address is notpaying.
     */
    function isNotPaying(address addr) public view returns (bool) {
        return _notpaying[addr];
    }

    /**
     * @dev Pause the contract preventing transfers
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev mint new tokens
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
        require(!_frozen[to] && !_frozen[from], "address frozen");
    }

    /**
     * @dev Sets a new fee recipient address.
     * @param newFeeAccumulator The address allowed to collect transfer fees for transfers.
     */
    function setFeeAccumulator(
        address newFeeAccumulator
    ) public onlyRole(FEE_ROLE) {
        require(
            newFeeAccumulator != address(0),
            "cannot set fee accumulator to null"
        );
        address oldFeeAccumulator = feeAccumulator;
        feeAccumulator = newFeeAccumulator;
        emit FeeAccumulatorSet(oldFeeAccumulator, newFeeAccumulator);
    }

    /**
     * @dev Sets a new fee rate.
     * @param _newFeeRate The new fee rate to collect as transfer fees for transfers.
     */
    function setFeeRate(uint256 _newFeeRate) public onlyRole(FEE_ROLE) {
        require(_newFeeRate <= (feeParts / 2), "cannot set fee rate above 50%");
        uint256 _oldFeeRate = feeRate;
        feeRate = _newFeeRate;
        emit FeeRateSet(_oldFeeRate, feeRate);
    }

    /**
     * @dev Moves `amount` of tokens from `sender` to `recipient` subtracting fee
     * fee is transfered to feeAccumulator
     *
     * Emits 2 {Transfer} events. Emits 2 {FeeCollected}  event
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        uint256 feeAmount = 0;
        if (!_notpaying[sender] && !_notpaying[recipient]) {
            feeAmount = getFeeFor(amount);
        }
        uint256 newAmount = amount - feeAmount;
        if (feeAmount > 0) {
            emit FeeCollected(sender, feeAccumulator, feeAmount);
            super._transfer(sender, feeAccumulator, feeAmount);
        }
        super._transfer(sender, recipient, newAmount);
    }

    /**
     * @dev Gets a fee for a given value
     * ex: given feeRate = 200 and feeParts = 1,000,000 then getFeeFor(10000) = 2
     * @param value The amount to get the fee for.
     */
    function getFeeFor(uint256 value) public view returns (uint256) {
        if (feeRate == 0) {
            return 0;
        }
        return (value * feeRate) / feeParts;
    }

    function decimals() public view virtual override(CATERC20Upgradeable, ERC20Upgradeable) returns (uint8) {
        return getDecimals();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(AccessControlUpgradeable, CATERC20Upgradeable) returns (bool) {
        return
            super.supportsInterface(interfaceId);
    }

    function registerChain(
        uint16 chainId,
        bytes32 tokenContract
    ) public override onlyRole(UPGRADER_ROLE) {
        super.registerChain(chainId, tokenContract);
    }

    function registerChains(
        uint16[] memory chainId,
        bytes32[] memory tokenContract
    ) public override onlyRole(UPGRADER_ROLE) {
        super.registerChains(chainId, tokenContract);
    }

    function updateFinality(
        uint8 finality
    ) public override onlyRole(UPGRADER_ROLE) {
        super.updateFinality(finality);
    }

    function websiteLink() public view returns (string memory) {
        return _websiteLink;
    }

    function setWebsiteLink(
        string memory newLink
    ) public onlyRole(UPGRADER_ROLE) {
        _websiteLink = newLink;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
