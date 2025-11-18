import { SessionKey } from "@mysten/seal";
import { decrypt, encrypt } from "../runtime/seal-client";
import { fetchBlob, storeBlob, } from "../runtime/walrus-client";
import { KeyPair } from "./keyPair";
import { ReadOptions, WalrusClientFields, AllowlistCap, SealPatterns, SubscriptionOptions, CreateServiceOptions, GetServiceKeyOption, Service, CreateSubscriptionOptions } from "../@types/param";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { WalrusError } from "../cli/utils/error";
import { KeyPairsBuffer } from "../@types/return";
import { helperCreateAllowList } from "../runtime/allowlist/create";
import { getAllowListByName } from "../runtime/allowlist/cap";
import { accountToAllowList as allow } from "../runtime/allowlist/membership";
import { computeKeyId } from "../runtime/privateData/create";
import { storeByteInPrivateDataObject } from "../runtime/privateData/store";
import { getPrivateDataObjectData } from "../runtime/privateData/get";
import { create as createServiceKey, createSubscriptionForService } from "../runtime/subscription/create";
import { getServiceObjectFromNameHelper, getSubscriptionForService } from "../runtime/subscription/get";

/**
 * SealClient manages encryption, allowlists, and blob storage on Walrus.
 *
 */
export class SealClient implements WalrusClientFields {
  network!: "testnet" | "devnet" | "mainnet";
  keyPair!: KeyPair;
  sessionKey!: SessionKey;

  // --------------------------
  // Private helpers (single-responsibility)
  // --------------------------

  /**
   * Extracts { options, payload } from a data object.
   * If `options` is not present this returns `options` as undefined and `payload` as original minus options.
   * @param data Any object that may include an `options` field.
   */
  private _extract<T>(data: T): { options?: any; payload: any } {
    const { options, ...payload } = (data as any) ?? {};
    return { options, payload };
  }

  /**
   * Wrapper around the core `encrypt` call to centralize arguments and session handling.
   * Returns whatever `encrypt` returns (commonly { encryptedBytes, ... }).
   * @param pattern Seal pattern string (AllowList | "Private Data" | etc.)
   * @param payload The data payload to encrypt (plain JS object)
   * @param extraArgs Additional args forwarded to encrypt (tag, allowList, keyId, etc.)
   */
  private async _encrypt(pattern: SealPatterns, payload: any, ...extraArgs: any[]) {
    return encrypt(this.network, this.keyPair.getKey(), payload, pattern, ...extraArgs);
  }

  /**
   * Wrapper around the core `decrypt` call. Updates this.sessionKey with returned sessionKey.
   * Returns the raw decrypted bytes (Uint8Array) and sessionKey in object shape identical to decrypt.
   * Note: callers normally transform bytes to JSON.
   */
  private async _decrypt(pattern: SealPatterns, buffer: Uint8Array, ...extraArgs: any[]) {
    const result = await decrypt(pattern, this.network, buffer, this.keyPair.getKey(), this.sessionKey, ...extraArgs);
    // keep session key in sync with prior behavior
    if (result?.sessionKey) this.sessionKey = result.sessionKey;
    return result;
  }

  /**
   * Wrapper around storeBlob to keep param order consistent.
   * Returns whatever storeBlob returns (commonly { blobId, blobObject }).
   */
  private async _storeBlob(data: any) {
    return storeBlob(data, "", this.network, this.keyPair.getKey());
  }

  /**
   * Convert a plain JS object containing numeric values (as stored in JSON) to a Uint8Array.
   * This preserves the original behavior where encrypted bytes were stored in Walrus as a plain object.
   * @param obj The object representation of bytes (e.g. { "0": 12, "1": 255, ... } or an object with numeric values)
   */
  private _objectToUint8Array(obj: any): Uint8Array {
    // If obj is already a Uint8Array return it
    if (obj instanceof Uint8Array) return obj;
    // If obj is an array-like (Array<number>) convert directly
    if (Array.isArray(obj)) return Uint8Array.from(obj as number[]);
    // If obj is a Buffer-like or plain object with numeric properties, take Object.values
    return Uint8Array.from(Object.values(obj as Record<string, number>));
  }

  // --------------------------
  // Public API (preserved names & behaviors)
  // --------------------------

  /**
   * Encrypts data using AllowList pattern and stores it on Walrus.
   * @param data The data to encrypt.
   * @param allowList Optional allowlist name.
   * @param tag Optional tag for identifying the data.
   * @returns Blob ID and stored object.
   */
  async encryptWithPatternAllowListAndStoreOnWalrus<T>(
    data: T,
    allowList?: string,
    tag?: string
  ): Promise<{ blobId: string; blobObject: Object }> {
    const { options, payload } = this._extract(data);
    const { encryptedBytes } = await this._encrypt("AllowList", payload, tag, allowList);
    const dataToStore = { encryptedBytes, options };
    const { blobId, blobObject } = await this._storeBlob(dataToStore);
    return { blobId, blobObject };
  }

  /**
   * Encrypts data using AllowList pattern and returns the encrypted bytes.
   * @param data Data to encrypt with storage and encryption options
   * @param allowList Optional allowlist name (A default allowlist will be created if not specified)
   * @param tag Optional tag for the data.
   * @returns Encrypted bytes.
   */
  async encryptWithPatternAllowListAndReturnBytes<T>(
    data: T,
    allowList?: string,
    tag?: string
  ): Promise<Uint8Array> {
    const { payload } = this._extract(data);
    const { encryptedBytes } = await this._encrypt("AllowList", payload, tag, allowList);
    return encryptedBytes;
  }

  /**
   * Creates a new AllowList object to encrypt with Seal.
   * @param name Name of the allowlist.
   * @returns The allowlist object ID (shared object).
   */
  async createAllowListKey(name: string): Promise<string> {
    return helperCreateAllowList(this.network, this.keyPair.getKey(), name);
  }

  /**
   * Fetches the AllowList object with the provided name tag and its capability.
   * @param name Name of the allowlist.
   * @returns Object containing capability and allowlist or null.
   */
  async getAllowListKeyObject(name: string): Promise<{ cap: AllowlistCap; allowList: any } | null> {
    return getAllowListByName(this.network, this.keyPair.getKey(), name);
  }

  /**
   * Adds multiple accounts to an AllowList.
   * @param accounts Array of account addresses.
   * @param allowList Optional allowlist name.
   * @returns Object mapping accounts to status (true=success, false=failure).
   */
  async addAccountsToAllowList(
    accounts: string[],
    allowList?: string
  ): Promise<Record<string, boolean>> {
    return this.modifyAllowListAccounts(accounts, "add", allowList);
  }

  /**
   * Removes multiple accounts from an AllowList.
   * @param accounts Array of account addresses.
   * @param allowList Optional allowlist name.
   * @returns Object mapping accounts to status.
   */
  async removeAccountFromAllowList(
    accounts: string[],
    allowList?: string
  ): Promise<Record<string, boolean>> {
    return this.modifyAllowListAccounts(accounts, "remove", allowList);
  }

  /**
   * Internal helper to add/remove accounts from an allowlist to remove repetition.
   * Preserves behavior of original methods by calling the `allow` runtime function.
   */
  private async modifyAllowListAccounts(accounts: string[], action: "add" | "remove", allowList?: string) {
    const response: Record<string, boolean> = {};
    for (const account of accounts) {
      try {
        // The original code awaited allow(...) and stored the returned "status" as-is.
        const status: any = await allow(this.network, account, this.keyPair.getKey(), action, allowList);
        response[account] = status;
      } catch {
        response[account] = false;
      }
    }
    return response;
  }

  /**
   * @param nonce A phrase used to generate a nonce and key ID for private data encryption pattern
   * @return Returns the nonce and the computed key ID
   */
  createPrivateDataKeys(
    nonce: string
  ): { keyId: Uint8Array, nonce: Uint8Array } {
    return computeKeyId(nonce, Ed25519Keypair.fromSecretKey(this.keyPair.getKey().secret));
  }

  /**
   * Encrypts data using the private data encryption pattern and stores the result on-chain (private data object).
   * @param computedKeys Received the computed key object and encrypts data using the private data encryption pattern
   * @param data Data to encrypt
   * @returns Returns the ID of the private data object (whatever storeByteInPrivateDataObject returns)
   */
  async encryptWithPatternPrivateDataAndStoreOnChain<T>(computedKeys: KeyPairsBuffer, data: T) {
    const { payload } = this._extract(data);
    const { encryptedBytes } = await this._encrypt("Private Data", payload, undefined, computedKeys.keyId);
    return (await storeByteInPrivateDataObject(this.network, this.keyPair.getKey(), encryptedBytes, computedKeys.nonce));
  }

  /**
   * Encrypts data using the private data encryption pattern and returns the encrypted bytes.
   * NOTE: Preserves original behavior which called storeByteInPrivateDataObject with an empty Uint8Array.
   * @param computedKeys Received the computed key object and encrypts data using the private data encryption pattern
   * @param data Data to encrypt
   * @returns Returns the bytes of the encrypted data.
   */
  async encryptWithPatternPriateDataAndReturnbytes<T>(computedKeys: KeyPairsBuffer, data: T) {
    const { payload } = this._extract(data);
    const { encryptedBytes } = await this._encrypt("Private Data", payload, undefined, computedKeys.keyId);

    // Preserve original side-effect: store empty bytes (odd but kept to avoid changing behavior)
    await storeByteInPrivateDataObject(this.network, this.keyPair.getKey(), Uint8Array.from([]), computedKeys.nonce);

    return encryptedBytes;
  }

  /**
   * Encrypts data using the private data encryption pattern and stores it on Walrus.
   * @param computedKeys Received the computed key object and encrypts data using the private data encryption pattern
   * @param data Data to encrypt
   * @returns Returns the blob object and blob object ID
   */
  async encryptWithPatternPrivateDataAndStoreOnWalrus<T>(computedKeys: KeyPairsBuffer, data: T) {
    const { options, payload } = this._extract(data);
    const { encryptedBytes } = await this._encrypt("Private Data", payload, undefined, computedKeys.keyId);
    const dataToUpload = { encryptedBytes, options };
    return (await this._storeBlob(dataToUpload));
  }
  /**
   * 
   * @param { CreateServiceOptions }options Options to create a service for others to suscribe
   * @returns Service Object ID
   */
  async createServiceKey(options: CreateServiceOptions): Promise<string | undefined> {
    return (await createServiceKey(options, this.network, this.keyPair.getKey()))
  }

  /**
   * 
   * @param name Name used in Service creation
   * @description Helper function to get Service Object ID from name
   * @returns The Service object ID if  it exists. If not, returns null
   */
  async getServiceKeyFromName(name: GetServiceKeyOption): Promise<Service | null> {
    return (await getServiceObjectFromNameHelper(this.network, this.keyPair.getKey(), name.name))
  }

  /**
   * 
   * @param subscription 
   * @returns Returns suscription object ID
   */
  async createSubscription(subscription: CreateSubscriptionOptions){
    return (await createSubscriptionForService(subscription, this.network, this.keyPair.getKey()))
  }

  /**
   * 
   * @param serviceId 
   * @returns Returns subscription for a given service if found
   */
  async getSubcriptionForService(serviceId: string){
    return (await getSubscriptionForService(serviceId, this.network, this.keyPair.getKey()))
  }

  /**
   * 
   * @param keyId Service ID used to encrypt data
   * @param data Data to be encrypted for subscription access only
   * @returns Returns blob ID and blob object
   */
  async encryptWithPatternSubscriptionAndStoreOnWalrus<T>(keyId: string, data: T) {
    const { payload } = this._extract(data);
    const { encryptedBytes } = await this._encrypt("Subscription", payload, undefined, keyId);
    return (await this._storeBlob(encryptedBytes));
  }
    /**
   * 
   * @param keyId Service ID used to encrypt data
   * @param data Data to be encrypted for subscription access only
   * @returns Returns encrypted bytes
   */
  async encryptWithPatternSubscriptionAndReturnytes<T>(keyId: string, data: T) {
    const { payload } = this._extract(data);
    const { encryptedBytes } = await this._encrypt("Subscription", payload, undefined, keyId);
    return encryptedBytes;
  }

  /**
   * @async
   * @param privateDataId Optional field to pass the Private Data on-chain object
   * @param nonce Optional field to attach nonce that was used to compute id used during encryption
   * @description If neither of nonce or privateDataId is passed, the first Private Data object that is found in user account will be assumed to be the the private data oject
   * @returns Returns the encrypted data in parsed JSON format
   */
  async decryptFromPrivateDataObject<T>(privateDataId?: string, nonce?: Uint8Array): Promise<T> {
    const data = await getPrivateDataObjectData(this.network, this.keyPair.getKey(), nonce, privateDataId);
    if (!(data?.data)) {
      throw new WalrusError("Unable to read bytes from PrivateData object");
    }

    const { decryptedBytes } = await this._decrypt("Private Data", data?.data, privateDataId, nonce);
    const decodedJson = new TextDecoder().decode(decryptedBytes);
    return JSON.parse(decodedJson) as T;
  }

  /**
   * Decrypts a buffer using the session key.
   * @param buffer Encrypted buffer to decrypt.
   * @param pattern The pattern used to encrypt the data
   * @param keyId Optional key id that was used to encrypt the data,
   * @returns Decrypted bytes as parsed JSON object.
   */
  async decryptFromBuffer<T>(buffer: Uint8Array, pattern: SealPatterns, keyId?: string | SubscriptionOptions, name?: string | Uint8Array): Promise<T> {
    const { decryptedBytes, sessionKey } = await this._decrypt(pattern, buffer, keyId, name);
    this.sessionKey = sessionKey;
    const decodedJson = new TextDecoder().decode(decryptedBytes);
    return JSON.parse(decodedJson) as T;
  }

  /**
   * Fetches a blob from Walrus by ID and decrypts it.
   * @param blobId Object containing blobId.
   * @param pattern The pattern used to encrypt the data
   * @param keyId Optional key id that was used to encrypt the data,
   * @param name Optional name to get key id
   * @returns Decrypted JSON data.
   */
  async decryptFromWalrusBlobId<T>(blobId: ReadOptions, pattern: SealPatterns, keyId?: string | SubscriptionOptions, name?: string | Uint8Array): Promise<T> {
    const blobFromWalrus = await fetchBlob({ blobId: blobId.blobId }, this.network);
    const parsed = JSON.parse(new TextDecoder().decode(blobFromWalrus));
    const buffer = Uint8Array.from(Object.values(parsed));
    const { decryptedBytes, sessionKey } = await this._decrypt(pattern, buffer, keyId, name);
    this.sessionKey = sessionKey;
    const decodedJson = new TextDecoder().decode(decryptedBytes);
    return JSON.parse(decodedJson) as T;
  }

  // TODO
  async encryptWithPatternTimeLockAndStoreOnWalrus<T>(tag: string, data: T) { }
}
