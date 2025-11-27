import fs from "fs";
import peggy from "peggy";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function parseWalrusSchema(schemaText: string): Record<string, any> {
  try {
    const grammarPath = path.join(__dirname, "walrus-schema.pegjs");
    const grammar = fs.readFileSync(grammarPath, "utf8");

    const parser = peggy.generate(grammar);
    return parser.parse(schemaText) as Record<string, any>;
  } catch (err: any) {
    throw new Error(`Failed to parse Walrus schema: ${err.message || err}`);
  }
}
