import fs from "fs";
import { SCHEMA_JSON_PATH } from "../core/config";
import { WalrusError } from "../cli/utils/error";

/**
 * Runtime schema validator for Walrus models.
 *
 * This module validates JavaScript objects against the compiled
 * schema definition found in `schema.json`. It ensures that:
 *  - All required fields are present.
 *  - Values match expected primitive types.
 *  - Optional fields are skipped if undefined.
 *
 * The schema is automatically generated from `schema.walrus`
 * during the build or CLI generation step.
 *
 * @module runtime/validators
 */

let cachedSchema: Record<string, Record<string, any>> | null = null;

/**
 * Loads and caches the compiled Walrus schema from `schema.json`.
 * If the schema has been previously loaded, it returns the cached copy.
 *
 * @returns {Record<string, Record<string, any>>} The parsed schema object containing model definitions.
 * @throws {WalrusError} If the schema file cannot be found or parsed.
 */
function loadSchema(): Record<string, Record<string, any>> {
  if (cachedSchema) return cachedSchema;

  if (!fs.existsSync(SCHEMA_JSON_PATH)) {
    throw new WalrusError(
      `Schema JSON not found at ${SCHEMA_JSON_PATH}. Run "walrus generate" first.`
    );
  }

  try {
    const raw = fs.readFileSync(SCHEMA_JSON_PATH, "utf8");
    cachedSchema = JSON.parse(raw);
  } catch (err: any) {
    throw new WalrusError(`Failed to parse schema.json: ${err.message}`);
  }

  return cachedSchema as Record<string, Record<string, any>>;
}

/**
 * Validates a given data object against the schema for the specified model.
 *
 * This function performs lightweight runtime checks based on your
 * schema definition. It ensures required fields exist and that values
 * match expected types (string, number, boolean, or date).
 *
 * You can extend this in the future to support:
 *  - Nested object validation
 *  - Enum / oneOf constraints
 *  - Custom field validation
 *  - Default values and transformations
 *
 * @param {string} modelName - The name of the model as defined in the Walrus schema.
 * @param {Record<string, any>} data - The data object to validate.
 * @returns {true} Returns `true` if validation succeeds.
 * @throws {WalrusError} If validation fails (missing or incorrect fields).
 *
 * @example
 * ```ts
 * import { validateAgainstSchema } from "walrusdb/src/runtime/validators";
 *
 * try {
 *   validateAgainstSchema("User", { email: "test@example.com" });
 *   console.log("Valid!");
 * } catch (err) {
 *   console.error(err.message);
 * }
 * ```
 */
export function validateAgainstSchema(modelName: string, data: Record<string, any>): true {
  const schema = loadSchema();
  const modelSchema = schema.models?.[modelName];

  if (!modelSchema) {
    throw new WalrusError(`Unknown model: ${modelName}`);
  }

  for (const field of Object.keys(modelSchema)) {
    const fieldDef = modelSchema[field];

    let expectedType: string;
    let optional = false;

    if (typeof fieldDef === "string") {
      expectedType = fieldDef.toLowerCase();
    } else if (typeof fieldDef === "object" && fieldDef !== null) {
      expectedType = (fieldDef.type ?? "").toLowerCase();
      optional = !!fieldDef.optional;
    } else {
      throw new WalrusError(
        `Invalid schema format for field "${field}" in model "${modelName}".`
      );
    }

    const value = data[field];

    // Field missing
    if (value === undefined || value === null) {
      if (!optional) {
        throw new WalrusError(
          `Missing required field "${field}" for model "${modelName}".`
        );
      }
      continue;
    }

    // Validate primitive types
    switch (expectedType) {
      case "string":
      case "text":
        if (typeof value !== "string") {
          throw new WalrusError(`Field "${field}" must be a string (got ${typeof value}).`);
        }
        break;

      case "number":
      case "int":
      case "float":
        if (typeof value !== "number") {
          throw new WalrusError(`Field "${field}" must be a number (got ${typeof value}).`);
        }
        break;

      case "boolean":
      case "bool":
        if (typeof value !== "boolean") {
          throw new WalrusError(`Field "${field}" must be a boolean (got ${typeof value}).`);
        }
        break;

      case "date":
      case "datetime":
        if (typeof value !== "string" || isNaN(Date.parse(value))) {
          throw new WalrusError(`Field "${field}" must be an ISO date string (got ${value}).`);
        }
        break;

      default:
        // Allow unknown/custom types to pass
        break;
    }
  }

  return true;
}
