---
description: P3AIDIDRegistry smart contract for on-chain DID management.
---

# Smart Contract

## P3AIDIDRegistry

**Solidity Version:** `^0.8.0` | **License:** MIT

The `P3AIDIDRegistry` smart contract manages decentralized identities for users and AI agents on-chain.

## Data Structures

```solidity
struct DIDDocument {
    string documentHash;    // Hash of the DID document
    address controller;     // Address that controls this DID
    address creator;        // Address that created this DID
    uint256 timestamp;      // Last update timestamp
    bool active;            // Whether the DID is active
    bool isAIAgent;         // Whether this DID belongs to an AI agent
    bool isVerified;        // Whether the DID is verified by a delegate
}
```

## Storage

| Mapping                      | Description                                    |
| ---------------------------- | ---------------------------------------------- |
| `didDocuments[did]`          | Maps DID string → DIDDocument struct           |
| `userAIAgents[address]`      | Maps user address → array of agent DID strings |
| `registeredUsers[address]`   | Maps address → registration status             |
| `approvedDelegates[address]` | Maps address → delegate status                 |
| `allUsers[]`                 | Array of all registered user addresses         |

## DID Format

* **User DIDs:** `did:p3ai:user:{lowercase_hex_address}`
* **Agent DIDs:** `did:p3ai:agent:{lowercase_hex_address}`

## Functions

### User Registration

```solidity
function registerUserDID(string memory documentHash) public
```

Registers a new user DID. Requirements:

* Document hash must be 1–256 bytes
* Sender must not be zero address
* User must not already be registered
* DID must not already exist

Emits: `UserDIDRegistered(did, controller)`

### User Verification

```solidity
function verifyUserDID(address userAddress) public onlyDelegate
```

Only callable by approved delegates. Verifies a registered user's DID.

Emits: `UserDIDVerified(did, verifier)`

### AI Agent Registration

```solidity
function registerAIAgentDID(address agentAddress, string memory documentHash) public
```

Registers an AI agent DID. Requirements:

* Caller's user DID must be verified
* Agent address must not be zero
* Agent DID must not already exist
* Agent is **auto-verified** since the user is verified

Emits: `AIAgentDIDRegistered(did, agentAddress, creator)`

### Delegate Management

```solidity
function addDelegate(address delegate) public onlyOwner
function removeDelegate(address delegate) public onlyOwner
```

Owner can add/remove delegates who can verify user DIDs. The contract owner is automatically a delegate.

### Query Functions

| Function                  | Returns                                                                     | Description                        |
| ------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| `resolveDID(did)`         | `(document, controller, creator, timestamp, active, isAIAgent, isVerified)` | Resolve a DID to its full document |
| `getUserAIAgents(user)`   | `string[]`                                                                  | Get all agent DIDs owned by a user |
| `isUserVerified(address)` | `bool`                                                                      | Check if a user's DID is verified  |
| `getUnverifiedUsers()`    | `address[]`                                                                 | Get all unverified user addresses  |
| `getTotalUsers()`         | `uint256`                                                                   | Get total registered user count    |
| `isDelegate(address)`     | `bool`                                                                      | Check if an address is a delegate  |

## Events

| Event                  | Parameters                                                 | Description                   |
| ---------------------- | ---------------------------------------------------------- | ----------------------------- |
| `UserDIDRegistered`    | `did (indexed), controller (indexed)`                      | New user DID registered       |
| `UserDIDVerified`      | `did (indexed), verifier (indexed)`                        | User DID verified by delegate |
| `AIAgentDIDRegistered` | `did (indexed), agentAddress (indexed), creator (indexed)` | New AI agent DID registered   |
| `DelegateAdded`        | `delegate (indexed)`                                       | New delegate approved         |
| `DelegateRemoved`      | `delegate (indexed)`                                       | Delegate removed              |
