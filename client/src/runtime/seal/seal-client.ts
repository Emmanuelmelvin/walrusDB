import { EncryptedObject, NoAccessError, SessionKey } from "@mysten/seal";
import { SealPatterns, SubscriptionOptions } from "../../@types/param";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID } from "../../constants/move";
import { WalrusDBNoAccessError, WalrusDBTransactionError } from "../../cli/utils/error";
import { fromHex, toHex } from "@mysten/bcs";
import { PatternAggregator } from "./patternAggregator";

export class SealClientCore extends PatternAggregator {
  /**
   * Encrypt data using a Seal pattern and return encrypted bytes and backup key.
   *
   * @param network - network string
   * @param key - local Key containing secret
   * @param data - arbitrary JSON-serializable data
   * @param pattern - Seal pattern ("AllowList" | "Private Data" | ...)
   * @param tag - optional tag, used for allowlist name or nonce
   * @param keyId - optional id override
   * @returns { encryptedBytes: Uint8Array, decodedKkey: string }
   */
  protected async encrypt(
    data: any,
    keyId: string | Uint8Array
  ): Promise<{ encryptedBytes: Uint8Array; decodedKkey: string }> {
    const encoded = new TextEncoder().encode(JSON.stringify(data));

    const { encryptedObject: encryptedBytes, key: backupKey } = await this.sealClient.encrypt({
      threshold: 2,
      packageId: PACKAGE_ID,
      id: (typeof keyId) === "string" ? keyId : toHex(keyId),  
      data: encoded,
    });

    const decodedKkey = new TextDecoder().decode(backupKey);
    return { encryptedBytes, decodedKkey };
  }

  /**
   * Decrypt previously sealed bytes using Seal client. If sessionKey is not provided,
   * a temporary session is created and signed with the provided secret.
   *
   * @param network - network string
   * @param encryptedBytes - bytes returned by SealClient.encrypt
   * @param key - local Key used to sign session
   * @param sessionKey - optional existing SessionKey (will be reused and returned)
   * @returns { decryptedBytes: Uint8Array, sessionKey: SessionKey }
   */
  protected async decrypt(
    pattern: SealPatterns,
    encryptedBytes: Uint8Array,
    sessionKey: SessionKey,
    keyId: string | SubscriptionOptions 
  ): Promise<{ decryptedBytes: Uint8Array; sessionKey: SessionKey }> {

    if (!sessionKey) {
      sessionKey = await SessionKey.create({
        address: this.keyPair.getPublicKey().toSuiAddress(),
        packageId: PACKAGE_ID,
        ttlMin: 10,
        suiClient: this.suiClient,
      });
      const message = sessionKey.getPersonalMessage();
      const { signature } = await this.keyPair.signPersonalMessage(message);
      sessionKey.setPersonalMessageSignature(signature);
    }

    // Ensure we have access to keys by performing a seal_approve call via tx (original flow)
    let bytes: Uint8Array;

    if (encryptedBytes instanceof Uint8Array) {
      bytes = encryptedBytes;
    } else if (typeof encryptedBytes === "object") {
      // if it's an Array or ArrayBuffer
      bytes = Uint8Array.from(encryptedBytes)
    } else if (typeof encryptedBytes === "string") {
      // if it's a hex string
      bytes = fromHex(encryptedBytes);
    } else {
      throw new Error("Unsupported encryptedBytes type");
    }

    const id = EncryptedObject.parse(bytes).id
    const tx = new Transaction();

    switch (pattern) {
      case "AllowList":
        tx.moveCall({
          target: `${PACKAGE_ID}::allowlist::seal_approve`,
          arguments: [tx.pure.vector("u8", Array.from(fromHex(id))), tx.object(keyId as string)],
        });
        break;
      case "Subscription":
        tx.moveCall({
          target: `${PACKAGE_ID}::subscription::seal_approve`,
          arguments: [
            tx.pure.vector("u8", Array.from(fromHex(id))),
            tx.object((keyId as SubscriptionOptions).subscriptionObjectId),
            tx.object((keyId as SubscriptionOptions).serviceObjectId),
            tx.object("0x6")
          ],
        })
        break;
      case "Private Data":
        try {
          tx.moveCall({
            target: `${PACKAGE_ID}::private_data::seal_approve`,
            arguments: [tx.pure.vector("u8", Array.from(fromHex(id))), tx.object(keyId as string)]
          })

        } catch (error: any) {
          throw new WalrusDBTransactionError("Unable to build transaction block", error)
        }
        break;
      case "Time-Lock":
        tx.moveCall({
          target: `${PACKAGE_ID}::tle::seal_approve`,
          arguments: [
            tx.pure.vector("u8", Array.from(fromHex(id))),
            tx.object("0x6")
          ]
        })
      default:
        break;
    }

    const txBytes = await tx.build({ client: this.suiClient, onlyTransactionKind: true });

    try {
      await this.sealClient.fetchKeys({ ids: [id], txBytes, sessionKey, threshold: 2 });
    } catch (err: any) {
      const errorMsg = err instanceof NoAccessError ? "No access to decryption keys" : "Unable to decrypt files, try again";
      throw new WalrusDBNoAccessError(errorMsg, err);
    }

    const decryptedBytes = await this.sealClient.decrypt({
      data: bytes,
      sessionKey,
      txBytes,
    });

    return { decryptedBytes, sessionKey };
  }



}
