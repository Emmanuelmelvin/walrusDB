import { AllowlistCap, WalrusActiveNetwork } from "../../@types/param";
import { WalrusError } from "../../cli/utils/error";
import { MODULE_NAME, PACKAGE_ID } from "../../constants/move";
import { Key } from "../../core/keyPair";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

/**
 * Add or remove an account address to/from an allowlist using a Cap owned by the account(secret).
 *
 * @param network - chain network
 * @param account - account address to add/remove
 * @param secret - Key with secret used for signing/cap lookup
 * @param type - 'add' | 'remove'
 * @param allowList - optional allowlist id to specifically use
 * @returns true on success, or a descriptive string on certain known errors
 */
export async function accountToAllowList(
  network: WalrusActiveNetwork["network"],
  account: string,
  secret: Key,
  type: "remove" | "add",
  allowList?: string
): Promise<boolean | string> {
  const client = new SuiClient({ url: getFullnodeUrl(network) });
  const ownerAddress = Ed25519Keypair.fromSecretKey(secret.secret).getPublicKey().toSuiAddress();

  const owned = await client.getOwnedObjects({
    owner: ownerAddress,
    options: { showType: true, showContent: true },
  });

  const capObjects = (owned.data ?? []).filter((v: any) => v.data?.type === `${PACKAGE_ID}::${MODULE_NAME}::Cap`);

  if (capObjects.length === 0) {
    throw new WalrusError("No allowlist found for user account!");
  }

  let cap: AllowlistCap | null = null;

  if (allowList) {
    // locate the cap matching provided allowList id
    for (const obj of capObjects) {
      const objectId = obj.data?.objectId as string;
      const fetched = await client.getObject({ id: objectId, options: { showContent: true } });
      const fields = (fetched.data?.content as any)?.fields as AllowlistCap;
      if (fields?.allowlist_id === allowList) {
        cap = fields;
        break;
      }
    }

    if (!cap) {
      throw new WalrusError(`No Cap found for provided allowlist ID: ${allowList}`);
    }
  } else {
    // default to first cap
    const fetched = await client.getObject({ id: capObjects[0]?.data?.objectId as string, options: { showContent: true } });
    cap = (fetched.data?.content as any)?.fields as AllowlistCap;
  }

  const tx = new Transaction();
  try {
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::${type}`,
      arguments: [tx.object(cap.allowlist_id), tx.object(cap.id.id), tx.pure.address(account)],
    });
  } catch (err: any) {
    // moveCall construction error (invalid args etc.)
    return err.message ?? String(err);
  }

  tx.setGasBudget(10000000);

  const result = await client.signAndExecuteTransaction({
    signer: Ed25519Keypair.fromSecretKey(secret.secret),
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true },
  });

  // check for explicit failure
  if (result.effects?.status?.status === "failure") {
    // known abort code handling
    const abortCode = Number(result.effects?.abortError?.error_code ?? 0);
    if (abortCode === 2) {
      return "Already exists!";
    }
    throw new WalrusError("Unable to modify allowlist membership.");
  }

  return true;
};
