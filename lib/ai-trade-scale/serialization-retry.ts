type ErrorRecord={code?:unknown;sqlState?:unknown;sqlstate?:unknown;meta?:unknown;cause?:unknown;database_error?:unknown};
type RetryOptions={maxRetries?:number;baseDelayMs?:number;random?:()=>number;sleep?:(delayMs:number)=>Promise<void>};

const record=(value:unknown):ErrorRecord|null=>typeof value==="object"&&value!==null?value as ErrorRecord:null;
const has40001=(value:unknown)=>{
  const error=record(value);if(!error)return false;
  const meta=record(error.meta),databaseError=record(meta?.database_error)??record(meta?.cause);
  return [error.code,error.sqlState,error.sqlstate,meta?.code,meta?.sqlState,meta?.sqlstate,databaseError?.code,databaseError?.sqlState,databaseError?.sqlstate].includes("40001");
};

export const isPostgresSerializationFailure=(error:unknown)=>has40001(error);

export async function withPostgresSerializationRetry<T>(operation:()=>Promise<T>,options:RetryOptions={}){
  const maxRetries=options.maxRetries??5,baseDelayMs=options.baseDelayMs??50,random=options.random??Math.random,sleep=options.sleep??(delayMs=>new Promise(resolve=>setTimeout(resolve,delayMs)));
  for(let retry=0;;retry++){
    try{return await operation()}catch(error){
      if(!isPostgresSerializationFailure(error)||retry>=maxRetries)throw error;
      const exponential=baseDelayMs*2**retry,jitter=Math.floor(random()*exponential);
      await sleep(exponential+jitter);
    }
  }
}
