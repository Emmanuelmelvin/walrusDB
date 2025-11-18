export interface WalrusField {
  type: string;
  optional?: boolean;
}

export type WalrusModel = Record<string, string | WalrusField>;

export interface WalrusGeneratorConfig {
  [generatorName: string]: Record<string, string>;
}

export interface ParsedWalrusSchema {
  generator?: WalrusGeneratorConfig;
  models: Record<string, WalrusModel>;
}
