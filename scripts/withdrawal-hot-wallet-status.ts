import { formatEther,formatUnits } from "ethers";
import { createProductionSigner } from "@/lib/withdrawals/signer.server";
import { withdrawalConfig } from "@/lib/withdrawals/config.server";
async function main(){const config=withdrawalConfig(),signer=await createProductionSigner(),address=await signer.getAddress(),balance=await signer.getBalance(),nonce=await signer.getPendingNonce();console.log(JSON.stringify({network:config.WITHDRAWAL_NETWORK,chainId:config.WITHDRAWAL_CHAIN_ID,signerAddress:address,nativeGasBalance:formatEther(balance.native),tokenBalance:formatUnits(balance.token,config.WITHDRAWAL_TOKEN_DECIMALS),pendingNonce:nonce,automationEnabled:config.WITHDRAWAL_AUTOMATION_ENABLED==="true"},null,2))}
main().catch(error=>{console.error(JSON.stringify({errorCode:error instanceof Error?error.name:"UNKNOWN",message:"Unable to inspect configured hot wallet safely."}));process.exit(1)});
