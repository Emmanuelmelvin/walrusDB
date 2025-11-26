import { Transaction } from "@mysten/sui/transactions";
import { AllowlistCap, Allowlist as AllowListObject, MutateAllowList } from "../../@types/param";
import { PatternToolKit } from "./patterns";
import { MODULE_NAME, PACKAGE_ID } from "../../constants/move";
import { WalrusDBNotFoundError, WalrusDBTransactionError } from "../../cli/utils/error";
import { SealClient } from "@mysten/seal";
import { SuiClient } from "@mysten/sui/dist/cjs/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export class AllowList extends PatternToolKit {
    /**
     * Factory method for creating an instance of AllowList.
     */
    static create(): AllowList {  
        return new AllowList();
    }

    /**
     * Initializes AllowList with external dependencies (overrides PatternConfig).
     *
     * @param key - Ed25519 keypair used for signing.
     * @param suiClient - Sui fullnode client.
     * @param sealClient - Seal client instance.
     */
    $initAllow(key: Ed25519Keypair, suiClient: SuiClient, sealClient: SealClient): void {
        this.$set(key, suiClient, sealClient);
    }

    /**
     * Creates a new on-chain allowlist object with a given name.
     *
     * @param name - Allowlist name to be created.
     * @returns The created allowlist object ID.
     * @throws WalrusDBTransactionError if creation fails.
     */
    public async createAllowList(
        name: string
    ): Promise<string | undefined> {
        const tx = new Transaction();
        tx.moveCall({
            arguments: [tx.pure.string(name)],
            target: `${PACKAGE_ID}::${MODULE_NAME}::create_allowlist_entry`,
        });

        return await this.create(tx, `${PACKAGE_ID}::allowlist::Allowlist`);
    }

    /**
     * Retrieves an allowlist by its name from user-owned Cap objects.
     *
     * @param allowListName - The name of the allowlist to fetch.
     * @returns An object containing the Cap and Allowlist fields, or null if not found.
     * @throws WalrusDBNotFoundError when no allowlist Caps are owned.
     */
    public async getAllowListByName(
        allowListName: string
    ): Promise<{ cap: AllowlistCap; allowList: AllowListObject } | null> {
        const caps = await this.getOwned(`${PACKAGE_ID}::${MODULE_NAME}::Cap`);

        if (caps.length === 0) {
            throw new WalrusDBNotFoundError("No allowlist Cap found for this account!");
        }

        for (const cap of caps) {
            const allowListCap = (cap.data?.content as any).fields as AllowlistCap;

            if (!allowListCap.allowlist_id) continue;

            const allowList = await this.getObject<AllowListObject>(allowListCap.allowlist_id);

            if (allowList.name === allowListName) {
                return { cap: allowListCap, allowList};
            }
        }

        return null;
    }

    /**
     * Mutates an allowlist by calling any of the supported Move functions:
     *  - add_to_allowlist
     *  - remove_from_allowlist
     *
     * @param type - Mutation type (Move function name).
     * @param allowList - The target allowlist ID.
     * @param to - Address to add or remove.
     * @returns `true`, `"Already exists!"`, or an error.
     * @throws WalrusDBNotFoundError if no cap matches the allowlist.
     * @throws WalrusDBTransactionError for invalid transactions.
     */
    public async mutateAllowList(
        type: MutateAllowList,
        allowList: string,
        to: string
    ): Promise<boolean | string> {

        const allowListCaps = await this.getOwned(`${PACKAGE_ID}::${MODULE_NAME}::Cap`);

        if (allowListCaps.length === 0) {
            throw new WalrusDBNotFoundError("No allowlist found for user account!");
        }

        let cap: AllowlistCap | null = null;

        for (const allowListCap of allowListCaps) {
            const fields = (allowListCap.data?.content as any).fields as AllowlistCap;

            if (fields.allowlist_id == allowList) {
                cap = fields;
                break;
            }
        }

        if (!cap) {
            throw new WalrusDBNotFoundError(`No Cap found for provided allowlist ID: ${allowList}`);
        }

        const tx = new Transaction();

        try {
            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::${type}`,
                arguments: [
                    tx.object(cap.allowlist_id),
                    tx.object(cap.id.id),
                    tx.pure.address(to),
                ],
            });
        } catch (err: any) {
            throw new WalrusDBTransactionError("Unable to complete transaction", err);
        }

        return await this.membership(tx);
    }
}
