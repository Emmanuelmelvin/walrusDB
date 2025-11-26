import { PatternToolKit } from "./patterns";
import { CreateServiceOptions, CreateSubscriptionOptions, Service, ServiceCap, Subscription, TransferSubscriptionOptions } from "../../@types/param";
import { PACKAGE_ID } from "../../constants/move";
import { WalrusDBConfigError, WalrusDBNotFoundError, WalrusDBTransactionError } from "../../cli/utils/error";
import { Transaction } from "@mysten/sui/transactions";
import { CoinStruct, SuiClient } from "@mysten/sui/dist/cjs/client";
import { SealClient } from "@mysten/seal";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

/**
 * Subscription pattern handler for WalrusDB.
 * 
 * Manages creation of subscription services, subscribing to services,
 * looking up owned subscriptions, and transferring subscriptions.
 */
export class Subscripion extends PatternToolKit {

    /** 
     * Create a new Subscription handler instance.
     * @returns {Subscripion}
     */
    static create(): Subscripion {  
        return new Subscripion();
    }

    /**
     * Initialize the Subscription module with the required key and clients.
     *
     * @param {Ed25519Keypair} key - User's keypair used for signing transactions.
     * @param {SuiClient} suiClient - Connected Sui RPC client.
     * @param {SealClient} sealClient - Walrus Seal client instance.
     */
    $initSubscription(key: Ed25519Keypair, suiClient: SuiClient, sealClient: SealClient): void {
        this.$set(key, suiClient, sealClient);
    }

    /**
     * Finalizes a subscription transaction by executing the on-chain
     * `subscribe` and `transfer` calls, then submits the transaction.
     *
     * @param {string | ReturnType<typeof tx.splitCoins>} feeCoinId - The coin (or split coin result) used to pay the fee.
     * @param {string} serviceObjectId - The Service object ID to subscribe to.
     * @param {Transaction} tx - Active transaction builder.
     * @returns {Promise<string | undefined>} The created Subscription object ID.
     */
    public async finalizeSubscription(
        feeCoinId: string | ReturnType<typeof tx.splitCoins>,
        serviceObjectId: string,
        tx: Transaction
    ): Promise<string | undefined> {
        const subscription = tx.moveCall({
            target: `${PACKAGE_ID}::subscription::subscribe`,
            arguments: [
                typeof feeCoinId === "string" ? tx.object(feeCoinId) : feeCoinId,
                tx.object(serviceObjectId),
                tx.object("0x6"),
            ],
        });

        tx.moveCall({
            target: `${PACKAGE_ID}::subscription::transfer`,
            arguments: [
                subscription,
                tx.pure.address(this.keyPair.getPublicKey().toSuiAddress()),
            ],
        });

        return await this.create(tx, `${PACKAGE_ID}::subscription::Subscription`);
    }

    /**
     * Create a new subscription service.
     *
     * Fails if a service with the same name already exists.
     *
     * @param {CreateServiceOptions} options - Name, fee, and TTL of the service.
     * @returns {Promise<string | undefined>} ID of the created Service object.
     * @throws {WalrusDBConfigError} If a service with the same name already exists.
     */
    public async createSubscriptionSerice(
        options: CreateServiceOptions
    ): Promise<string | undefined> {
        const existingServiceId = await this.getServiceObjectFromName(options.name);
        if (existingServiceId) {
            throw new WalrusDBConfigError(`Service with name ${options.name} already exists!`);
        }

        const tx = new Transaction();
        tx.moveCall({
            target: `${PACKAGE_ID}::subscription::create_service_entry`,
            arguments: [
                tx.pure.u64(options.fee),
                tx.pure.u64(options.ttl),
                tx.pure.string(options.name),
            ],
        });

        return await this.create(tx, `${PACKAGE_ID}::subscription::Service`);
    }

    /**
     * Look up a service object by name.
     *
     * Searches owned `ServiceCap` objects, loads the related Service object,
     * and compares names.
     *
     * @param {string} name - Service name to search for.
     * @returns {Promise<Service | null>} The service object or null if not found.
     */
    public async getServiceObjectFromName(
        name: string
    ): Promise<Service | null> {
        const serviceObjects = await this.getOwned(`${PACKAGE_ID}::subscription::Cap`);

        for (const obj of serviceObjects) {
            const fields = ((obj.data?.content as any)?.fields) as ServiceCap;
            const serviceObject = await this.getObject<Service>(fields.service_id);
            if (serviceObject.name === name) {
                return serviceObject;
            }
        }
        return null;
    }

    /**
     * Create a subscription for a specific service.
     *
     * Automatically selects an eligible coin, or splits a larger one
     * to obtain the exact required fee.
     *
     * @param {CreateSubscriptionOptions} options - Contains service ID and fee.
     * @returns {Promise<string | undefined>} The created Subscription object ID.
     * @throws {WalrusDBTransactionError} If the user has insufficient SUI balance.
     */
    public async createSubscriptionForService(
        options: CreateSubscriptionOptions,
    ): Promise<string | undefined> {
        const coins = await this.suiClient.getCoins({
            owner: this.keyPair.getPublicKey().toSuiAddress(), 
            coinType: "0x2::sui::SUI"
        });

        const fee = BigInt(options.fee);
        const eligibleCoins = coins.data.filter(c => BigInt(c.balance) >= fee);

        if (eligibleCoins.length === 0) {
            throw new WalrusDBTransactionError("Insufficient SUI balance to pay subscription fee.");
        }

        const tx = new Transaction();

        for (const coin of eligibleCoins) {
            if (BigInt(coin.balance) === fee) {
                return await this.finalizeSubscription(coin.coinObjectId, options.service, tx);
            }
        }

        const coinToSplit = eligibleCoins[0];
        const feeCoinId = tx.splitCoins(
            tx.object((coinToSplit as CoinStruct).coinObjectId),
            [tx.pure.u64(fee)]
        );

        return this.finalizeSubscription(feeCoinId, options.service, tx);
    }

    /**
     * Retrieve the subscription object for a particular service.
     *
     * @param {string} serviceId - Service ID to find a subscription for.
     * @returns {Promise<string | null>} The subscription object ID or null.
     */
    public async getSubscriptionForService(
        serviceId: string
    ): Promise<string | null> {
        const subscriptions = await this.getOwned(`${PACKAGE_ID}::subscription::Subscription`);

        for (const obj of subscriptions) {
            const data = obj.data;
            if (
                data &&
                data.content?.dataType === "moveObject" &&
                (data.content.type as string).includes("Subscription")
            ) {
                const fields = (data.content as any).fields as Subscription;
                if (fields.service_id === serviceId) {
                    return data.objectId;
                }
            }
        }
        return null;
    }

    /**
     * Transfer an owned subscription to a different Sui address.
     *
     * @param {TransferSubscriptionOptions} options - Contains target address and service ID.
     * @returns {Promise<boolean>} True if transfer succeeded.
     * @throws {WalrusDBNotFoundError} If no subscription exists for the given service.
     */
    public async transferSubscription(
        options: TransferSubscriptionOptions,
    ): Promise<boolean> {
        const subscriptionObjectId = await this.getSubscriptionForService(options.serviceId);

        if (!subscriptionObjectId) {
            throw new WalrusDBNotFoundError(`Subscription for service ${options.serviceId} not found!`);
        }

        const tx = new Transaction();
        tx.moveCall({
            target: `${PACKAGE_ID}::subscription::transfer`,
            arguments: [
                tx.object(subscriptionObjectId),
                tx.pure.address(options.to)
            ]
        });

        return await this.signAndExecuteAndReturnStatus(tx);
    }
}
