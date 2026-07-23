import { Contract,JsonRpcProvider,Wallet,id,keccak256,parseUnits,type TransactionReceipt } from "ethers";
import { readFile } from "node:fs/promises";
import { withdrawalConfig } from "./config.server";
import { normalizeEvmAddress } from "./address.server";

const ERC20_ABI=["function transfer(address to,uint256 amount) returns (bool)","function balanceOf(address owner) view returns (uint256)"];
export type PreparedWithdrawal={rawTransaction:string;signedTransactionHash:string;networkFee:bigint;nonce:number};
export interface WithdrawalSigner{
  getAddress():Promise<string>;
  getBalance():Promise<{native:bigint;token:bigint}>;
  getPendingNonce():Promise<number>;
  estimateNetworkFee(to:string,amountBaseUnits:bigint):Promise<bigint>;
  prepareTransaction(to:string,amountBaseUnits:bigint,nonce:number):Promise<PreparedWithdrawal>;
  sendTransaction(rawTransaction:string):Promise<string>;
  getTransactionReceipt(txHash:string):Promise<TransactionReceipt|null>;
  getBlockNumber():Promise<number>;
}
async function loadWallet(provider:JsonRpcProvider){
  const config=withdrawalConfig();
  if(config.WITHDRAWAL_SIGNER_TYPE==="KMS")throw new Error("KMS_SIGNER_ADAPTER_NOT_CONFIGURED");
  if(config.WITHDRAWAL_SIGNER_TYPE==="KEYSTORE"){
    if(!config.WITHDRAWAL_KEYSTORE_PATH||!config.WITHDRAWAL_KEYSTORE_PASSWORD)throw new Error("KEYSTORE_SIGNER_NOT_CONFIGURED");
    return Wallet.fromEncryptedJson(await readFile(config.WITHDRAWAL_KEYSTORE_PATH,"utf8"),config.WITHDRAWAL_KEYSTORE_PASSWORD).then(wallet=>wallet.connect(provider));
  }
  if(!config.WITHDRAWAL_PRIVATE_KEY)throw new Error("ENV_SIGNER_NOT_CONFIGURED");
  return new Wallet(config.WITHDRAWAL_PRIVATE_KEY,provider);
}
export async function createProductionSigner():Promise<WithdrawalSigner>{
  const config=withdrawalConfig();
  if(!config.WITHDRAWAL_RPC_URL)throw new Error("WITHDRAWAL_RPC_NOT_CONFIGURED");
  if(!config.WITHDRAWAL_TOKEN_CONTRACT)throw new Error("WITHDRAWAL_TOKEN_NOT_CONFIGURED");
  const provider=new JsonRpcProvider(config.WITHDRAWAL_RPC_URL,config.WITHDRAWAL_CHAIN_ID,{staticNetwork:true}),wallet=await loadWallet(provider),token=new Contract(normalizeEvmAddress(config.WITHDRAWAL_TOKEN_CONTRACT),ERC20_ABI,wallet);
  const address=await wallet.getAddress();
  return{
    getAddress:async()=>address,
    getBalance:async()=>({native:await provider.getBalance(address),token:await token.balanceOf(address) as bigint}),
    getPendingNonce:async()=>provider.getTransactionCount(address,"pending"),
    estimateNetworkFee:async(to,amount)=>{const data=token.interface.encodeFunctionData("transfer",[normalizeEvmAddress(to),amount]),gas=await provider.estimateGas({from:address,to:await token.getAddress(),data}),fees=await provider.getFeeData();return gas*(fees.maxFeePerGas??fees.gasPrice??BigInt(0))},
    prepareTransaction:async(to,amount,nonce)=>{
      const transaction=await token.transfer.populateTransaction(normalizeEvmAddress(to),amount),gasLimit=await provider.estimateGas({...transaction,from:address}),fees=await provider.getFeeData();
      const rawTransaction=await wallet.signTransaction({...transaction,chainId:config.WITHDRAWAL_CHAIN_ID,nonce,gasLimit,type:2,maxFeePerGas:fees.maxFeePerGas??fees.gasPrice??BigInt(0),maxPriorityFeePerGas:fees.maxPriorityFeePerGas??BigInt(0)});
      return{rawTransaction,signedTransactionHash:keccak256(rawTransaction),networkFee:gasLimit*(fees.maxFeePerGas??fees.gasPrice??BigInt(0)),nonce};
    },
    sendTransaction:async raw=>(await provider.broadcastTransaction(raw)).hash,
    getTransactionReceipt:async hash=>provider.getTransactionReceipt(hash),
    getBlockNumber:async()=>provider.getBlockNumber()
  };
}
export const withdrawalAmountBaseUnits=(amount:string)=>parseUnits(amount,withdrawalConfig().WITHDRAWAL_TOKEN_DECIMALS);
export const signerAddressLockKey=(address:string)=>id(`BITVORA_WITHDRAWAL_NONCE:${address.toLowerCase()}`);
