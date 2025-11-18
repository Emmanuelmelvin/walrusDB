import { PrivateData, WalrusActiveNetwork } from "../../@types/param";
import { WalrusError } from "../../cli/utils/error";
import { PACKAGE_ID } from "../../constants/move";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { toHex } from "@mysten/bcs";
import { Key } from "../../core/keyPair";

export  async function getPrivateDataObject(client: SuiClient, signer: Ed25519Keypair, nonce?: Uint8Array, privateDataId?: string): Promise<{ id: string, data: Uint8Array | undefined } | undefined> {
  if (privateDataId) {
    const privateData = ((await client.getObject({
      id: privateDataId,
      options: {
        showContent: true,
        showType: true
      }
    })).data?.content as any)?.fields as PrivateData;

    if (privateData.creator !== signer.getPublicKey().toSuiAddress()) {
      throw new WalrusError("Provided private data object id is not owned by this user.")
    }

    return { id: privateData.id.id, data: Uint8Array.from(privateData.data) }
  }
  const owned = await client.getOwnedObjects({
    owner: signer.getPublicKey().toSuiAddress(),
    options: { showType: true, showContent: true },
  });

  const objects = (owned.data ?? []).filter((v: any) => v.data?.type === `${PACKAGE_ID}::private_data::PrivateData`)
  let privateDataObject: PrivateData | null = null;
  for (const obj of objects) {
    const objectId = obj.data?.objectId as string;
    const fetched = await client.getObject({ id: objectId, options: { showContent: true } });
    const fields = (fetched.data?.content as any)?.fields as PrivateData;
    if (toHex(Uint8Array.from(fields?.nonce)) === toHex(nonce as Uint8Array)) {
      privateDataObject = fields;
      break;
    }
  }

  if (objects.length === 0) {
    throw new WalrusError("No Private Data found for user account!");
  }
  return { id: privateDataObject?.id.id as string, data: Uint8Array.from((privateDataObject as PrivateData).data)}
}

export async function getPrivateDataObjectData(network: WalrusActiveNetwork["network"], key: Key, nonce?: Uint8Array, keyId?: string) {
  if (!nonce && !keyId) {
    throw new WalrusError("Nonce or Private data object is is required")
  }
  const client = new SuiClient({ url: getFullnodeUrl(network) });
  const signer = Ed25519Keypair.fromSecretKey(key.secret);
  const data = await getPrivateDataObject(client, signer, nonce, keyId)
  return data;
}