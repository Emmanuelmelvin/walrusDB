import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { PACKAGE_ID } from "../../constants/move";
import { getFullnodeUrl, SuiClient, SuiParsedData } from "@mysten/sui/client";
import { Service, ServiceCap, Subscription, WalrusActiveNetwork } from "../../@types/param";
import { Key } from "../../core/keyPair";

export async function getServiceObjectFromName(
    client: SuiClient, 
    keyPair: Ed25519Keypair,
    name: string
): Promise<Service | null>{
    // Fetch all service entries owned by the user
        const allObjects = await client.getOwnedObjects({
            owner: keyPair.getPublicKey().toSuiAddress(),
            filter: {
                StructType: `${PACKAGE_ID}::subscription::Cap`
            },
            options: {
                showContent: true,
            }
        });
    
        //  Search for an existing service with matching name
        for (const obj of allObjects.data) {
            const fields = ((obj.data?.content as any)?.fields) as ServiceCap;
            const serviceObject = (( await client.getObject({
                id: fields.service_id,
                options: {
                    showContent: true
                }
            })).data?.content as any)?.fields as Service
            if (serviceObject.name === name) {
                // Existing service found → return exactly the same structure
                return serviceObject;
            }
        }
        return null;
}

export async function getServiceObjectFromNameHelper(network: WalrusActiveNetwork["network"], key: Key, name: string){
    const client = new SuiClient({url: getFullnodeUrl(network)});
    const keyPair = Ed25519Keypair.fromSecretKey(key.secret)
    return (await getServiceObjectFromName(client,keyPair, name))
}

export async function getSubscriptionForService(
    serviceId: string,
    network: WalrusActiveNetwork["network"],
    key: Key
) {
    const client = new SuiClient({ url: getFullnodeUrl(network) });
    const keyPair = Ed25519Keypair.fromSecretKey(key.secret);
    const address = keyPair.getPublicKey().toSuiAddress();

    const objects = await client.getOwnedObjects({
        owner: address,
        filter: { StructType: `${PACKAGE_ID}::subscription::Subscription` },
        options: { showContent: true },
    });

    for (const obj of objects.data) {
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
