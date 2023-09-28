// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import "../shared/WormholeStructs.sol";
import "../interfaces/IWormhole.sol";
import "../interfaces/ICATERC20.sol";
import "./Governance.sol";
import "./Structs.sol";

contract CATERC20Upgradeable is
    ContextUpgradeable,
    ERC20Upgradeable,
    CATERC20Governance,
    CATERC20Events,
    ERC165Upgradeable
{
    using SafeERC20Upgradeable for IERC20;

    function __CATERC20_init(
        uint8 decimal_,
        uint16 chainId_,
        address wormhole_,
        uint8 finality_
    ) internal onlyInitializing {
        __CATERC20_init_unchained(
            decimal_,
            chainId_,
            wormhole_,
            finality_
        );
    }

    function __CATERC20_init_unchained(
        uint8 decimal_,
        uint16 chainId_,
        address wormhole_,
        uint8 finality_
    ) internal onlyInitializing {
        require(isInitialized() == false, "Already Initialized");
        setEvmChainId(block.chainid);
        setDecimals(decimal_);
        setChainId(chainId_);
        setWormhole(wormhole_);
        setFinality(finality_);
        setIsInitialized();
    }

    function decimals() public view virtual override returns (uint8) {
        return getDecimals();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165Upgradeable) returns (bool) {
        return
            interfaceId == type(ICATERC20).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev To bridge tokens to other chains.
     */
    function bridgeOut(
        uint256 amount,
        uint16 recipientChain,
        bytes32 recipient,
        uint32 nonce
    ) external payable returns (uint64 sequence) {
        require(isInitialized() == true, "Not Initialized");
        require(evmChainId() == block.chainid, "unsupported fork");
        require(tokenContracts(recipientChain) != bytes32(0), "recipient chain not configured");

        uint256 fee = wormhole().messageFee();
        require(msg.value >= fee, "Not enough fee provided to publish message");
        uint16 tokenChain = wormhole().chainId();
        bytes32 tokenAddress = bytes32(uint256(uint160(address(this))));

        _burn(_msgSender(), amount);

        CATERC20Structs.CrossChainPayload memory transfer = CATERC20Structs
            .CrossChainPayload({
                amount: amount,
                tokenAddress: tokenAddress,
                tokenChain: tokenChain,
                toAddress: recipient,
                toChain: recipientChain,
                tokenDecimals: getDecimals()
            });

        sequence = wormhole().publishMessage{value: msg.value}(
            nonce,
            encodeTransfer(transfer),
            finality()
        );

        emit bridgeOutEvent(
            amount,
            tokenChain,
            recipientChain,
            addressToBytes(_msgSender()),
            recipient
        );
    } // end of function

    function bridgeIn(bytes memory encodedVm) external returns (bytes memory) {
        require(isInitialized() == true, "Not Initialized");
        require(evmChainId() == block.chainid, "unsupported fork");

        (IWormhole.VM memory vm, bool valid, string memory reason) = wormhole()
            .parseAndVerifyVM(encodedVm);
        require(valid, reason);
        require(
            bytesToAddress(vm.emitterAddress) == address(this) ||
                tokenContracts(vm.emitterChainId) == vm.emitterAddress,
            "Invalid Emitter"
        );

        CATERC20Structs.CrossChainPayload memory transfer = decodeTransfer(
            vm.payload
        );
        address transferRecipient = bytesToAddress(transfer.toAddress);

        require(!isTransferCompleted(vm.hash), "transfer already completed");
        setTransferCompleted(vm.hash);

        require(
            transfer.toChain == wormhole().chainId(),
            "invalid target chain"
        );

        uint256 nativeAmount = normalizeAmount(
            transfer.amount,
            transfer.tokenDecimals,
            getDecimals()
        );

        _mint(transferRecipient, nativeAmount);

        emit bridgeInEvent(
            nativeAmount,
            transfer.tokenChain,
            transfer.toChain,
            transfer.toAddress
        );

        return vm.payload;
    }

}
