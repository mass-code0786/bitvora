import { NextResponse } from "next/server";
import { z } from "zod";
import { getMinimumForNetwork, mockEnabled } from "@/lib/nowpayments/deposit-service.server";
import { NOWPAYMENTS_NETWORKS } from "@/lib/nowpayments/config";
import { depositApiError } from "@/lib/nowpayments/route-utils.server";
export async function GET(request:Request){try{const network=z.enum(["USDT_BEP20","USDT_TRC20"]).parse(new URL(request.url).searchParams.get("network")??"USDT_TRC20"),minimum=process.env.NOWPAYMENTS_DEPOSIT_ENABLED==="true"?await getMinimumForNetwork(network):null;return NextResponse.json({enabled:process.env.NOWPAYMENTS_DEPOSIT_ENABLED==="true",mock:mockEnabled(),minimum,network,config:NOWPAYMENTS_NETWORKS[network]})}catch(error){return depositApiError(error)}}
