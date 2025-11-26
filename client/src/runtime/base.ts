import { ClientWithExtensions } from "@mysten/sui/dist/cjs/experimental";
import { WalrusActiveNetwork } from "../@types/param";
import { Key } from "../core/keyPair";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { walrus, WalrusClient } from "@mysten/walrus";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { SealClient } from "@mysten/seal";
import { serverObjectIds } from "../constants/move";

export class PatternConfig {
    /** Active keypair used for Sui signing */
    protected keyPair!: Ed25519Keypair;

    /** Sui fullnode client */
    suiClient!: SuiClient;

    /** Seal client used for encryption + sealing operations */
    sealClient!: SealClient;

    /** Loaded WALRUS DB Key object */
    protected key!: Key;

    /** Active network (e.g., "testnet" | "devnet" | "mainnet") */
    protected network!: WalrusActiveNetwork["network"];

    /** JSON-RPC client extended with Walrus upload API */
    suiJsonRpcClient!: ClientWithExtensions<{ walrus: WalrusClient }, SuiJsonRpcClient>;

    /**
     * Initializes PatternConfig with a key and network.
     * 
     * This sets up:
     *  - Ed25519 keypair
     *  - Sui RPC client
     *  - Seal client with configured key servers
     *  - Walrus-extended JSON-RPC client
     *
     * @param key - WALRUS DB key (+ secret used to derive keypair)
     * @param network - Active Sui network (e.g. "testnet")
     */
    protected $init(key: Key, network: WalrusActiveNetwork["network"]): void {
        this.key = key;
        this.network = network;

        // Setup signing keypair
        this.keyPair = Ed25519Keypair.fromSecretKey(this.key.secret);

        // Setup base Sui client
        this.suiClient = new SuiClient({
            url: getFullnodeUrl(this.network),
        });

        // Setup Seal client with server object IDs
        this.sealClient = new SealClient({
            suiClient: this.suiClient,
            serverConfigs: serverObjectIds.map((id) => ({
                objectId: id,
                weight: 1,
            })),
            verifyKeyServers: false,
        });

        // Setup Walrus extended JSON-RPC client
        this.suiJsonRpcClient = new SuiJsonRpcClient({
            url: getFullnodeUrl(this.network),
            network: this.network,
        }).$extend(
            walrus({
                uploadRelay: {
                    host: "https://upload-relay.testnet.walrus.space",
                    sendTip: {
                        max: 1_000,
                    },
                },
            })
        );
    }

    /**
     * Overrides (or injects) a new keypair, Sui client, and Seal client.
     * 
     * Useful for testing, mocking, or reloading connected clients without re-running `$init`.
     *
     * @param keyPair - New Ed25519 keypair instance
     * @param suiClient - Sui RPC client instance
     * @param sealClient - Seal client instance
     */
    protected $set(
        keyPair: Ed25519Keypair,
        suiClient: SuiClient,
        sealClient: SealClient
    ): void {
        this.keyPair = keyPair;
        this.suiClient = suiClient;
        this.sealClient = sealClient;
    }
}
