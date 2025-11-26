import { DeleteBlobOptions, ReadBlobOptions } from "@mysten/walrus";

export interface WalrusActiveNetwork {
  network: 'testnet' | 'devnet' | "mainnet"
}

export interface CreateOptions {
  deletable: boolean,
  attributes?: Record<string, string | null>,
  epochs: number,
  owner?: string,
  signal?: AbortSignal | null
}

export interface ReadOptions extends ReadBlobOptions{}
export interface DeleteOptions extends DeleteBlobOptions{}

export type SealPatterns = "Private Data" | "AllowList" | "Time-Lock" | "Secure Voting" | "Subscription";
export interface Allowlist {
    id: {
      id: string
    }
    name: string;
    list: string[];
}
export interface AllowlistCap {
    id: {
        id: string
    },
    allowlist_id: string
}

export interface PrivateData {
  id: {
    id: string
  },
  creator: string,
  nonce: string,
  data: string
}

export interface EncryptOptions {
    threshold: number
}

export interface SubscriptionOptions {
  serviceObjectId: string,
  subscriptionObjectId: string
}

export interface CreateServiceOptions {
  fee: number,
  ttl: number,
  name: string
}

export interface ServiceCap {
  id: {
    id: string
  },
  service_id: string
}

export interface Service {
  id: {
    id: string
  },
  fee: number,
  ttl: number,
  owner: string,
  name: string
}

export interface GetServiceKeyOption {
  name: string
}

export interface Subscription {
  id: {
    id: string
  },
  service_id: string,
  created_at: string
}

export interface CreateSubscriptionOptions {
  fee: number,
  service: string,
}

export interface TransferSubscriptionOptions{
  serviceId: string,
  to: string
}
export interface CreateTimeLockOptions {
  end_time: number,
  name: string
}
export interface TimeLockData {
  id: {
    id: string
  },
  name: string,
  end_time: number
}
export interface TimeLockDataCap {
  id: {
    id: string
  },
  updatable_tle_id: string
}
export interface UpdateTimeLockOption {
  timeLockId: string,
  end_time: number
}
export type MutateAllowList = "remove" | "add"