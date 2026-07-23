import { getAddress } from "ethers";
export function normalizeEvmAddress(value:string){const address=getAddress(value.trim());if(address==="0x0000000000000000000000000000000000000000")throw new Error("ZERO_ADDRESS");return address}
