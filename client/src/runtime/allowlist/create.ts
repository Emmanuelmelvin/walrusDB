import { WalrusActiveNetwork } from "../../@types/param";
import { WalrusError } from "../../cli/utils/error";
import { MODULE_NAME, PACKAGE_ID } from "../../constants/move";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Key } from "../../core/keyPair";

/**
 * Create an allowlist entry on-chain by calling the move function.
 *
 * @param suiClient - SuiClient used to sign & submit transaction
 * @param signer - Ed25519Keypair used to sign the tx
 * @param name - Allowlist name
 * @returns objectId string of created allowlist
 * @throws WalrusError when transaction fails or expected object change is not found
 */
export const createAllowList = async (suiClient: SuiClient, signer: Ed25519Keypair, name: string): Promise<string> => {
  const tx = new Transaction();
  tx.moveCall({
    arguments: [tx.pure.string(name)],
    target: `${PACKAGE_ID}::${MODULE_NAME}::create_allowlist_entry`,
  });
  tx.setGasBudget(10000000);

  const result: any = await suiClient.signAndExecuteTransaction({
    signer,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  if (!result.effects?.status?.status) {
    throw new WalrusError("An unexpected error occured while creating allowlist.");
  }

  // Find created allowlist object change
  const createdChange = (result.objectChanges ?? []).find(
    (change: any) =>
      change.type === "created" &&
      typeof change.objectType === "string" &&
      change.objectType.includes(`::${MODULE_NAME}::Allowlist`)
  );

  if (!createdChange || !createdChange.objectId) {
    throw new WalrusError("Failed to locate created allowlist object in transaction result.");
  }

  return createdChange.objectId as string;
};

/**
 * Helper wrapper for creating an allowlist using network string and Key secret.
 *
 * @param network - 'testnet' | 'devnet' | 'mainnet'
 * @param key - local Key object containing secret bytes
 * @param name - allowlist name
 * @returns created allowlist object id
 */
export async function helperCreateAllowList(network: WalrusActiveNetwork["network"], key: Key, name: string): Promise<string> {
  const suiClient = new SuiClient({ url: getFullnodeUrl(network) });
  const signer = Ed25519Keypair.fromSecretKey(key.secret);
  return createAllowList(suiClient, signer, name);
}

