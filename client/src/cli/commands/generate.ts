import fs from "fs";
import { readFile, writeFile, ensureDir } from "../utils/file";
import { parseWalrusSchema } from "../../parser/index";
import { generateJson } from "../../generator/json-generator";
import { generateTypes } from "../../generator/type-generator";
import { generateClient } from "../../generator/client-generator";
import { SCHEMA_WALRUS_PATH, SCHEMA_JSON_PATH, CLIENT_TS_PATH } from "../../core/config";
import { info, success, error, warn } from "../utils/log";
import { WalrusDBNotFoundError, WalrusDBError } from "../utils/error";
import type { ParsedWalrusSchema } from "../../@types/schema";

/**
 * Generates all Walrus SDK artifacts from the schema file.
 *
 * This command:
 *  1. Parses the `schema.walrus` file.
 *  2. Produces a JSON schema.
 *  3. Generates TypeScript types and client files.
 *
 * @async
 * @function generateCommand
 * @throws {WalrusDBError} If schema parsing or generation fails.
 * @returns {Promise<void>} Resolves when generation completes successfully.
 */
export async function generateCommand(): Promise<void> {
  info("Starting walrus generate...");

  try {
    if (!fs.existsSync(SCHEMA_WALRUS_PATH)) {
      throw new WalrusDBNotFoundError(`No schema file found at: ${SCHEMA_WALRUS_PATH}\nRun: walrus init`);
    }

    const schemaText = await readFile(SCHEMA_WALRUS_PATH);

    let parsed: ParsedWalrusSchema | any;
    try {
      parsed = parseWalrusSchema(schemaText);
    } catch (err: unknown) {
      if (err && typeof err === "object" && !("stack" in err)) {
        const message = (err as { message?: string }).message || JSON.stringify(err);
        throw new WalrusDBError("Schema parsing failed:\n" + message);
      }

      if (!(err instanceof Error)) {
        throw new WalrusDBError("Schema parsing failed:\n" + String(err));
      }

      throw new WalrusDBError("Schema parsing failed:\n" + err.message);
    }

    info("✅ Parsed schema.walrus successfully.");

    await ensureDir("walrus");
    info("📁 Ensured /walrus directory exists.");

    await generateJson(parsed, SCHEMA_JSON_PATH);
    success(`JSON schema generated → ${SCHEMA_JSON_PATH}`);

    const TMP_TYPES_PATH = `${CLIENT_TS_PATH}.types.tmp.ts`;

    const typesSource = generateTypes(parsed);
    await writeFile(TMP_TYPES_PATH, typesSource);
    success("TypeScript type definitions generated.");

    const clientSource = generateClient(parsed);
    await writeFile(CLIENT_TS_PATH, clientSource);
    success(`Client generated → ${CLIENT_TS_PATH}`);

    try {
      if (fs.existsSync(TMP_TYPES_PATH)) {
        fs.unlinkSync(TMP_TYPES_PATH);
      }
    } catch {
      warn("Could not remove temporary types file.");
    }

    success("✨ Generation complete!");
  } catch (err: any) {
    if (err instanceof WalrusDBError) {
      error(err.message);
    } else {
      error("Unexpected internal error occurred.");
      console.error(err);
    }

    process.exit(1);
  }
}
