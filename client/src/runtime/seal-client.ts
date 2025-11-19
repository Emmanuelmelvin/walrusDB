import { EncryptedObject, NoAccessError, SealClient, SessionKey } from "@mysten/seal";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { serverObjectIds } from "../constants/move";
import { WalrusActiveNetwork, SealPatterns, SubscriptionOptions } from "../@types/param";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID } from "../constants/move";
import { Key } from "../core/keyPair";
import { WalrusDBConfigError, WalrusDBNoAccessError, WalrusDBSealError, WalrusDBTransactionError } from "../cli/utils/error";
import { fromHex, toHex } from "@mysten/bcs";
import { getAllowListObjectId } from "./allowlist/cap";
import { getPrivateDataObject } from "./privateData/get";

/**
 * Create and configure a SealClient instance backed by a given Sui client.
 *
 * @param suiClient - SuiClient instance used by Seal client runtime
 * @returns SealClient
 */
const initiateSealClient = (suiClient: SuiClient): SealClient => {
  const client = new SealClient({
    suiClient,
    serverConfigs: serverObjectIds.map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false,
  });
  return client;
};

/**
 * Encrypt data using a Seal pattern and return encrypted bytes and backup key.
 *
 * @param network - network string
 * @param key - local Key containing secret
 * @param data - arbitrary JSON-serializable data
 * @param pattern - Seal pattern ("AllowList" | "Private Data" | ...)
 * @param tag - optional tag, used for allowlist name or nonce
 * @param keyId - optional id override
 * @returns { encryptedBytes: Uint8Array, decodedKkey: string }
 */
export async function encrypt(
  network: WalrusActiveNetwork["network"],
  key: Key,
  data: any,
  pattern: SealPatterns,
  tag?: string | Uint8Array,
  keyId?: string
): Promise<{ encryptedBytes: Uint8Array; decodedKkey: string }> {
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const signer = Ed25519Keypair.fromSecretKey(key.secret);
  const suiClient = new SuiClient({ url: getFullnodeUrl(network) });
  const client = initiateSealClient(suiClient);

  let id: string;
  if (keyId) {
    id = keyId;
  } else {
    switch (pattern) {
      case "AllowList":
        id = await getAllowListObjectId(suiClient, signer, tag as string);
        break;
      case "Private Data":
        if (!tag || typeof tag === "string") {
          throw new WalrusDBConfigError("Invalid nonce")
        }
        id = toHex(tag)
        break;
      default:
        throw new WalrusDBSealError("Invalid Seal Option");
    }
  }

  const { encryptedObject: encryptedBytes, key: backupKey } = await client.encrypt({
    threshold: 2,
    packageId: PACKAGE_ID,
    id,
    data: encoded,
  });

  const decodedKkey = new TextDecoder().decode(backupKey);
  return { encryptedBytes, decodedKkey };
}

/**
 * Decrypt previously sealed bytes using Seal client. If sessionKey is not provided,
 * a temporary session is created and signed with the provided secret.
 *
 * @param network - network string
 * @param encryptedBytes - bytes returned by SealClient.encrypt
 * @param key - local Key used to sign session
 * @param sessionKey - optional existing SessionKey (will be reused and returned)
 * @returns { decryptedBytes: Uint8Array, sessionKey: SessionKey }
 */
export async function decrypt(
  pattern: SealPatterns,
  network: WalrusActiveNetwork["network"],
  encryptedBytes: Uint8Array,
  key: Key,
  sessionKey?: SessionKey,
  keyId?: string | SubscriptionOptions,
  name?: string  | Uint8Array
): Promise<{ decryptedBytes: Uint8Array; sessionKey: SessionKey }> {
  const suiClient = new SuiClient({ url: getFullnodeUrl(network) });
  const client = initiateSealClient(suiClient);

  if (!sessionKey) {
    sessionKey = await SessionKey.create({
      address: Ed25519Keypair.fromSecretKey(key.secret).getPublicKey().toSuiAddress(),
      packageId: PACKAGE_ID,
      ttlMin: 10,
      suiClient,
    });
    const message = sessionKey.getPersonalMessage();
    const { signature } = await Ed25519Keypair.fromSecretKey(key.secret).signPersonalMessage(message);
    sessionKey.setPersonalMessageSignature(signature);
  }

  // Ensure we have access to keys by performing a seal_approve call via tx (original flow)
  let bytes: Uint8Array;

  if (encryptedBytes instanceof Uint8Array) {
    bytes = encryptedBytes;
  } else if (typeof encryptedBytes === "object") {
    // if it's an Array or ArrayBuffer
    bytes = Uint8Array.from(encryptedBytes)
  } else if (typeof encryptedBytes === "string") {
    // if it's a hex string
    bytes = fromHex(encryptedBytes);
  } else {
    throw new Error("Unsupported encryptedBytes type");
  }
  
  const id = EncryptedObject.parse(bytes).id
  const tx = new Transaction();
  if (!keyId) {
    switch (pattern) {
      case "AllowList":
        if(typeof  name != "string"){
          throw new WalrusDBConfigError("Name must be a string for pattern AllowList");
        }
        keyId = await getAllowListObjectId(suiClient, Ed25519Keypair.fromSecretKey(key.secret), name);
        break;
      case "Private Data":
        if (!name || typeof name == "string") {
          throw new WalrusDBConfigError("Attach nonce used to create Private Data in the name parameter")
        }
        const data = await getPrivateDataObject(suiClient, Ed25519Keypair.fromSecretKey(key.secret), name);
        keyId = data?.id
      default:
        break;
    }
  }
  switch (pattern) {
    case "AllowList":
      tx.moveCall({
        target: `${PACKAGE_ID}::allowlist::seal_approve`,
        arguments: [tx.pure.vector("u8", Array.from(fromHex(id))), tx.object(keyId as string)],
      });
      break;
    case "Subscription":
      tx.moveCall({
        target: `${PACKAGE_ID}::subscription::seal_approve`,
        arguments: [
          tx.pure.vector("u8", Array.from(fromHex(id))), 
          tx.object((keyId as SubscriptionOptions).subscriptionObjectId), 
          tx.object((keyId as SubscriptionOptions).serviceObjectId),
          tx.object("0x6")
        ],
      })
      break;
    case "Private Data":
      try{
        tx.moveCall({
          target: `${PACKAGE_ID}::private_data::seal_approve`,
          arguments: [tx.pure.vector("u8", Array.from(fromHex(id))), tx.object(keyId as string)]
        })

      }catch(error: any){
        throw new WalrusDBTransactionError("Unable to build transaction block", error)
      }
      break;
    default:
      break;
  }

  const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });

  try {
    await client.fetchKeys({ ids: [id], txBytes, sessionKey, threshold: 2 });
  } catch (err: any) {
    const errorMsg = err instanceof NoAccessError ? "No access to decryption keys" : "Unable to decrypt files, try again";
    throw new WalrusDBNoAccessError(errorMsg, err);
  }

  const decryptedBytes = await client.decrypt({
    data: bytes,
    sessionKey,
    txBytes,
  });

  return { decryptedBytes, sessionKey };
}


