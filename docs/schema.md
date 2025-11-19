# WalrusDB — Predefined Schema & CLI Documentation

WalrusDB introduces a **predefined schema system** that makes it easy for developers to store and retrieve structured data on **Walrus**.  
Instead of manually uploading blobs and handling encryption patterns, you define your data in a simple `.walrus` schema file, and WalrusDB generates a fully typed client you can use in your application.

This system works like Prisma or TypeORM, but it is designed specifically for encrypted blob storage and Seal-based encryption patterns.

---

# 📦 Predefined Schema

The schema format (`schema.walrus`) lets you define:

- **Models** (similar to database tables)
- **Fields**
- **Data types** (string, number, boolean, bytes, json, datetime)
- **Walrus storage rules**

Example:

```walrus
model User {
  id         string   @id
  name       string
  email      string
}
````

Once created, run the generator:

```bash
npx walrusdb generate
```

for now, use npm link as the package is not yet live on npmjs. So from the example folder run
```bash
npx tsx ../client/src/cli/index.ts generate
```

WalrusDB will automatically:

* Parse `schema.walrus`
* Create a JSON version (`schema.json`)
* Generate a typed client (`client.ts`)
* Provide helper methods like:

```ts
client.user.create()
client.user.findById()
client.user.delete()
```

This ensures that all stored objects follow a predictable, type-safe structure.

---

# 🔧 WalrusDB CLI

The WalrusDB CLI is built to handle:

* Schema generation
* Local key initialization
* Switching between aliases
* Viewing active keys
* Listing key configurations

---

# 🛠️ CLI Commands & What They Do

### ✔ Generate schema → client

```bash
npx walrusdb generate
```

Creates:

* `schema.json`
* `client.ts`
* Typed model helpers
  This connects your schema directly to Walrus storage.

---

### ✔ Initialize a key alias

```bash
npx walrusdb initialize --alias dev
```

Creates a local keypair used for signing and encryption.

---

### ✔ Switch active alias

```bash
npx walrusdb use dev
```

---

### ✔ See active key

```bash
npx walrusdb active-key
```

---

### ✔ List all keys

```bash
npx walrusdb keys
```

---

# 📘 Why the Schema Matters

Using a predefined schema gives you:

* Predictable data structures
* Auto-generated clients
* Simpler encryption + storage logic
* Type-safety
* Zero manual blob management
* A smoother experience for both Web2 and Web3 developers

This system allows developers to take full advantage of Walrus and Seal **without needing to learn cryptography or Sui object systems**.

---

# ✅ Summary

WalrusDB turns complex encrypted storage into a simple, schema-based workflow:

1. Write a `.walrus` schema
2. Generate a typed client
3. Use clean, high-level APIs
4. Automatically store structured, encrypted data on Walrus

Developers can integrate this into backend, frontend, or cloud projects with almost no setup.

WalrusDB makes secure, encrypted, verifiable storage **easy for everyone**.
