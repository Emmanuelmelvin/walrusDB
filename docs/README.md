# WalrusDB SDK

WalrusDB is a high-level SDK that makes it easy for developers to use **Seal encryption** and **Walrus storage** without dealing with cryptography, key management, or complex blockchain logic.

It is designed to feel familiar to everyday developers while still enabling advanced, secure data workflows.

---

## What WalrusDB Does

WalrusDB combines two powerful systems and exposes them as **simple, safe, developer-friendly functions**:

### **1. Walrus — Verifiable Blob Storage**
Walrus provides off-chain, verifiable storage for blobs and files.  
WalrusDB wraps this into clean functions to store, read, and delete encrypted blobs without requiring any storage configuration.

### **2. Seal — Encryption With Access Control**
Seal enables advanced encryption patterns such as:
- **AllowList** (encrypt for specific accounts)
- **Private Data** (user-linked encryption with a nonce)
- **Subscription-based** encryption (service/subscription access patterns)
- **Time Lock** encryption

WalrusDB exposes these patterns through easy APIs so you can encrypt and decrypt data without manually constructing keys or dealing with low-level Seal logic.

---

## Why WalrusDB?

WalrusDB’s goal is to make modern, cryptographically secure data storage **accessible to all developers**:

- No need to handle raw keys or signatures  
- No need to learn Sui transactions or object layouts  
- No need to understand Seal internals  
- No need to know how Walrus stores blobs  

You simply call high-level functions. WalrusDB takes care of signing, key setup, pattern selection, and connecting Seal + Walrus under the hood.

---

## Key Capabilities

- **High-level encryption helpers**
  - AllowList encryption  
  - Private Data encryption  
  - Subscription encryption  
  - With options to store the encrypted result or return encrypted bytes

- **Blob storage**
  - Upload encrypted blobs to Walrus  
  - Fetch and automatically decrypt them  
  - Delete stored blobs when needed

- **Automatic key management**
  - Generates, loads, and manages keypairs  
  - Handles session signing  
  - Computes key IDs and nonces safely

- **Developer-first workflow**
  - Simple APIs for all encryption tasks  
  - Easy debugging with local helpers  
  - Optional CLI for generating clients and managing keys

---

## What You Can Build

WalrusDB makes it easy to integrate secure data flows into any application:

- Secure note or file storage  
- Encrypted messages or private user data  
- Role- or account-restricted content  
- Subscription-locked assets  
- Multi-user apps requiring safe data sharing  

All without needing to understand low-level cryptography, blockchain objects, or Seal patterns.

---

## Summary

WalrusDB is a **bridge** between advanced secure storage technologies (Seal + Walrus) and everyday application developers.  
It hides the complexity and gives you **clear, simple, high-level functions** to protect data, control access, and store encrypted content.

If you want modern, decentralized, verifiable, encrypted storage without the headaches — WalrusDB is built for you.
