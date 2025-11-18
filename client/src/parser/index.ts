import fs from "fs";
import peggy from "peggy";
import path from "path";

/**
 * Parses a Walrus schema string into a JavaScript object.
 *
 * @param schemaText - The raw text of the Walrus schema.
 * @returns The parsed schema as a JS object.
 * @throws {Error} If parsing fails.
 */
export function parseWalrusSchema(schemaText: string): Record<string, any> {
  try {
    // Resolve path relative to current file
    const grammarPath = path.join(__dirname, "walrus-schema.pegjs");
    const grammar = fs.readFileSync(grammarPath, "utf8");

    // Generate parser and parse schema
    const parser = peggy.generate(grammar);
    return parser.parse(schemaText) as Record<string, any>;
  } catch (err: any) {
    throw new Error(`Failed to parse Walrus schema: ${err.message || err}`);
  }
}
