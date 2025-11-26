import { Transaction } from "@mysten/sui/transactions";
import { WalrusDBNoAccessError, WalrusDBRetryableError, WalrusDBTransactionError } from "../../cli/utils/error";
import { SuiObjectResponse, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { PatternConfig } from "../base";

export class PatternToolKit extends PatternConfig {

    /**
     * Signs and executes a transaction using the account keypair.
     * 
     * @param tx - The transaction block to sign and execute.
     * @returns Promise resolving to the full SuiTransactionBlockResponse.
     */
    private async signAndExecute(
        tx: Transaction
    ): Promise<SuiTransactionBlockResponse> {
        const result = await this.suiClient.signAndExecuteTransaction({
            signer: this.keyPair,
            transaction: tx,
            options: {
                showEffects: true,
                showObjectChanges: true,
            },
        });
        return result;
    }

    /**
     * Creates an object on-chain and extracts the created object ID that matches the provided type.
     *
     * @param tx - The transaction object responsible for creation.
     * @param type - The struct type to filter the created object from the response.
     * @throws WalrusDBTransactionError when the transaction execution fails.
     * @throws WalrusDBRetryableError when the created object cannot be found.
     * @returns The created object ID as a string.
     */
    protected async create(
        tx: Transaction,
        type: string
    ): Promise<string | undefined> {
        tx.setGasBudget(100000000);
        const result = await this.signAndExecute(tx);

        if (!result.effects?.status?.status) {
            throw new WalrusDBTransactionError("An unexpected error occured while creating allowlist.");
        }

        const createdChange = (result.objectChanges ?? []).find(
            (change: any) =>
                change.type === "created" &&
                typeof change.objectType === "string" &&
                change.objectType.includes(type)
        ) as any;

        if (!createdChange || !createdChange.objectId) {
            throw new WalrusDBRetryableError("Failed to locate created allowlist object in transaction result.");
        }

        return createdChange.objectId as string;
    }

    /**
     * Executes a membership-related transaction and interprets common abort codes.
     *
     * @param tx - The transaction block modifying membership.
     * @returns `true` on success, `"Already exists!"` for duplicate insertions, or throws on restricted access.
     * @throws WalrusDBNoAccessError when modification is not permitted.
     */
    protected async membership(tx: Transaction): Promise<boolean | string> {
        const result = await this.signAndExecute(tx);

        if (result.effects?.status?.status === "failure") {
            const abortCode = Number(result.effects?.abortError?.error_code ?? 0);

            if (abortCode === 2) {
                return "Already exists!";
            }

            throw new WalrusDBNoAccessError("Unable to modify allowlist membership.");
        }
        return true;
    }

    /**
     * Fetches all objects of a given struct type owned by the user's address.
     *
     * @param structType - The Sui struct type to query, e.g. `"0x2::allowlist::Member"`.
     * @returns A list of SuiObjectResponse items.
     */
    protected async getOwned(
        structType: string
    ): Promise<SuiObjectResponse[]> {
        const objs = await this.suiClient.getOwnedObjects({
            owner: this.keyPair.getPublicKey().toSuiAddress(),
            filter: {
                StructType: structType
            },
            options: {
                showContent: true,
                showType: true
            }
        });

        return objs.data;
    }

    /**
     * Retrieves a strongly-typed on-chain object by its object ID.
     *
     * @param objectId - The Sui object ID to fetch.
     * @returns Parsed object fields as type `T`.
     */
    protected async getObject<T>(
        objectId: string
    ): Promise<T> {
        const obj = ((await this.suiClient.getObject({
            id: objectId,
            options: {
                showContent: true,
                showType: true
            }
        })).data?.content as any)?.fields as T;

        return obj;
    }

    /**
     * Executes a transaction and returns only the success status.
     *
     * @param tx - The transaction block to execute.
     * @returns `true` if success, `false` if the transaction failed.
     */
    protected async signAndExecuteAndReturnStatus(tx: Transaction): Promise<boolean> {
        const result = await this.signAndExecute(tx);
        if (result.effects?.status.status == "failure") return false;
        return true;
    }
}
