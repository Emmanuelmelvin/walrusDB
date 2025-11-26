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

import { WalrusDBError } from "../cli/utils/error";
import {
  DeleteBlobOptions,
  ReadBlobOptions,
  RetryableWalrusClientError,
} from "@mysten/walrus";
import { Transaction } from "@mysten/sui/transactions";
import { PatternConfig } from "./base";

export class WalrusCore extends PatternConfig {
  
  /**
 * Uploads a JSON blob to Walrus and writes its object metadata to local storage(for development).
 *
 * @async
 * @param {any} data - The data to upload, containing both `options` and content fields.
 * @param {string} _url - (Reserved) URL endpoint, currently unused.
 * @param {Key} this.keyPair - The cryptographic keypair used for signing.
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
 * ``
 */

  protected async storeBlob(
    data: any,
    _url: string,
  ): Promise<{ blobId: string; blobObject: object }> {
    const { options, ...dataToUpload } = data;

    const fileToUpload = new TextEncoder().encode(JSON.stringify(dataToUpload));

    const upload = () =>
      this.suiJsonRpcClient.walrus.writeBlob({
        blob: fileToUpload,
        deletable: options?.deletable || true,
        epochs: options?.epochs || 2,
        owner: options?.owner,
        signal: options?.signal,
        attributes: options?.attributes || null,
        signer: this.keyPair,
      });

    try {
      const { blobId, blobObject } = await upload().catch(async (error: any) => {
        if (error instanceof RetryableWalrusClientError) {
          this.suiJsonRpcClient.walrus.reset();
          return upload();
        }
        throw new WalrusDBError(
          `Unable to upload to Walrus: ${error?.cause?.toString() ?? error.message}`
        );
      });

      return { blobId, blobObject };
    } catch (error: any) {
      throw new WalrusDBError(`Blob upload failed: ${error.message}`);
    }
  }

  /**
 * Fetches a blob’s binary data from Walrus.
 *
 * @async
 * @param {ReadBlobOptions} blob - The blob read options (includes ID, attributes, etc.).
 * @returns {Promise<Uint8Array<ArrayBufferLike>>} The raw binary data of the blob.
 * @throws {WalrusError} If fetching the blob fails.
 */

  protected async fetchBlob(
    blob: ReadBlobOptions,
  ): Promise<Uint8Array<ArrayBufferLike>> {
    try {
      const data = await this.suiJsonRpcClient.walrus.readBlob(blob);
      return data;
    } catch (error: any) {
      throw new WalrusDBError("Failed to fetch blob from walrus", error);
    }
  }

  /**
   * Deletes a blob from Walrus storage.
   *
   * @async
   * @param {DeleteBlobOptions} blobObject - The blob metadata required for deletion.
   * @param {Key} this.key - The signing key for the transaction.
   * @returns {Promise<boolean>} Returns `true` if the deletion succeeded, otherwise `false`.
   * @throws {WalrusError} If deletion transaction fails.
   */
  protected async deleteBlob(
    blobObject: DeleteBlobOptions
  ): Promise<boolean> {

    try {
      const storage = this.suiJsonRpcClient.walrus.deleteBlob(blobObject);
      const tx = new Transaction();
      tx.transferObjects([storage], this.keyPair.getPublicKey().toSuiAddress());

      const result = await this.suiJsonRpcClient.signAndExecuteTransaction({
        signer: this.keyPair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      return result?.effects?.status?.status === "success";
    } catch (error: any) {
      throw new WalrusDBError(`Failed to delete blob: ${error.message}`);
    }
  }
}