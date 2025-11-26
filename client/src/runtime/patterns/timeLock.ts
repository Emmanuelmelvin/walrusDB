import { WalrusDBConfigError, WalrusDBNoAccessError, WalrusDBNotFoundError } from "../../cli/utils/error";
import { CreateTimeLockOptions, TimeLockData, TimeLockDataCap, UpdateTimeLockOption } from "../../@types/param";
import { PatternToolKit } from "./patterns";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID } from "../../constants/move";
import { SuiClient } from "@mysten/sui/dist/cjs/client";
import { SealClient } from "@mysten/seal";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export class TimeLock extends PatternToolKit {
    static create(): TimeLock { return new TimeLock() }
    $initTimeLock(key: Ed25519Keypair, suiClient: SuiClient, sealClient: SealClient): void {
        this.$set(key, suiClient, sealClient)
    }
    async createTimeLockEncryption(
        options: CreateTimeLockOptions,
    ): Promise<string | undefined> {
        const existingTimeLockEncryption = await this.getTimeLockEncryptionObjectForName(options.name)
        if (existingTimeLockEncryption) throw new WalrusDBConfigError(`Time Lockencryption with name ${options.name} already exists!`);
        const tx = new Transaction();
        tx.moveCall({
            target: `${PACKAGE_ID}::tle::create_timelock_data_entry`,
            arguments: [
                tx.pure.u64(options.end_time),
                tx.pure.string(options.name),
            ],
        });
        return (await this.create(tx, `${PACKAGE_ID}::tle::TimeLockData`))

    }

    async getTimeLockEncryptionObjectForName(
        name: string
    ): Promise<TimeLockData | null> {
        const timeLockEnceyptionObjectCaps = await this.getOwned(`${PACKAGE_ID}::tle::TimeLockDataCap`);
        //  Search for an existing service with matching name
        for (const obj of timeLockEnceyptionObjectCaps) {
            const fields = ((obj.data?.content as any)?.fields) as TimeLockDataCap;
            const timeLockData = await this.getObject<TimeLockData>(fields.updatable_tle_id);
            if (timeLockData.name === name) {
                // Existing service found → return exactly the same structure
                return timeLockData;
            }
        }
        return null;
    }

    async getTimeLockEncryptionById(
        timeLockDataId: string
    ): Promise<TimeLockData | null> {
        return (await this.getObject<TimeLockData>(timeLockDataId))
    }

    async getTimeLockEncryptionCap(
        timeLockDataId: string
    ): Promise<TimeLockDataCap | null> {
        const caps = await this.getOwned(`${PACKAGE_ID}::tle::TimeLockDataCap`);
        for (const cap of caps) {
            const fields = ((cap.data?.content as any)?.fields) as TimeLockDataCap;
            if (fields.updatable_tle_id == timeLockDataId) {
                return fields;
            }
        }
        return null;
    }

    async updateTleEndTime(
        options: UpdateTimeLockOption,
    ): Promise<boolean> {
        const timeLockEncryption = (await this.getObject<TimeLockData>(options.timeLockId)).id.id;
        if (!timeLockEncryption) throw new WalrusDBNotFoundError("Time Lock encryption not found!");
        let cap = await this.getTimeLockEncryptionCap(timeLockEncryption)
        if (!cap) throw new WalrusDBNoAccessError("Time Lock encryption dosent not belong to user!");

        const tx = new Transaction();
        tx.moveCall({
            target: `${PACKAGE_ID}::tle::update_tle_end_time`,
            arguments: [
                tx.object(timeLockEncryption),
                tx.object(cap.id.id)
                , tx.pure.u64(options.end_time)
            ]
        });
        return (await this.signAndExecuteAndReturnStatus(tx));
    }
}