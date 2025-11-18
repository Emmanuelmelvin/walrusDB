import { AllowlistCap, WalrusActiveNetwork } from "../../@types/param";
import { WalrusError } from "../../cli/utils/error";
import { MODULE_NAME, PACKAGE_ID } from "../../constants/move";
import { Key } from "@/core/keyPair";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { createAllowList } from "./create";

/**
 * Find an AllowlistCap object owned by the provided secret and match by name.
 *
 * @param network - network string
 * @param secret - Key containing secret
 * @param allowListName - allowlist name to search for
 * @returns object with cap and allowList fields
 */
export async function getAllowListByName(
  network: WalrusActiveNetwork["network"],
  secret: Key,
  allowListName: string
): Promise<{ cap: AllowlistCap; allowList: any } | null> {
  const client = new SuiClient({ url: getFullnodeUrl(network) });
  const signer = Ed25519Keypair.fromSecretKey(secret.secret)

  return (await getAllowListByNameWrapperFunction(client, signer, allowListName))
}

/**
 * Inner function to find an AllowlistCap object owned by the provided secret and match by name.
 *
 * @param client - SuiClient
 * @param signer - Keypair to complete transactions
 * @param name - allowlist name to search for
 * @returns object with cap and allowList fields
 */
async function getAllowListByNameWrapperFunction(client: SuiClient, signer: Ed25519Keypair, name: string) {
  const owned = await client.getOwnedObjects({
    owner: signer.getPublicKey().toSuiAddress(),
    options: { showType: true, showContent: true },
  });

  const capObjects = (owned.data ?? []).filter((v: any) => v.data?.type === `${PACKAGE_ID}::${MODULE_NAME}::Cap`);

  if (capObjects.length === 0) {
    throw new WalrusError("No allowlist Cap found for this account!");
  }

  for (const obj of capObjects) {
    const capId = obj.data?.objectId as string;
    const capObject = await client.getObject({ id: capId, options: { showContent: true } });
    const cap = (capObject.data?.content as any)?.fields as AllowlistCap;
    if (!cap?.allowlist_id) continue;

    const allowListObject = await client.getObject({ id: cap.allowlist_id, options: { showContent: true } });
    const allowListData = (allowListObject.data?.content as any)?.fields;
    if (allowListData?.name === name) {
      return { cap, allowList: allowListData };
    }
  }

  return null;
}

/**
 * Get or create an allowlist object id for the signer.
 * If none exists, create a new allowlist entry.
 *
 * @param suiClient - Sui client instance
 * @param signer - Ed25519Keypair signer
 * @param name - allowlist name to create if none exists
 * @returns allowlist id string
 */
export async function getAllowListObjectId(suiClient: SuiClient, signer: Ed25519Keypair, name?: string): Promise<string> {
  if (!name) {
    const owned = await suiClient.getOwnedObjects({
      owner: signer.getPublicKey().toSuiAddress(),
      options: { showType: true, showContent: true },
    });

    const allowListCap = (owned.data ?? []).filter((v: any) => v.data?.type === `${PACKAGE_ID}::${MODULE_NAME}::Cap`);

    if (allowListCap.length === 0) {
      if (!name) {
        name = "AllowList"
      }
      return await createAllowList(suiClient, signer, name);
    }

    const firstCapId = allowListCap[0]?.data?.objectId as string;
    const obj = await suiClient.getObject({ id: firstCapId, options: { showContent: true } });
    return ((obj.data?.content as any)?.fields as AllowlistCap).allowlist_id;
  }
  const allowlist = await getAllowListByNameWrapperFunction(suiClient, signer, name)
  if (!allowlist) {
    throw new WalrusError("No Allowlist object found for the provided name tag.")
  }
  return allowlist.allowList.id.id
}
