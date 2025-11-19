
# Getting Started with WalrusDB and SealClient

This guide demonstrates how to use `WalrusClient` and `SealClient` to manage encrypted data, subscriptions, and private data in WalrusDB.

---

## 1. Setup

Install dependencies and configure environment variables:

```ts
import { User, WalrusClient } from "./walrus/client";
import { KeyPair } from "walrusdb/src/core/keyPair";
import { SealClient } from "walrusdb/src/core/seal";
import dotenv from 'dotenv';  

dotenv.config();
````

Create a `KeyPair` from a secret and extend `WalrusClient` with `SealClient`:

```ts
const keyPair = new KeyPair({ secret: process.env.secret as string });
const walrusClient = new WalrusClient(keyPair).$extend(SealClient);
```

---

## 2. Working with Services & Subscriptions

### Get or create a service key

```ts
// Fetch service key by name
const keyId = await walrusClient.getServiceKeyFromName({ name: "SuscriptionKey" });
if (!keyId) return;
```

### Get or create a subscription for the service

```ts
const subscription = await walrusClient.getSubcriptionForService(keyId.id.id);
if (!subscription) return;

console.log("Subscription object ID:", subscription);
```

---

## 3. Encrypting Data for Subscription Access

Encrypt user data and store it in Walrus:

```ts
const blob = await walrusClient.encryptWithPatternSubscriptionAndStoreOnWalrus<User>(
  keyId.id.id, 
  { id: "user123", email: "emma@chidi.com" }
);

console.log("Blob stored with ID:", blob.blobId);
```

---

## 4. Decrypting Data from a Walrus Blob

Fetch and decrypt data from a Walrus blob:

```ts
const result = await walrusClient.decryptFromWalrusBlobId<User>(
  { blobId: "OmYrSA1xi1FjgkmZOmUcK6rE8j2KzfVFgPgDF_GLZVA" },
  "Subscription",
  { serviceObjectId: keyId.id.id, subscriptionObjectId: subscription }
);

console.log("Decrypted data:", result);
```

---

## 5. Private Data Encryption / Decryption

### Generate keys for private data

```ts
const computedKeys = walrusClient.createPrivateDataKeys("unique-nonce");
```

### Encrypt and store private data on-chain

```ts
const privateDataId = await walrusClient.encryptWithPatternPrivateDataAndStoreOnChain<User>(
  computedKeys,
  { id: "user123", email: "emma@chidi.com" }
);
```

### Decrypt private data

```ts
const decryptedData = await walrusClient.decryptFromPrivateDataObject<User>(
  privateDataId,
  computedKeys.nonce
);

console.log("Decrypted private data:", decryptedData);
```

---

## 6. Notes

* `WalrusClient` combined with `SealClient` abstracts encryption, decryption, session management, and blob storage.
* You can use `AllowList`, `Private Data`, or `Subscription` patterns for encrypting different types of data.
* All decryption functions automatically parse bytes into JSON objects.

---

This is a basic example to get started with WalrusDB and Seal encryption patterns.

