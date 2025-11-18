import { KeyPairsBuffer } from "@/@types/return";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromHex } from "@mysten/bcs";

/**
 * Compute a key id on-chain for private data patterns.
 * NOTE: original implementation did not extract result value from tx output.
 * Implement parsing of the transaction result here to return the computed id.
 *
 * @param nonce - the nonce vector used for key computation
 * @param client - SuiClient instance
 * @param signer - signer keypair
 * @returns computed key id as string
 */
export function computeKeyId(nonceString: string, signer: Ed25519Keypair): KeyPairsBuffer {
  const senderBytes = fromHex(signer.getPublicKey().toSuiAddress());
  const nonce = new TextEncoder().encode(nonceString);

  const keyId = new Uint8Array(senderBytes.length + nonce.length);
  keyId.set(senderBytes, 0);
  keyId.set(nonce, senderBytes.length);

  return {keyId, nonce};
}
