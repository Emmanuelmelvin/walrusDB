import { fromHex, toHex } from "@mysten/utils";
import { KeyPairsBuffer } from "../../@types/return";
import { PatternToolKit } from "./patterns";
import { PrivateData as PrivateDataObject } from "../../@types/param";
import { WalrusDBNoAccessError, WalrusDBNotFoundError } from "../../cli/utils/error";
import { PACKAGE_ID } from "../../constants/move";
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/dist/cjs/client";
import { SealClient } from "@mysten/seal";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

/**
 * Handles encryption, storage, and retrieval of private data objects.
 *
 * This pattern provides:
 *  - Local computation of a deterministic key ID based on user address + nonce
 *  - Secure storage of encrypted byte arrays on-chain
 *  - Retrieval of user-owned private data objects
 *
 * All cryptographic + Sui dependencies are injected through `$initPrivate()`,
 * inherited from `PatternToolKit` and backed by `PatternConfig`.
 */
export class PrivateData extends PatternToolKit {

    /**
     * Factory helper for easier instantiation.
     */
    static create(): PrivateData {
        return new PrivateData();
    }

    /**
     * Initializes the PrivateData pattern with a shared configuration.
     *
     * Injects dependencies:
     *  - `keyPair` for signing transactions
     *  - `suiClient` for fullnode access
     *  - `sealClient` for encryption-related operations
     *
     * @param key - Ed25519 signer keypair
     * @param suiClient - Sui fullnode client
     * @param sealClient - Walrus/Sui encryption client
     */
    $initPrivate(key: Ed25519Keypair, suiClient: SuiClient, sealClient: SealClient): void {
        this.$set(key, suiClient, sealClient);
    }

    /**
     * Computes a deterministic key ID buffer for storing private data.
     *
     * This keyId = sender_address_bytes + nonce_bytes
     * Used as an identifier to look up private data objects.
     *
     * @param nonceString - human-readable nonce that will be encoded into bytes
     * @returns `{ keyId, nonce }` where both are Uint8Array buffers
     */
    public computeKeyId(nonceString: string): KeyPairsBuffer {
        const senderBytes = fromHex(this.keyPair.getPublicKey().toSuiAddress());
        const nonce = new TextEncoder().encode(nonceString);

        const keyId = new Uint8Array(senderBytes.length + nonce.length);
        keyId.set(senderBytes, 0);
        keyId.set(nonce, senderBytes.length);

        return { keyId, nonce };
    }

    /**
     * Stores encrypted bytes into an on-chain `PrivateData` object.
     *
     * @param byte - encrypted payload as Uint8Array
     * @param nonce - nonce used to compute the key id
     * @returns `true` if transaction succeeded, otherwise `false`
     */
    public async storeBytesInPrivateDataObject(
        byte: Uint8Array<ArrayBufferLike>,
        nonce: Uint8Array<ArrayBufferLike>
    ): Promise<boolean> {
        const tx = new Transaction();

        tx.moveCall({
            target: `${PACKAGE_ID}::private_data::store_entry`,
            arguments: [
                tx.pure.vector("u8", Array.from(nonce)),
                tx.pure.vector("u8", Array.from(byte))
            ]
        });

        return (await this.signAndExecuteAndReturnStatus(tx));
    }

    /**
     * Retrieves a private data object.
     *
     * There are two access paths:
     *  1. Direct lookup via private data object ID
     *  2. Lookup via nonce (deterministic key ID search)
     *
     * The method automatically checks ownership and throws appropriate errors.
     *
     * @param nonce - nonce bytes used when storing the object (optional)
     * @param privateDataId - direct object ID (optional)
     *
     * @returns `{ id, data }` if found, `undefined` if not
     *
     * @throws WalrusDBNoAccessError - if user doesn’t own the provided object ID
     * @throws WalrusDBNotFoundError - if no matching private data is found
     */
    public async getPrivateDataObject(
        nonce?: Uint8Array,
        privateDataId?: string
    ): Promise<{ id: string, data: Uint8Array | undefined } | undefined> {

        // Direct lookup path
        if (privateDataId) {
            const privateData = await this.getObject<PrivateDataObject>(privateDataId);

            if (privateData.creator !== this.keyPair.getPublicKey().toSuiAddress()) {
                throw new WalrusDBNoAccessError(
                    "Provided private data object id is not owned by this user."
                );
            }

            return {
                id: privateData.id.id,
                data: Uint8Array.from(privateData.data)
            };
        }

        // Lookup-by-nonce path
        const privateDataObjects = await this.getOwned(
            `${PACKAGE_ID}::private_data::PrivateData`
        );

        if (privateDataObjects.length === 0) {
            throw new WalrusDBNotFoundError("No Private Data found for user account!");
        }

        let privateDataObject: PrivateDataObject | null = null;

        for (const obj of privateDataObjects) {
            const fields = (obj.data?.content as any).fields as PrivateDataObject;

            if (toHex(Uint8Array.from(fields.nonce)) === toHex(nonce as Uint8Array)) {
                privateDataObject = fields;
                break;
            }
        }

        return {
            id: privateDataObject?.id.id as string,
            data: Uint8Array.from(
                (privateDataObject as PrivateDataObject).data
            )
        };
    }
}
