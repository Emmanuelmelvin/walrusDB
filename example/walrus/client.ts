// Auto-generated Walrus client

// Auto-generated types from schema.walrus

export interface User {
  id: string;
  email?: string;
  options?: CreateOptions
}

export type WalrusModels = {
  "User": User;
};

export interface WalrusGeneratorConfig {
  walrus: {
    url: string;
  };
}


export interface WalrusGeneratorConfig {
  walrus: { url: string };
}

type Constructor<T = {}> = new (...args: any[]) => T;

import { CreateOptions, DeleteOptions, WalrusActiveNetwork, ReadOptions  } from "walrusdb/src/@types/param";
import { storeBlob, fetchBlob, deleteBlob } from "walrusdb/src/runtime/walrus-client";
import { validateAgainstSchema } from "walrusdb/src/runtime/validators";
import { KeyPair } from "walrusdb/src/core/keyPair";

export class WalrusClient {
  #url: string = "https://storage.walrus.node.io";
  network: WalrusActiveNetwork["network"] = 'testnet';
  keyPair: KeyPair;

  constructor(keyPair: KeyPair, walrusConfig?: WalrusGeneratorConfig, nodeConfig?: WalrusActiveNetwork) {
    if (walrusConfig) this.#url = walrusConfig.walrus.url;
    if (nodeConfig) this.network = nodeConfig.network;
    this.keyPair = keyPair;
  }

  user = {
    create: async (data: Partial<User>) => {
      validateAgainstSchema("User", data);
      const blob = await storeBlob(
        data,
        this.#url,
        this.network,
        this.keyPair.getKey(),
      );
      return { blob, data };
    },

    findById: async (blob: ReadOptions): Promise<User | null> => {
      const data = await fetchBlob(
        blob,
        this.network
      );
      const decoded = new TextDecoder().decode(data)
        return JSON.parse(decoded);
    },

    delete: async (blobObject: DeleteOptions): Promise<boolean> => {
      const isSuccessful = await deleteBlob(
        blobObject,
        this.network,
        this.keyPair.getKey()
      )
      return isSuccessful;
    }
  };

   $extend<Extension, Args extends any[]>(
    ExtensionClass: Constructor<Extension>,
    ...args: Args
): this & Extension {
    // Pass constructor arguments to ExtensionClass
    const instance = new ExtensionClass(...args);

    // Only bind methods from the prototype
    let proto = ExtensionClass.prototype;
    while (proto && proto !== Object.prototype) {
        Object.getOwnPropertyNames(proto)
            .filter(name => name !== "constructor")
            .forEach(name => {
                const descriptor = Object.getOwnPropertyDescriptor(proto, name);
                if (descriptor && typeof descriptor.value === "function") {
                    (this as any)[name] = descriptor.value.bind(this);
                }
            });
        proto = Object.getPrototypeOf(proto);
    }

    return this as this & Extension;
}

  }

// usage:
// const keyPair = new KeyPair();
// const db = new WalrusClient(keyPair);
// await db.user.create({ email: "test@example.com" });