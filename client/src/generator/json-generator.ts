import fs from "fs/promises";
import path from "path";

/**
 * parsedSchema: an object where keys are model names and values are { fieldName: type, ... }
 * pathOut: path to write schema.json
 */
export async function generateJson(parsedSchema: Record<string, any>, pathOut: string) {
  const content = JSON.stringify(parsedSchema, null, 2);
  await fs.mkdir(path.dirname(pathOut), { recursive: true });
  await fs.writeFile(pathOut, content, "utf8");
  return pathOut;
}
