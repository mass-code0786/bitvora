import { NextResponse } from "next/server";
import { getMinimumForNetwork, mockEnabled } from "@/lib/nowpayments/deposit-service.server";
import { NOWPAYMENTS_NETWORKS } from "@/lib/nowpayments/config";
import { depositApiError } from "@/lib/nowpayments/route-utils.server";
export async function GET(){try{const network="USDT_BEP20" as const,minimum=process.env.NOWPAYMENTS_DEPOSIT_ENABLED==="true"?await getMinimumForNetwork(network):null;return NextResponse.json({enabled:process.env.NOWPAYMENTS_DEPOSIT_ENABLED==="true",mock:mockEnabled(),minimum,network,config:NOWPAYMENTS_NETWORKS[network]})}catch(error){return depositApiError(error)}}
