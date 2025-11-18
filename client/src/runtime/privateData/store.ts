import { WalrusActiveNetwork } from "../../@types/param";
import { Key } from "../../core/keyPair";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getPrivateDataObject } from "./get";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID } from "../../constants/move";

export async function storeByteInPrivateDataObject(
  network: WalrusActiveNetwork["network"], 
  key: Key, 
  byte: Uint8Array<ArrayBufferLike>, 
  nonce: Uint8Array<ArrayBufferLike>
): Promise<string> {
  const client = new SuiClient({ url: getFullnodeUrl(network) });
  const signer = Ed25519Keypair.fromSecretKey(key.secret);
  if((await getPrivateDataObject(client, signer, nonce))) {
    return "success";
  }
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::private_data::store_entry`,
    arguments: [
      tx.pure.vector("u8", Array.from(nonce)),
      tx.pure.vector("u8", Array.from(byte))
    ]
  })

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  return result.effects?.status.status as string;
}