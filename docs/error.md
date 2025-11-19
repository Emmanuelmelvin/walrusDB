# WalrusDB Common Errors

WalrusDB provides a set of custom error classes to help developers identify and handle different types of issues when using the SDK. All errors extend the base class `WalrusDBError` and may include optional `cause` and `metadata`.

---

## Base Error

### `WalrusDBError`
- **Description:** Base custom error class for all WalrusDB-related errors.  
- **Properties:**
  - `message` (string): Error message.
  - `cause` (optional, Error): Underlying error.
  - `metadata` (optional, Record<string, any>): Additional context.
- **Usage:**
```ts
throw new WalrusDBError("Something went wrong", originalError, { userId: "123" });
````

---

## Specific Error Variants

### 1. `WalrusDBClientError`

* **Description:** Errors related to the client SDK usage or misconfiguration.
* **Example:**

```ts
throw new WalrusDBClientError("Invalid client operation");
```

---

### 2. `WalrusDBSealError`

* **Description:** Errors occurring during encryption/decryption using Seal.
* **Example:**

```ts
throw new WalrusDBSealError("Unable to decrypt data");
```

---

### 3. `WalrusDBValidationError`

* **Description:** Errors caused by invalid input or failing validation rules.
* **Example:**

```ts
throw new WalrusDBValidationError("Invalid user data format");
```

---

### 4. `WalrusDBNotFoundError`

* **Description:** Errors when a requested resource (blob, key, object) is not found.
* **Example:**

```ts
throw new WalrusDBNotFoundError("Private data object not found");
```

---

### 5. `WalrusDBNoAccessError`

* **Description:** Errors when attempting to access a resource without proper permissions.
* **Example:**

```ts
throw new WalrusDBNoAccessError("User does not have access to this allowlist");
```

---

### 6. `WalrusDBRetryableError`

* **Description:** Temporary errors that may succeed if retried.
* **Example:**

```ts
throw new WalrusDBRetryableError("Network timeout, please retry");
```

---

### 7. `WalrusDBTransactionError`

* **Description:** Errors occurring during on-chain transactions or multi-step operations.
* **Example:**

```ts
throw new WalrusDBTransactionError("Transaction failed to commit");
```

---

### 8. `WalrusDBConfigError`

* **Description:** Errors caused by misconfiguration or missing environment variables.
* **Example:**

```ts
throw new WalrusDBConfigError("Missing WALRUS_SECRET environment variable");
```

---

## Notes

* All errors extend `WalrusDBError`, so you can catch them generically:

```ts
try {
  // Some operation
} catch (err) {
  if (err instanceof WalrusDBError) {
    console.error("WalrusDB error:", err.message, err.metadata);
  }
}
```

* Use the `metadata` property to provide context like `blobId`, `keyId`, or `subscriptionId` for easier debugging.

---

This error hierarchy helps you **identify, categorize, and handle errors** effectively in your WalrusDB integrations.
