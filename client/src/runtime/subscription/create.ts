import { Key } from "../../core/keyPair";
import { CreateServiceOptions, CreateSubscriptionOptions, WalrusActiveNetwork } from "../../@types/param";
import { CoinStruct, getFullnodeUrl, OwnedObjectRef, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID } from "../../constants/move";
import { WalrusError } from "../../cli/utils/error";
import { getServiceObjectFromName } from "./get";

/**
 * Create a service entry unless one with the same name already exists.
 *
 * Throws an error if  a service object is found with same name.
 */
export async function create(
    options: CreateServiceOptions,
    network: WalrusActiveNetwork["network"],
    key: Key,
): Promise<string | undefined> {
    const client = new SuiClient({ url: getFullnodeUrl(network) });
    const keyPair = Ed25519Keypair.fromSecretKey(key.secret);
    const existingServiceId = await getServiceObjectFromName(client, keyPair, options.name)
    if (existingServiceId) throw new WalrusError(`Service with name ${options.name} already exists!`)
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::subscription::create_service_entry`,
        arguments: [
            tx.pure.u64(options.fee),
            tx.pure.u64(options.ttl),
            tx.pure.string(options.name),
        ],
    });

    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keyPair,
        options: {
            showEffects: true,
            showRawEffects: true,
            showObjectChanges: true,
        },
    });

    if (result.effects?.status.status === "failure") {
        throw new WalrusError("Unable to create service. Try again later!");
    }
    return (result?.effects?.created as Array<OwnedObjectRef>)[1]?.reference.objectId
}

/**
 * 
 * @async
 * @param {CreateSubscriptionOptions} options Contains service ID and fee amount 
 * @param network 
 * @param key 
 * @description Create a subscription for a service
 * @returns Subscripion object ID    
 */
export async function createSubscriptionForService(
    options: CreateSubscriptionOptions,
    network: WalrusActiveNetwork["network"],
    key: Key,
) {
    const client = new SuiClient({ url: getFullnodeUrl(network) });
    const keyPair = Ed25519Keypair.fromSecretKey(key.secret);
    const address = keyPair.getPublicKey().toSuiAddress();

    const coins = await client.getCoins({ owner: address, coinType: "0x2::sui::SUI" });
    const fee = BigInt(options.fee);

    const eligibleCoins = coins.data.filter(c => BigInt(c.balance) >= fee);
    if (eligibleCoins.length === 0) {
        throw new WalrusError("Insufficient SUI balance to pay subscription fee.");
    }

    const tx = new Transaction();

    for (const coin of eligibleCoins) {
        if (BigInt(coin.balance) === fee) {
            const feeCoinId = coin.coinObjectId;
            return await finalizeSubscription(feeCoinId, tx);
        }
    }

    const coinToSplit = eligibleCoins[0];

    const feeCoinId = tx.splitCoins(
        tx.object((coinToSplit as CoinStruct).coinObjectId),
        [tx.pure.u64(fee)]
    );

    return await finalizeSubscription(feeCoinId, tx);

    async function finalizeSubscription(
        feeCoinId: string | ReturnType<typeof tx.splitCoins>,
        tx: Transaction
    ) {
        const serviceObj = await client.getObject({
            id: options.service,
            options: { showContent: true },
        });
        if (
            !serviceObj.data ||
            serviceObj.data.content?.dataType !== "moveObject" ||
            serviceObj.data.content.type !== `${PACKAGE_ID}::subscription::Service`
        ) {
            throw new WalrusError("Invalid service object.");
        }

        const subscription = tx.moveCall({
            target: `${PACKAGE_ID}::subscription::subscribe`,
            arguments: [
                typeof feeCoinId === "string" ? tx.object(feeCoinId) : feeCoinId,
                tx.object(options.service),
                tx.object("0x6"),
            ],
        });

        tx.moveCall({
            target: `${PACKAGE_ID}::subscription::transfer`,
            arguments: [
                subscription,
                tx.pure.address(address),
            ],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keyPair,
            options: {
                showEffects: true,
                showObjectChanges: true,
            },
        });

        if (result.effects?.status.status === "failure") {
            throw new WalrusError("Unable to create subscription. Try again later!");
        }
        return (result.effects?.created?.[0] as OwnedObjectRef).reference.objectId;

    }
}
