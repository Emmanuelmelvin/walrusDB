import path from "node:path";

/** Base Walrus directory */
export const WALRUS_DIR = path.join(process.cwd(), "walrus");

/** Schema paths */
export const SCHEMA_WALRUS_PATH = path.join(WALRUS_DIR, "schema.walrus");
export const SCHEMA_JSON_PATH = path.join(WALRUS_DIR, "schema.json");

/** Generated client */
export const CLIENT_TS_PATH = path.join(WALRUS_DIR, "client.ts");

/** Keys and config */
export const KEY_PATH = path.join(WALRUS_DIR, "keys");
export const CONFIG_PATH = path.join(KEY_PATH, "keys.toml");

/** Types */
export const TYPE_PATH = path.join(WALRUS_DIR, "@types");

/** Runtime local blob storage (development / mock) */
export const BLOBS_DIR = path.join(WALRUS_DIR, "blobs");
