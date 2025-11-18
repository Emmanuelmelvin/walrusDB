/**
 * @fileoverview
 * Minimal local/mock Walrus client for development.
 *
 * Provides helper functions to:
 *  - Store blobs (`storeBlob`) → uploads to Walrus and writes to `walrus/blobs/<date>.json`
 *  - Fetch blobs (`fetchBlob`) → retrieves stored blob data from Walrus
 *  - Delete blobs (`deleteBlob`) → removes blob from Walrus storage
 *
 * These methods wrap the real Walrus SDK (`@mysten/walrus`) for integration with the Sui blockchain.
 * Replace or extend these with production-level logic as needed.
 */

import fs from "fs/promises";
import path from "path";
import { BLOBS_DIR } from "../core/config";
import { WalrusError } from "../cli/utils/error";
import { Key } from "../core/keyPair";
import { getFullnodeUrl } from "@mysten/sui/client";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import {
  DeleteBlobOptions,
  ReadBlobOptions,
  RetryableWalrusClientError,
  WalrusClient,
  walrus,
} from "@mysten/walrus";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { ClientWithExtensions } from "@mysten/sui/dist/cjs/experimental";
import { Transaction } from "@mysten/sui/transactions";
import { WalrusActiveNetwork } from "../@types/param";

/**
 * Initialize and extend a Sui JSON-RPC client with Walrus support.
 *
 * @param {WalrusActiveNetwork["network"]} network - The active Sui network (e.g., "testnet", "devnet").
 * @returns {ClientWithExtensions<{ walrus: WalrusClient }, SuiJsonRpcClient>} A configured client instance.
 */
const initiateWalrusClient = (
  network: WalrusActiveNetwork["network"]
): ClientWithExtensions<{ walrus: WalrusClient }, SuiJsonRpcClient> => {
  const client = new SuiJsonRpcClient({
    url: getFullnodeUrl(network),
    network,
  }).$extend(
    walrus({
      uploadRelay: {
        host: "https://upload-relay.testnet.walrus.space",
        sendTip: {
          max: 1_000,
        },
      },
    })
  );

  return client;
};

/**
 * Uploads a JSON blob to Walrus and writes its object metadata to local storage(for development).
 *
 * @async
 * @param {any} data - The data to upload, containing both `options` and content fields.
 * @param {string} _url - (Reserved) URL endpoint, currently unused.
 * @param {WalrusActiveNetwork["network"]} network - Network identifier for Sui/Walrus connection.
 * @param {Key} keyPair - The cryptographic keypair used for signing.
 * @returns {Promise<{ blobId: string; blobObject: object }>} The blob ID and Walrus blob object metadata.
 * @throws {WalrusError} If upload fails or Walrus client encounters a non-retryable error.
 *
 * @example
 * ```ts
 * const { blobId } = await storeBlob(
 *   { name: "user-data", options: { deletable: true } },
 *   "",
 *   "testnet",
 *   keyPair
 * );
 * console.log("Uploaded blob:", blobId);
 * ```
 */
export async function storeBlob(
  data: any,
  _url: string,
  network: WalrusActiveNetwork["network"],
  keyPair: Key
): Promise<{ blobId: string; blobObject: object }> {
  const { options, ...dataToUpload } = data;
  const client = initiateWalrusClient(network);
  const fileName = `${new Date().toISOString().split("T")[0]}.json`;

  const fileToUpload = new TextEncoder().encode(JSON.stringify(dataToUpload));

  const upload = () =>
    client.walrus.writeBlob({
      blob: fileToUpload,
      deletable: options?.deletable || true,
      epochs: options?.epochs || 2,
      owner: options?.owner,
      signal: options?.signal,
      attributes: options?.attributes  || null,
      signer: Ed25519Keypair.fromSecretKey(keyPair.secret),
    });

  try {
    const { blobId, blobObject } = await upload().catch(async (error: any) => {
      if (error instanceof RetryableWalrusClientError) {
        client.walrus.reset();
        return upload();
      }
      throw new WalrusError(
        `Unable to upload to Walrus: ${error?.cause?.toString() ?? error.message}`
      );
    });

    await fs.mkdir(BLOBS_DIR, { recursive: true });
    const file = path.join(BLOBS_DIR, fileName);
    await fs.writeFile(file, JSON.stringify(blobObject), "utf8");

    return { blobId, blobObject };
  } catch (error: any) {
    throw new WalrusError(`Blob upload failed: ${error.message}`);
  }
}

/**
 * Fetches a blob’s binary data from Walrus.
 *
 * @async
 * @param {ReadBlobOptions} blob - The blob read options (includes ID, attributes, etc.).
 * @param {WalrusActiveNetwork["network"]} network - Network identifier for Sui/Walrus connection.
 * @returns {Promise<Uint8Array<ArrayBufferLike>>} The raw binary data of the blob.
 * @throws {WalrusError} If fetching the blob fails.
 */
export async function fetchBlob(
  blob: ReadBlobOptions,
  network: WalrusActiveNetwork["network"]
): Promise<Uint8Array<ArrayBufferLike>> {
  const client = initiateWalrusClient(network);
  try {
    const data = await client.walrus.readBlob(blob);
    return data;
  } catch (error: any) {
    throw new WalrusError("Failed to fetch blob from walrus", error);
  }
}

/**
 * Deletes a blob from Walrus storage.
 *
 * @async
 * @param {DeleteBlobOptions} blobObject - The blob metadata required for deletion.
 * @param {WalrusActiveNetwork["network"]} network - Network identifier for Sui/Walrus connection.
 * @param {Key} key - The signing key for the transaction.
 * @returns {Promise<boolean>} Returns `true` if the deletion succeeded, otherwise `false`.
 * @throws {WalrusError} If deletion transaction fails.
 */
export async function deleteBlob(
  blobObject: DeleteBlobOptions,
  network: WalrusActiveNetwork["network"],
  key: Key
): Promise<boolean> {
  const signer = Ed25519Keypair.fromSecretKey(key.secret);
  const client = initiateWalrusClient(network);

  try {
    const storage = client.walrus.deleteBlob(blobObject);
    const tx = new Transaction();
    tx.transferObjects([storage], signer.getPublicKey().toSuiAddress());

    const result = await client.signAndExecuteTransaction({
      signer,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    return result?.effects?.status?.status === "success";
  } catch (error: any) {
    throw new WalrusError(`Failed to delete blob: ${error.message}`);
  }
}
