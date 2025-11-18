import { getAllAliases, getSecretFromAlias as getSecret } from "../cli/utils/keys.config";

// Infer the literal union type from the array returned by getAllAliases
type Alias = ReturnType<typeof getAllAliases>[number];

export async function getSecretFromAlias(alias: Alias): Promise<string> {
    const secret = await getSecret(alias);
    return secret;
}