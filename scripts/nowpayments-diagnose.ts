import "dotenv/config";

const apiBase=(process.env.NOWPAYMENTS_API_URL??process.env.NOWPAYMENTS_API_BASE_URL??"https://api.nowpayments.io/v1").replace(/\/$/,"");
const publicBase=process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,"")??"";
const callbackUrl=publicBase?`${publicBase}/api/deposits/nowpayments/ipn`:"MISSING";
const present=(value:string|undefined)=>value?"PRESENT":"MISSING";

async function connectivity(){
  if(!process.env.NOWPAYMENTS_API_KEY)return{status:"SKIPPED (API key missing)",error:"API key missing"};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10_000);
  try{
    const response=await fetch(`${apiBase}/status`,{headers:{"x-api-key":process.env.NOWPAYMENTS_API_KEY},signal:controller.signal});
    return response.ok?{status:`OK (${response.status})`,error:"NONE"}:{status:`FAILED (${response.status})`,error:`Provider status endpoint returned HTTP ${response.status}`};
  }catch(error){
    return error instanceof Error&&error.name==="AbortError"?{status:"FAILED (timeout)",error:"Provider status request timed out"}:{status:"FAILED (request error)",error:error instanceof Error?error.name:"Unknown error"};
  }finally{clearTimeout(timer)}
}

async function main(){
  const provider=await connectivity();
  const result={
    "Deposit enabled":process.env.NOWPAYMENTS_DEPOSIT_ENABLED==="true"?"YES":"NO",
    "API key":present(process.env.NOWPAYMENTS_API_KEY),
    "IPN secret":present(process.env.NOWPAYMENTS_IPN_SECRET),
    "Base URL":apiBase,
    "Public application URL":publicBase||"MISSING",
    "Generated callback URL":callbackUrl,
    "Deposit API route":"/api/deposits/nowpayments/create",
    "Webhook route":"/api/deposits/nowpayments/ipn",
    "NOWPayments API connectivity":provider.status,
    "Latest sanitized error":provider.error,
  };
  for(const[key,value]of Object.entries(result))console.log(`${key}: ${value}`);
}

void main();
