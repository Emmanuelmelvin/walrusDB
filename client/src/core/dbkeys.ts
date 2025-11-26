import { getActiveAlias, getSecretFromAlias as getSecret } from "../cli/utils/keys.config";

/**
 * 
 * @param alias Alias used in creating key/secret
 * @returns The secret associated with the provided alias
 */
export async function getSecretFromAlias(alias: string): Promise<string> {
    const secret = await getSecret(alias);
    return secret;
}

/**
 * @description Helper function to get secret created from cli
 * @returns Secret for active key
 */
export async function getSecretFromActiveAlias(): Promise<string> {
    return (await getActiveAlias())
}