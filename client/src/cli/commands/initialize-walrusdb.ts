import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { encrypt } from "../utils/crypt";
import { success, info } from "../utils/log";
import { writeFile, ensureDir } from "../utils/file";
import { KEY_PATH } from "../../core/config";
import { WalrusError } from "../utils/error";
import path from "path";

/**
 * Structure representing encrypted key data.
 */
export interface EncryptedData {
  encryptedData: string;
  iv: string;
  tag: string;
  key: string;
}

/**
 * Initializes and securely stores a WalrusDB client key and secret.
 *
 * - Generates a new Ed25519 keypair.
 * - Encrypts the private key.
 * - Writes the encrypted data to a CSV file under the `walrus/keys` directory.
 *
 * @param {string} alias - The alias (or name) for the key file (used in file naming).
 * @returns {Promise<void>} Resolves when the file has been successfully written.
 *
 * @throws {WalrusError} If no alias is provided or a file write fails.
 */
export async function initializeWalrusDBClientKeyAndSecret(alias: string): Promise<void> {
  if (!alias) {
    throw new WalrusError("Alias not found! Please provide a valid name for the client key.");
  }

  // Generate keypair
  const keypair = new Ed25519Keypair();
  const privateKey = keypair.getSecretKey();
  const publicKey = keypair.getPublicKey().toSuiAddress();

  // Encrypt the private key
  const encrypted: EncryptedData = encrypt(privateKey);

  info("🔐 Completed encryption for WalrusDB Client secret.");

  // Ensure key directory exists
  await ensureDir(KEY_PATH);

  // Prepare CSV content
  const lines: string[] = [
    "encryptedData,iv,tag,key",
    `${encrypted.encryptedData},${encrypted.iv},${encrypted.tag},${encrypted.key}`
  ];

  const filePath = path.join(KEY_PATH, `${alias}.csv`);
  await writeFile(filePath, lines.join("\n"));

  success(`✅ WalrusDB Client key created successfully: ${publicKey}
Make sure to send $WAL and $SUI to the (key) wallet address for storage space and transaction completion!
Stored file: ${filePath}`);
}
