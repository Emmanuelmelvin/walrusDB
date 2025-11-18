import type { ParsedWalrusSchema, WalrusModel } from "../@types/schema";

/**
 * Generates TypeScript type definitions from a parsed Walrus schema object.
 *
 * Converts the schema's models and generator configurations
 * into valid TypeScript interfaces and type aliases.
 *
 * @param {ParsedWalrusSchema} parsed - The parsed schema object containing models and generator configs.
 * @returns {string} A TypeScript source code string representing the generated types.
 *
 * @example
 * ```ts
 * const tsSource = generateTypes(parsedSchema);
 * console.log(tsSource);
 * ```
 */
export function generateTypes(parsed: ParsedWalrusSchema): string {
  const lines: string[] = [];
  lines.push("// Auto-generated types from schema.walrus");
  lines.push("");

  const models = parsed.models ?? {};
  const generator = parsed.generator ?? {};

  // Generate model types
  for (const modelName of Object.keys(models)) {
    const fields = models[modelName];

    lines.push(`export interface ${modelName} {`);

    for (const [fieldName, fieldValue] of Object.entries(fields as WalrusModel)) {
      let type: string;
      let optional = false;

      // Support both simple type or extended object syntax
      if (typeof fieldValue === "string") {
        type = fieldValue;
      } else {
        type = fieldValue.type;
        optional = Boolean(fieldValue.optional);
      }

      let tsType: string;
      switch (type.toLowerCase()) {
        case "string":
        case "text":
          tsType = "string";
          break;
        case "number":
        case "int":
        case "float":
          tsType = "number";
          break;
        case "boolean":
        case "bool":
          tsType = "boolean";
          break;
        case "date":
        case "datetime":
          tsType = "string"; // ISO formatted
          break;
        default:
          tsType = "any"; // fallback
      }

      lines.push(`  ${fieldName}${optional ? "?" : ""}: ${tsType};`);
    }

    lines.push("}");
    lines.push("");
  }

  // Export root model type mapping
  lines.push("export type WalrusModels = {");
  for (const modelName of Object.keys(models)) {
    lines.push(`  "${modelName}": ${modelName};`);
  }
  lines.push("};");
  lines.push("");

  // 🔥 Generate typing for generator config
  lines.push("export interface WalrusGeneratorConfig {");

  for (const [genName, genConfig] of Object.entries(generator)) {
    lines.push(`  ${genName}: {`);
    for (const [key] of Object.entries(genConfig)) {
      lines.push(`    ${key}: string;`);
    }
    lines.push("  };");
  }

  lines.push("}");
  lines.push("");

  return lines.join("\n");
}
