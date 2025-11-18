import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { CONFIG_PATH, KEY_PATH } from "../../core/config";
import * as toml from "toml";
import { stringify } from "@iarna/toml";
import { WalrusError } from "./error";
import { readFile } from "./file";
import { decrypt } from "./crypt";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

/** Config structure */
export interface WalrusConfig {
  activeAlias: string | null;
}

/**
 * Loads WalrusDB configuration from TOML file.
 *
 * @returns {WalrusConfig} Parsed config object.
 */
export async function loadConfig(): Promise<WalrusConfig> {
  try {
    if (!fsSync.existsSync(CONFIG_PATH)) return { activeAlias: null };
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return toml.parse(raw) as WalrusConfig;
  } catch (err) {
    throw new WalrusError(`Failed to load config: ${(err as Error).message}`);
  }
}

/**
 * Saves WalrusDB configuration to TOML file.
 *
 * @param {WalrusConfig} config - Config object to save.
 */
export async function saveConfig(config: WalrusConfig): Promise<void> {
  try {
    const dir = path.dirname(CONFIG_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(CONFIG_PATH, stringify(config as any), "utf8");
  } catch (err) {
    throw new WalrusError(`Failed to save config: ${(err as Error).message}`);
  }
}

/**
 * Returns the active alias from config.
 *
 * @returns {Promise<string | null>} Active alias or null if none set.
 */
export async function getActiveAlias(): Promise<string | null> {
  const config = await loadConfig();
  return config.activeAlias || null;
}

/**
 * Sets the active alias in config after validating it exists.
 *
 * @param {string} alias - Alias to set as active.
 * @throws {WalrusError} If alias does not exist.
 */
export async function setActiveAlias(alias: string): Promise<void> {
  const aliasPath = path.join(KEY_PATH, `${alias}.csv`);
  if (!fsSync.existsSync(aliasPath)) {
    throw new WalrusError(`Alias '${alias}' not found. Initialize it first.`);
  }
  await saveConfig({ activeAlias: alias });
}

/**
 * Returns the public key for a given alias.
 *
 * @param {string} alias - Alias to retrieve.
 * @returns {Promise<string>} Public key (Sui address) for the alias.
 * @throws {WalrusError} If alias does not exist or decryption fails.
 */
export async function getKeyFromAlias(alias: string): Promise<string> {
  const secret = await getSecretFromAlias(alias);
  const keypair = Ed25519Keypair.fromSecretKey(secret);
  return keypair.getPublicKey().toSuiAddress();
}

/**
 * Returns the decrypted secret key for a given alias.
 *
 * @param {string} alias - Alias to retrieve.
 * @returns {Promise<string>} Decrypted private key as string.
 * @throws {WalrusError} If alias does not exist or file format is invalid.
 */
export async function getSecretFromAlias(alias: string): Promise<string> {
  const filePath = path.join(KEY_PATH, `${alias}.csv`);
  if (!fsSync.existsSync(filePath)) {
    throw new WalrusError(`Alias '${alias}' not found.`);
  }

  try {
    const keyCsv = (await readFile(filePath)).trim();
    const lines = keyCsv.split("\n");
    if (lines.length < 2) throw new WalrusError(`Invalid key file format for alias '${alias}'.`);

    const parts = (lines as any)[1].split(",").map((v: string) => v.trim());
    if (parts.length !== 4) throw new WalrusError(`Key file for alias '${alias}' is corrupted.`);

    const [encryptedData, iv, tag, key] = parts;
    return decrypt(encryptedData, key, iv, tag);
  } catch (err) {
    throw new WalrusError(`Failed to retrieve secret for alias '${alias}': ${(err as Error).message}`);
  }
}

/**
 * Returns all aliases stored in the keystore.
 *
 * @returns {Promise<string[]>} Array of alias names.
 */
export async function getAllAliases(): Promise<string[]> {
  try {
    if (!fsSync.existsSync(KEY_PATH)) return [];
    const files = await fs.readdir(KEY_PATH);
    return files.filter(f => f.endsWith(".csv")).map(f => path.basename(f, ".csv"));
  } catch (err) {
    throw new WalrusError(`Failed to list aliases: ${(err as Error).message}`);
  }
}

/**
 * Returns all public keys mapped by their aliases.
 *
 * @returns {Promise<{ aliases: string[]; keys: string[] }>} Object containing aliases and keys.
 */
export async function getAllKeysByTheirAliases(): Promise<{ aliases: string[]; keys: string[] }> {
  const aliases = await getAllAliases();
  const keys = await Promise.all(aliases.map(alias => getKeyFromAlias(alias)));
  return { aliases, keys };
}
