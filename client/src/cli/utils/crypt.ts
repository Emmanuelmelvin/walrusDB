import crypto from "crypto";

/**
 * Represents the output of an AES-256-GCM encryption operation.
 */
export interface EncResult {
  /** Encrypted data in hex format. */
  encryptedData: string;

  /** Initialization vector (IV) in hex format. */
  iv: string;

  /** Authentication tag in hex format. */
  tag: string;

  /** Encryption key in hex format. */
  key: string;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param {string} text - The plaintext to encrypt.
 * @returns {EncResult} An object containing the encrypted data, IV, tag, and key (all in hex format).
 *
 * @example
 * ```ts
 * const result = encrypt("hello world");
 * console.log(result.encryptedData); // hex string
 * ```
 */
export const encrypt = (text: string): EncResult => {
  // 256-bit key for AES-256-GCM
  const key = crypto.randomBytes(32); // 32 bytes
  const iv = crypto.randomBytes(12);  // 12 bytes recommended for GCM

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const out: EncResult = {
    encryptedData: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    key: key.toString("hex"),
  };

  // Best-effort: overwrite key in memory
  key.fill(0);

  return out;
};

/**
 * Decrypts data previously encrypted with AES-256-GCM.
 *
 * @param {string} encryptedHex - The encrypted data in hex format.
 * @param {string} keyHex - The encryption key in hex format.
 * @param {string} ivHex - The initialization vector (IV) in hex format.
 * @param {string} tagHex - The authentication tag in hex format.
 * @returns {string} The decrypted plaintext string.
 *
 * @throws {Error} If decryption fails due to invalid data or incorrect key/tag.
 *
 * @example
 * ```ts
 * const plaintext = decrypt(result.encryptedData, result.key, result.iv, result.tag);
 * console.log(plaintext); // "hello world"
 * ```
 */
export const decrypt = (
  encryptedHex: string,
  keyHex: string,
  ivHex: string,
  tagHex: string
): string => {
  try {
    const encrypted = Buffer.from(encryptedHex, "hex");
    const key = Buffer.from(keyHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    // Overwrite key buffer (memory hygiene)
    key.fill(0);

    return decrypted.toString("utf8");
  } catch (err) {
    throw new Error("Decryption failed: Invalid key, tag, or ciphertext.");
  }
};
