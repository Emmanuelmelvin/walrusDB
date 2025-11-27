
import { User, WalrusClient } from "./walrus/client";
import { KeyPair } from "walrusdb/src/core/keyPair";
//import { getSecretFromAlias, getSecretFromActiveAlias } from "walrusdb/src/core/dbkeys";
import { SealClient } from "walrusdb/src/core/seal";
import dotenv from 'dotenv';  
dotenv.config();  
const main = async () => {  
//const secret = await getSecretFromAlias("xxx")
const keyPair = new KeyPair({secret: process.env.secret as string});
const walrusClient = new WalrusClient(keyPair).$extend(SealClient)
//const sealClient = new SealClient({key: keyPair.getKey(), network: 'testnet'});
walrusClient.loadConfig();
//const keyId = await walrusClient.createServiceKey({name: "SuscriptionKey", fee: 20, ttl: 100000})
const keyId = await walrusClient.getServiceKeyFromName({name: "SuscriptionKey"})
if(!keyId) return;
const subscription = await walrusClient.createSubscription({fee: keyId.fee, service: keyId.id.id})
console.log(subscription)
if(!subscription) return;
const blob = await walrusClient.encryptWithPatternSubscriptionAndStoreOnWalrus<User>(keyId.id.id, {id: "xxx", email: "emma@chidi"})
const result = await walrusClient.decryptFromWalrusBlobId<User>({blobId: blob.blobId}, "Subscription", {serviceObjectId: keyId.id.id, subscriptionObjectId: subscription} )

console.log(result)
// const computedKeys = walrusClient.createPrivateDataKeys("secret");
// await walrusClient.encryptWithPatternPrivateDataAndStoreOnChain<User>(computedKeys, {
//     id: "xxx",
//     email: "emma@chidi.com"
// } );
// const result = await walrusClient.decryptFromPrivateDataObject<User>( undefined , computedKeys.nonce)
// console.log(result);
//const result = await walrusClient.decryptFromPrivateDataObject<User>("0x88fb2516d11143ecbf44ebec133dea89c1a806e3ba7d903cca47684a7614cf34")
// const bytes = await walrusClient.encryptWithPatternPriateDataAndReturnbytes<User>(computedKeys, { id: "xxxxx", email: "chidi@user"})
// const storage = await walrusClient.user.create({id: Buffer.from(bytes).toString("base64"), email: "chidi@user", options: {deletable: true, epochs: 2}})
// const getBytes = await walrusClient.user.findById({blobId: storage.blob.blobId});
// if(!getBytes) return;
// const decryptedBytes = await walrusClient.decryptFromBuffer<User>(new Uint8Array(Buffer.from(getBytes.id, "base64")), "Private Data", undefined, computedKeys.nonce)
// console.log(decryptedBytes)
//[5,4,0,1,4,5,0,5,5,0,2,5,2,0,1,3,0,0,1,6,6,0,3,7,0,8,0,0,9,0,0,0,1,0,6,0,1,5,4,0,2,5,0,9,9,0,9,6,0,7,1,0,1,7,5,0,8,9,0,9,3,0,2,0,4,0,4,2,0,2,2,0,0,2,1,3,0,1,1,5,0,2,3,3,0,1,5,0,3,3,0,1,3,8,0,9,5,0,2,4,0,0,1,0,0,0,2,0,5,0,1,1,5,0,1,0,1,0,9,9,0,1,1,4,0,1,0,1,0,1,1,6]
// const keyObjectPair = await walrusClient.getAllowListKeyObject("NewAllow")
// console.log(keyObjectPair)
// const result = await walrusClient.encryptWithPatternPrivateDataAndStoreOnChain<User>("Private Data", {
//         id: "xxx", 
//         email: "emmachid", 
//         options: {
//             deletable: true,
//             epochs: 3,
//         },
//     },
//     )
// const result = await walrusClient.addAccountsToAllowList(["0x53572fa4b0158ce717d6a0ad7f0b0e0fd36ef09182ce3da31cfce33ed1537fdc", "xx"])
 //const result = await walrusClient.removeAccountFromAllowList(["0x53572fa4b0158ce717d6a0ad7f0b0e0fd36ef09182ce3da31cfce33ed1537fdc"])
// const objects = await walrusClient.getAllowListKeyObject("NewAllow");
// if(!objects) return;
// console.log(objects)
//  const buffer = await walrusClient.encryptWithPatternAllowListAndReturnBytes<User>({
//     id: "123xxx",
//     email: "emmachid@outlook.com",
//     options: {
//         deletable: true,
//         epochs: 2
//     }},
//     objects.allowList.id.id
// )

// const decryptedData = await walrusClient.decryptFromBuffer<User>(new Uint8Array(Buffer.from(buffer)), "AllowList", objects.allowList.id.id)
// console.log(decryptedData)
//const isSuccessful = await walrusClient.user.delete({blobObject: "0xc309dcabb0de2309f4cc05b6c55680d98bb2b1799e0c474b4838f061d4080ee1"});

//console.log(data);
}
main()


