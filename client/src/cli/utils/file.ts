import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

/**
 * Reads a UTF-8 text file.
 *
 * @param {string} filePath - The path to the file to read.
 * @returns {Promise<string>} The file contents as a string.
 *
 * @throws {Error} If the file cannot be read.
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

/**
 * Writes content to a file, creating directories recursively if needed.
 *
 * @param {string} filePath - The path to the file to write.
 * @param {string} content - The content to write to the file.
 * @returns {Promise<void>}
 *
 * @throws {Error} If the file cannot be written.
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

/**
 * Ensures that a directory exists, creating it recursively if necessary.
 *
 * @param {string} dirPath - The directory path to ensure.
 * @returns {Promise<void>}
 *
 * @throws {Error} If the directory cannot be created.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Checks synchronously whether a file or directory exists.
 *
 * @param {string} filePath - The path to check.
 * @returns {boolean} True if the path exists, false otherwise.
 */
export function existsSync(filePath: string): boolean {
  return fsSync.existsSync(filePath);
}
