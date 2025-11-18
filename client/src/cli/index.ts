#!/usr/bin/env node

import { Command } from "commander";
import { generateCommand } from "./commands/generate";
import { initializeWalrusDBClientKeyAndSecret } from "./commands/initialize-walrusdb";
import { info, error } from "./utils/log";
import { getActiveAlias, getAllKeysByTheirAliases, getKeyFromAlias, setActiveAlias } from "./utils/keys.config";

const program = new Command();

program
  .name("walrusdb")
  .description("WalrusDB CLI")
  .version("1.0.0");

/**
 * Helper to run async actions with error handling
 */
async function runSafe(action: () => Promise<void>) {
  try {
    await action();
  } catch (err: any) {
    error("WalrusDB error:");
    error(err?.message ?? err);
    process.exit(1);
  }
}

// walrusdb generate
program
  .command("generate")
  .description("Parse walrus/schema.walrus -> walrus/schema.json + client.ts")
  .action(() => runSafe(generateCommand));

// walrusdb initialize --alias <name>
program
  .command("initialize")
  .description("Initialize walrusdb client keys")
  .requiredOption("--alias <name>", "Alias for the client configuration")
  .action((options: { alias: string }) =>
    runSafe(() => initializeWalrusDBClientKeyAndSecret(options.alias))
  );

// walrusdb use <alias>
program
  .command("use <alias>")
  .description("Set active walrusdb alias")
  .action((alias: string) =>
    runSafe(async () => {
      setActiveAlias(alias);
      info(`Now using: ${alias}`);
    })
  );

// walrusdb active-key
program
  .command("active-key")
  .description("Get the walrusdb key of the active alias")
  .action(() =>
    runSafe(async () => {
      const alias = await getActiveAlias();
      if (!alias) throw new Error("No active alias set.");
      const key = await getKeyFromAlias(alias);
      info(`Alias: ${alias}\nKey: ${key}`);
    })
  );

// walrusdb keys
program
  .command("keys")
  .description("Get all walrusdb client keys")
  .action(() =>
    runSafe(async () => {
      const { aliases, keys } = await getAllKeysByTheirAliases();
      if (!aliases.length) {
        info("No keys have been initialized yet.");
        return;
      }
      aliases.forEach((alias, index) => {
        info(`• ${alias}: ${keys[index]}`);
      });
    })
  );

program.parse(process.argv);
