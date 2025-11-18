# WalrusDB SDK

WalrusDB is a developer-friendly SDK that combines verifiable storage (Walrus) with powerful encryption (Seal) to make secure data storage and sharing easy. It abstracts cryptography and blockchain interactions into simple, high-level functions so every application — web, mobile, backend, or cloud — can protect user data with minimal effort.

Key goals:
- Make advanced encryption patterns accessible to everyday developers.
- Provide simple APIs to encrypt, store, and decrypt data.
- Integrate with Sui/Walrus while hiding low-level complexity.

## Core concepts

- Walrus: verifiable, off-chain storage for blobs and files.
- Seal: threshold-based encryption patterns that control who can decrypt data (AllowList, Private Data, Subscription, etc.).
- SealClient / WalrusClient: high-level SDK clients that wrap Seal and Walrus functionality.

## Features

- High-level encryption helpers:
  - AllowList encryption (encrypt + store or return bytes)
  - Private Data encryption (compute key ID from nonce, store on-chain or return bytes)
  - Subscription encryption (service/subscription based access)
- Store and fetch blobs from Walrus
- CLI to scaffold clients and initialize keys
- Minimal local helper implementations for development (mock/extendable)

## Install

Install the package (example with npm — adapt to your package setup):

npm install walrusdb

Or during development, use the local client in this repo.

## Quick start

1. Create or obtain a KeyPair (the repo includes a KeyPair helper).
2. Create a client and use the high level methods.

Minimal example (pseudo-code):

import { KeyPair } from "walrusdb/src/core/keyPair";
import { WalrusClient } from "walrusdb/example/walrus/client";
import { SealClient } from "walrusdb/src/core/seal";

const keyPair = new KeyPair(); // or load an existing secret key
const walrus = new WalrusClient(keyPair); // storage helper
const seal = new SealClient();
seal.network = "testnet"; // set network
seal.keyPair = keyPair;

// Encrypt and store with AllowList
const { blobId, blobObject } = await seal.encryptWithPatternAllowListAndStoreOnWalrus({ message: "hello" }, "my-allowlist");

// Encrypt private data and store chain-side
const keys = seal.createPrivateDataKeys("my-secret-nonce");
const privateDataObjectId = await seal.encryptWithPatternPrivateDataAndStoreOnChain(keys, { secret: "value" });

// Fetch and decrypt
const decrypted = await seal.decryptFromWalrusBlobId({ blobId }, "AllowList");

This SDK handles signing, session keys, and the required transaction calls for you.

## API Highlights

SealClient (high-level; main methods)
- encryptWithPatternAllowListAndStoreOnWalrus(data, allowList?, tag?) → { blobId, blobObject }
- encryptWithPatternAllowListAndReturnBytes(data, allowList?, tag?) → Uint8Array
- createAllowListKey(name) → string
- addAccountsToAllowList(accounts[], allowList?) → Record<string, boolean>
- createPrivateDataKeys(nonce: string) → { keyId: Uint8Array, nonce: Uint8Array }
- encryptWithPatternPrivateDataAndStoreOnChain(computedKeys, data) → privateDataObjectId
- decryptFromPrivateDataObject(privateDataId?, nonce?) → parsed JSON
- decryptFromWalrusBlobId({ blobId }, pattern, keyId?, name?) → parsed JSON

WalrusClient (generated client)
- .user.create(data) → stores a blob
- .user.findById({ blobId }) → fetches blob and returns JSON
- .user.delete(deleteOptions) → deletes a blob

Runtime helpers
- storeBlob / fetchBlob / deleteBlob — wrap the Walrus SDK and implement a dev-friendly fallback that writes metadata locally.

## CLI

This project includes a CLI at client/src/cli with commands:
- walrusdb generate — parse schema.walrus → generate client
- walrusdb initialize --alias <name> — create and store a key alias
- walrusdb use <alias> — set active alias
- walrusdb active-key — print active key
- walrusdb keys — list known keys

Usage example:
npx walrusdb generate
npx walrusdb initialize --alias dev
npx walrusdb use dev

## Development notes

- Replace or extend the simple local Walrus client in src/runtime/walrus-client.ts with production endpoints or SDK configuration.
- The Seal client initialization assumes server object IDs and a PACKAGE_ID constant — configure these as required for your deployment.
- Many functions return raw Uint8Array bytes; the SDK converts them to/from JSON when returning application data.

## Troubleshooting

- "No access to decryption keys": ensure the signer/key used has the required allowlist or private-data capability and that the session key was properly signed.
- Blob upload issues: check network settings and Walrus upload-relay config. The local helper retries on known retryable errors.

## Contributing

- Open issues for bugs or feature requests.
- Send PRs with tests and concise descriptions.
- Keep changes minimal and document API updates in this README.

## License

MIT
