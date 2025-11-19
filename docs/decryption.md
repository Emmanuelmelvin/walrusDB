# SealClient Decryption Methods in WalrusDB

The `SealClient` class provides several methods to decrypt data encrypted using different Seal patterns. This guide focuses exclusively on the decryption functionalities.

---

## 1. Decrypt from Private Data Object

Decrypts data stored as a Private Data object on-chain.

```ts
const decryptedData = await sealClient.decryptFromPrivateDataObject<T>(privateDataId?, nonce?);
````

* **privateDataId** (optional): The ID of the private data object on-chain.
* **nonce** (optional): The nonce used to generate the private data key.
* **Returns**: The decrypted data parsed as JSON (`T`).
* **Throws**: `WalrusDBSealError` if unable to read the bytes.

---

## 2. Decrypt from Buffer

Decrypts a raw buffer using the session key and the specified encryption pattern.

```ts
const decryptedData = await sealClient.decryptFromBuffer<T>(buffer, pattern, keyId?, name?);
```

* **buffer**: `Uint8Array` containing encrypted bytes.
* **pattern**: `SealPatterns` used to encrypt the data (`"AllowList" | "Private Data" | "Subscription"`).
* **keyId** (optional): The key or subscription ID used for encryption.
* **name** (optional): A string or `Uint8Array` to retrieve a key ID.
* **Returns**: The decrypted data parsed as JSON (`T`).

---

## 3. Decrypt from Walrus Blob ID

Fetches a blob from Walrus and decrypts it according to the encryption pattern.

```ts
const decryptedData = await sealClient.decryptFromWalrusBlobId<T>(
  { blobId },
  pattern,
  keyId?,
  name?
);
```

* **blobId**: Object containing the Walrus blob ID (`{ blobId: string }`).
* **pattern**: `SealPatterns` used for encryption (`"AllowList" | "Private Data" | "Subscription"`).
* **keyId** (optional): The key or subscription ID used during encryption.
* **name** (optional): Name or `Uint8Array` used to derive the key.
* **Returns**: The decrypted JSON data (`T`).

---

## Notes

* All decryption methods automatically handle session keys.
* The decrypted bytes are converted to JSON using a `TextDecoder` for easy usage in applications.
* Supports decryption of data encrypted via **AllowList**, **Private Data**, or **Subscription** patterns.

---

This concludes the overview of decryption methods in `SealClient`.

```