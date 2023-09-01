// contracts/interfaces/IWormhole.sol
// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.0;

import "../shared/WormholeStructs.sol";

interface IWormhole is WormholeStructs {
    event LogMessagePublished(
        address indexed sender,
        uint64 sequence,
        uint32 nonce,
        bytes payload,
        uint8 consistencyLevel
    );

    function publishMessage(
        uint32 nonce,
        bytes memory payload,
        uint8 consistencyLevel
    ) external payable returns (uint64 sequence);

    function parseAndVerifyVM(
        bytes calldata encodedVM
    ) external view returns (WormholeStructs.VM memory vm, bool valid, string memory reason);

    function verifyVM(
        WormholeStructs.VM memory vm
    ) external view returns (bool valid, string memory reason);

    function verifySignatures(
        bytes32 hash,
        WormholeStructs.Signature[] memory signatures,
        WormholeStructs.GuardianSet memory guardianSet
    ) external pure returns (bool valid, string memory reason);

    function parseVM(bytes memory encodedVM) external pure returns (WormholeStructs.VM memory vm);

    function getGuardianSet(
        uint32 index
    ) external view returns (WormholeStructs.GuardianSet memory);

    function getCurrentGuardianSetIndex() external view returns (uint32);

    function getGuardianSetExpiry() external view returns (uint32);

    function governanceActionIsConsumed(bytes32 hash) external view returns (bool);

    function isInitialized(address impl) external view returns (bool);

    function chainId() external view returns (uint16);

    function governanceChainId() external view returns (uint16);

    function governanceContract() external view returns (bytes32);

    function messageFee() external view returns (uint256);
}
