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
import { WalrusCore } from "walrusdb/src/runtime/walrus-client";
import { validateAgainstSchema } from "walrusdb/src/runtime/validators";
import { KeyPair } from "walrusdb/src/core/keyPair";

export class WalrusClient extends WalrusCore {
      
  #url: string = "https://storage.walrus.node.io";

  constructor(
    keyPair: KeyPair, 
    _walrusConfig?: WalrusGeneratorConfig, 
    nodeConfig?: WalrusActiveNetwork) {
      if(!nodeConfig) nodeConfig = {network: 'testnet'}
      super();
      this.$init(keyPair.getKey(), nodeConfig.network);
  }

  user = {
    create: async (data: Partial<User>) => {
      validateAgainstSchema("User", data);
      const blob = await this.storeBlob(
        data,
        this.#url,
      );
      return { blob, data };
    },

    findById: async (blob: ReadOptions): Promise<User | null> => {
      const data = await this.fetchBlob(
        blob
      );
      const decoded = new TextDecoder().decode(data)
        return JSON.parse(decoded);
    },

    delete: async (blobObject: DeleteOptions): Promise<boolean> => {
      const isSuccessful = await this.deleteBlob(
        blobObject
      )
      return isSuccessful;
    }
  };

  $extend<Extension, Args extends any[]>(
    ExtensionClass: new (...args: Args) => Extension,
    ...args: Args
): this & Extension {
    // Create the extension instance (B)
    const instance = new ExtensionClass(...args);

    Object.getOwnPropertyNames(instance).forEach((key) => {
        if (!(key in this)) {
            (this as any)[key] = (instance as any)[key];
        }
    });
    let proto = ExtensionClass.prototype;
    while (proto && proto !== Object.prototype) {
        Object.getOwnPropertyNames(proto)
            .filter((name) => name !== "constructor")
            .forEach((name) => {
                if (!(name in this)) {
                    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
                    if (descriptor && typeof descriptor.value === "function") {
                        (this as any)[name] = descriptor.value.bind(this);
                    }
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