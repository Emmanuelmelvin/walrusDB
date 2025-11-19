# Introduction to Seal Encryption Methods in WalrusDB

The `SealClient` class in WalrusDB provides a set of utilities to encrypt, decrypt, and store data using various encryption patterns powered by [Seal](https://www.mystenlabs.com/seal). This guide introduces the main encryption methods, their purposes, and how to use them.

---

## Overview

`SealClient` manages:

- **AllowList encryption**: Encrypts data for a specific group of users.
- **Private Data encryption**: Encrypts sensitive data tied to a user or session.
- **Subscription encryption**: Encrypts data accessible only to subscribers of a service.
- **TimeLock encryption** *(coming soon)*: Encrypts data that can only be decrypted after a certain time.
- **Blob storage on Walrus**: Stores encrypted data off-chain with optional retrieval and decryption.

The client handles session keys, key management, and integration with Walrus blob storage.

---

## Core Methods

### 1. AllowList Encryption

Allows encryption of data for a specific allowlist.

#### Encrypt and store on Walrus

```ts
const { blobId, blobObject } = await sealClient.encryptWithPatternAllowListAndStoreOnWalrus(data, allowListName, tag);
````

* **data**: Object to encrypt.
* **allowListName**: Optional allowlist.
* **tag**: Optional tag to identify the data.
* **Returns**: `blobId` and stored object.

#### Encrypt and return bytes

```ts
const encryptedBytes = await sealClient.encryptWithPatternAllowListAndReturnBytes(data, allowListName, tag);
```

#### AllowList management

* **Create a new AllowList**

```ts
const allowListId = await sealClient.createAllowListKey("example-list");
```

* **Add accounts**

```ts
await sealClient.addAccountsToAllowList(["account1", "account2"], "example-list");
```

* **Remove accounts**

```ts
await sealClient.removeAccountFromAllowList(["account1"], "example-list");
```

---

### 2. Private Data Encryption

Used to encrypt sensitive information tied to a user or session.

#### Generate private data keys

```ts
const computedKeys = sealClient.createPrivateDataKeys("unique-nonce");
```

* Returns a `keyId` and `nonce` for encryption.

#### Encrypt and store on-chain

```ts
const privateDataId = await sealClient.encryptWithPatternPrivateDataAndStoreOnChain(computedKeys, data);
```

#### Encrypt and return bytes

```ts
const encryptedBytes = await sealClient.encryptWithPatternPriateDataAndReturnbytes(computedKeys, data);
```

#### Encrypt and store on Walrus

```ts
const { blobId, blobObject } = await sealClient.encryptWithPatternPrivateDataAndStoreOnWalrus(computedKeys, data);
```

#### Decrypt from private data object

```ts
const decryptedData = await sealClient.decryptFromPrivateDataObject(privateDataId, computedKeys.nonce);
```

---

### 3. Subscription Encryption

Encrypts data accessible only to subscribers of a service.

#### Encrypt and store on Walrus

```ts
const { blobId, blobObject } = await sealClient.encryptWithPatternSubscriptionAndStoreOnWalrus(serviceKeyId, data);
```

#### Encrypt and return bytes

```ts
const encryptedBytes = await sealClient.encryptWithPatternSubscriptionAndReturnytes(serviceKeyId, data);
```

---

### 4. Service & Subscription Helpers

* **Create a service**

```ts
const serviceId = await sealClient.createServiceKey({ name: "MyService" });
```

* **Get service by name**

```ts
const service = await sealClient.getServiceKeyFromName({ name: "MyService" });
```

* **Create subscription**

```ts
const subscriptionId = await sealClient.createSubscription({ serviceId, accounts });
```

* **Get subscription for a service**

```ts
const subscription = await sealClient.getSubcriptionForService(serviceId);
```

---

## Notes

* `SealClient` maintains a session key for performance and security.
* All encryption patterns (`AllowList`, `Private Data`, `Subscription`) are interoperable with Walrus blob storage.
* This client abstracts away cryptography and session management, enabling easy integration into your applications.

---

This concludes the basic introduction to `SealClient` encryption methods.

```