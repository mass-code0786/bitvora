import { MAX_KYC_FILE_SIZE, KYC_MIME_EXTENSIONS, requiresBack } from "./kyc-validation";
import type { KycDocumentType } from "./kyc-types";

export const KYC_UPLOAD_TIMEOUT_MS=60_000;
const allowedMime=new Set<string>(Object.keys(KYC_MIME_EXTENSIONS));

export class KycUploadClientError extends Error {
  constructor(public code:string,message:string,public status:number|null=null){super(message)}
}

export function validateKycUploadFiles(type:KycDocumentType,files:{front:File|null;back:File|null;selfie:File|null}){
  const required:Array<[string,File|null]>=[["Front image",files.front],["Selfie image",files.selfie]];
  if(requiresBack(type))required.push(["Back image",files.back]);
  for(const[label,file]of required)if(!file||file.size===0)throw new KycUploadClientError("FILE_REQUIRED",`${label} is required.`);
  for(const[label,file]of [["Front image",files.front],["Back image",files.back],["Selfie image",files.selfie]] as const){
    if(!file||file.size===0)continue;
    if(file.size>MAX_KYC_FILE_SIZE)throw new KycUploadClientError("FILE_TOO_LARGE",`${label} exceeds the 8 MB limit.`);
    if(!allowedMime.has(file.type))throw new KycUploadClientError("UNSUPPORTED_FILE_TYPE",`${label} must be JPEG, PNG, or WEBP.`);
  }
}

async function responseBody(response:Response){
  const text=await response.text();
  if(!text)return null;
  try{return JSON.parse(text) as unknown}catch{return null}
}

const messageForStatus=(status:number)=>{
  if(status===401)return"Your session has expired. Sign in and try again.";
  if(status===403)return"You are not authorized to submit KYC for this account.";
  if(status===413)return"Your images are too large for the upload server. Choose smaller images or contact support.";
  if(status>=500)return"The KYC service could not save your submission. Please retry.";
  return"KYC submission failed. Check the form and try again.";
};

export async function uploadKycForm(form:FormData,options:{fetcher?:typeof fetch;timeoutMs?:number}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),options.timeoutMs??KYC_UPLOAD_TIMEOUT_MS);
  try{
    const response=await(options.fetcher??fetch)("/api/kyc/submit",{method:"POST",body:form,signal:controller.signal});
    const value=await responseBody(response);
    if(!response.ok){
      const candidate=value&&typeof value==="object"&&"error" in value?String(value.error):messageForStatus(response.status);
      const code=value&&typeof value==="object"&&"code" in value?String(value.code):`HTTP_${response.status}`;
      throw new KycUploadClientError(code,candidate,response.status);
    }
    if(!value||typeof value!=="object")throw new KycUploadClientError("INVALID_RESPONSE","The KYC server returned an invalid response. Please retry.",response.status);
    return value;
  }catch(error){
    if(error instanceof KycUploadClientError)throw error;
    if(error instanceof Error&&error.name==="AbortError")throw new KycUploadClientError("UPLOAD_TIMEOUT","The upload timed out. Check your connection and try again.");
    throw new KycUploadClientError("NETWORK_ERROR","The upload could not reach the server. Check your connection and try again.");
  }finally{clearTimeout(timer)}
}
