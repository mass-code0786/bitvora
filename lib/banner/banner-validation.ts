export const BANNER_MIN_SOURCE_WIDTH=360;
export const BANNER_MIN_SOURCE_HEIGHT=640;
export const BANNER_ACCEPTED_TYPES=new Set(["image/jpeg","image/jpg","image/png","image/webp"]);
export type BannerDimensions={width:number;height:number};
export type BannerValidationState="idle"|"decoding"|"valid"|"invalid";

export function validateBannerDimensions({width,height}:BannerDimensions){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return"We could not read this image's dimensions.";
  if(height<=width)return"Please upload a portrait banner image.";
  if(width<BANNER_MIN_SOURCE_WIDTH||height<BANNER_MIN_SOURCE_HEIGHT)return`Banner image must be at least ${BANNER_MIN_SOURCE_WIDTH}×${BANNER_MIN_SOURCE_HEIGHT}.`;
  return null;
}

export function bannerUploadReady(filePresent:boolean,dimensions:BannerDimensions|null,state:BannerValidationState,busy:boolean){
  return Boolean(filePresent&&dimensions&&state==="valid"&&!busy);
}

export async function decodeBannerDimensions(file:Blob,sourceUrl:string):Promise<BannerDimensions>{
  if(typeof createImageBitmap==="function"){
    const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
    try{return{width:bitmap.width,height:bitmap.height}}finally{bitmap.close()}
  }
  const image=new Image();
  image.src=sourceUrl;
  if(typeof image.decode==="function")await image.decode();
  else await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("IMAGE_DECODE_FAILED"))});
  return{width:image.naturalWidth,height:image.naturalHeight};
}
