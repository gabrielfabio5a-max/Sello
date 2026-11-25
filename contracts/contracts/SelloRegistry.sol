// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract SelloRegistry {
    struct Record {
        address registeredBy;
        uint64 registeredAt;
        string title;
    }

    mapping(bytes32 fingerprint => Record) private _records;

    uint256 public totalFingerprints;

    event FingerprintRegistered(
        bytes32 indexed fingerprint,
        address indexed registeredBy,
        uint64 registeredAt,
        string title
    );

    error EmptyFingerprint();
    error AlreadyRegistered(bytes32 fingerprint);

    function registerFingerprint(
        bytes32 fingerprint,
        string calldata title
    ) external {
        if (fingerprint == bytes32(0)) {
            revert EmptyFingerprint();
        }
        if (_records[fingerprint].registeredBy != address(0)) {
            revert AlreadyRegistered(fingerprint);
        }

        uint64 registeredAt = uint64(block.timestamp);

        _records[fingerprint] = Record({
            registeredBy: msg.sender,
            registeredAt: registeredAt,
            title: title
        });
        totalFingerprints++;

        emit FingerprintRegistered(
            fingerprint,
            msg.sender,
            registeredAt,
            title
        );
    }

    function verifyFingerprint(
        bytes32 fingerprint
    )
        external
        view
        returns (
            bool registered,
            address registeredBy,
            uint64 registeredAt,
            string memory title
        )
    {
        Record storage record = _records[fingerprint];
        registered = record.registeredBy != address(0);
        registeredBy = record.registeredBy;
        registeredAt = record.registeredAt;
        title = record.title;
    }
}
