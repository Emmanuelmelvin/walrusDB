import { generateTypes } from "./type-generator.js";
import type { ParsedWalrusSchema } from "../@types/schema";

export function generateClient(parsed: ParsedWalrusSchema): string {
  const models = parsed.models ?? {};
  const generator = parsed.generator ?? {};
  const walrusConfig = generator.walrus ?? {};
  const nodeUrl = walrusConfig.url || "https://storage.walrus.node.io";

  const typeDefs = generateTypes(parsed);
  const modelNames = Object.keys(models);
  const lines: string[] = [];

  lines.push("// Auto-generated Walrus client");
  lines.push("");
  lines.push(typeDefs);
  lines.push("");
  lines.push("export interface WalrusGeneratorConfig { walrus: { url: string }; }");
  lines.push("");
  lines.push("type Constructor<T = {}> = new (...args: any[]) => T;");
  lines.push("");
  lines.push("import { CreateOptions, DeleteOptions, WalrusActiveNetwork, ReadOptions  } from \"walrusdb/src/@types/param\";")
  lines.push("import { storeBlob, fetchBlob, deleteBlob } from \"walrusdb/src/runtime/walrus-client\";");
  lines.push("import { validateAgainstSchema } from \"walrusdb/src/runtime/validators\";");
  lines.push("import { KeyPair } from \"walrusdb/src/core/keyPair\";");
  lines.push("");
  lines.push("export class WalrusClient {");
  lines.push(`  #url: string = "${nodeUrl}";`);
  lines.push("  network: WalrusActiveNetwork[\"network\"] = 'testnet';");
  lines.push("  keyPair: KeyPair;");
  lines.push("");
  lines.push("  constructor(keyPair: KeyPair, walrusConfig?: WalrusGeneratorConfig, nodeConfig?: WalrusActiveNetwork) {");
  lines.push("    if (walrusConfig) this.#url = walrusConfig.walrus.url;");
  lines.push("    if (nodeConfig) this.network = nodeConfig.network;");
  lines.push("    this.keyPair = keyPair;");
  lines.push("  }");
  lines.push("");

  for (const model of modelNames) {
    const varName = model.charAt(0).toLowerCase() + model.slice(1);
    lines.push(`  ${varName} = {`);
    lines.push(`    create: async (data: Partial<${model}>) => {`);
    lines.push(`      validateAgainstSchema("${model}", data);`);
    lines.push(`      const blob = await storeBlob(data, this.#url, this.network, this.keyPair.getKey());`);
    lines.push(`      return { blob, data };`);
    lines.push(`    },`);
    lines.push("");
    lines.push(`    findById: async (blob: ReadOptions): Promise<${model} | null> => {`);
    lines.push(`      const data = await fetchBlob(blob, this.network);`);
    lines.push(`      if (!data) return null;`);
    lines.push(`      const decoded = new TextDecoder().decode(data);`);
    lines.push(`      return JSON.parse(decoded) as ${model};`);
    lines.push(`    },`);
    lines.push("");
    lines.push(`    delete: async (blobObject: DeleteOptions): Promise<boolean> => {`);
    lines.push(`      return await deleteBlob(blobObject, this.network, this.keyPair.getKey());`);
    lines.push(`    }`);
    lines.push(`  };`);
    lines.push("");
  }

  lines.push("  $extend<Extension, Args extends any[]>(ExtensionClass: Constructor<Extension>, ...args: Args): this & Extension {");
  lines.push("    const instance = new ExtensionClass(...args);");
  lines.push("    let proto = ExtensionClass.prototype;");
  lines.push("    while (proto && proto !== Object.prototype) {");
  lines.push("      Object.getOwnPropertyNames(proto).filter(name => name !== 'constructor').forEach(name => {");
  lines.push("        const descriptor = Object.getOwnPropertyDescriptor(proto, name);");
  lines.push("        if (descriptor && typeof descriptor.value === 'function') {");
  lines.push("          (this as any)[name] = descriptor.value.bind(this);");
  lines.push("        }");
  lines.push("      });");
  lines.push("      proto = Object.getPrototypeOf(proto);");
  lines.push("    }");
  lines.push("    return this as this & Extension;");
  lines.push("  }");
  lines.push("}");
  lines.push("");
  lines.push("// usage:");
  lines.push("// const keyPair = new KeyPair();");
  lines.push("// const db = new WalrusClient(keyPair);");
  lines.push("// await db.user.create({ email: \"test@example.com\" });");

  return lines.join("\n");
}
