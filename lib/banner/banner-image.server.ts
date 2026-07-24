import sharp from "sharp";
import { BANNER_MIN_SOURCE_HEIGHT,BANNER_MIN_SOURCE_WIDTH,validateBannerDimensions } from "./banner-validation";

export const BANNER_MAX_BYTES=8*1024*1024;
export const BANNER_OUTPUT_WIDTH=1080;
export const BANNER_OUTPUT_HEIGHT=1920;
const MAX_INPUT_PIXELS=40_000_000;

const formats:Record<string,{sharpFormat:"jpeg"|"png"|"webp";magic:(bytes:Buffer)=>boolean}>={
  "image/jpeg":{sharpFormat:"jpeg",magic:bytes=>bytes.length>4&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[bytes.length-2]===0xff&&bytes[bytes.length-1]===0xd9},
  "image/jpg":{sharpFormat:"jpeg",magic:bytes=>bytes.length>4&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[bytes.length-2]===0xff&&bytes[bytes.length-1]===0xd9},
  "image/png":{sharpFormat:"png",magic:bytes=>bytes.length>24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))},
  "image/webp":{sharpFormat:"webp",magic:bytes=>bytes.length>30&&bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP"},
};

export class BannerImageError extends Error{constructor(public code:"MISSING"|"TOO_LARGE"|"UNSUPPORTED"|"TOO_SMALL"|"PORTRAIT_REQUIRED"|"PROCESSING_FAILED",message:string){super(message)}}

export async function processBannerImage(value:FormDataEntryValue|null){
  if(!(value instanceof File)||!value.size)throw new BannerImageError("MISSING","Choose a banner image.");
  if(value.size>BANNER_MAX_BYTES)throw new BannerImageError("TOO_LARGE","Banner must be 8 MB or smaller.");
  const declared=formats[value.type.toLowerCase()];
  if(!declared)throw new BannerImageError("UNSUPPORTED","We could not process this image. Please try another JPG, PNG, or WEBP file.");
  const source=Buffer.from(await value.arrayBuffer());
  if(!declared.magic(source))throw new BannerImageError("PROCESSING_FAILED","We could not process this image. Please try another JPG, PNG, or WEBP file.");
  try{
    const pipeline=sharp(source,{failOn:"error",limitInputPixels:MAX_INPUT_PIXELS}),metadata=await pipeline.metadata();
    if(metadata.format!==declared.sharpFormat||!metadata.width||!metadata.height)throw new Error("Decoded image metadata is invalid.");
    const rotated=Boolean(metadata.orientation&&metadata.orientation>=5),sourceWidth=rotated?metadata.height:metadata.width,sourceHeight=rotated?metadata.width:metadata.height,ratio=sourceWidth/sourceHeight,validation=validateBannerDimensions({width:sourceWidth,height:sourceHeight});
    if(validation)throw new BannerImageError(sourceWidth>=sourceHeight?"PORTRAIT_REQUIRED":sourceWidth<BANNER_MIN_SOURCE_WIDTH||sourceHeight<BANNER_MIN_SOURCE_HEIGHT?"TOO_SMALL":"PROCESSING_FAILED",validation);
    const bytes=await pipeline.rotate().resize(BANNER_OUTPUT_WIDTH,BANNER_OUTPUT_HEIGHT,{fit:"cover",position:"centre",withoutEnlargement:false}).webp({quality:90,effort:4,smartSubsample:true}).toBuffer();
    return{bytes,mimeType:"image/webp",extension:"webp",fileSize:bytes.length,width:BANNER_OUTPUT_WIDTH,height:BANNER_OUTPUT_HEIGHT,sourceWidth,sourceHeight,sourceRatio:ratio};
  }catch(error){if(error instanceof BannerImageError)throw error;throw new BannerImageError("PROCESSING_FAILED","We could not process this image. Please try another JPG, PNG, or WEBP file.")}
}
