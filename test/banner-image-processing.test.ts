import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { BANNER_MAX_RATIO, BANNER_MIN_RATIO, BANNER_OUTPUT_HEIGHT, BANNER_OUTPUT_WIDTH, BannerImageError, processBannerImage } from "@/lib/banner/banner-image.server";

async function imageFile(width:number,height:number,format:"jpeg"|"png"|"webp",name=`banner.${format}`){const pipeline=sharp({create:{width,height,channels:3,background:{r:95,g:65,b:210}}}),bytes=await (format==="jpeg"?pipeline.jpeg({quality:90}):format==="png"?pipeline.png():pipeline.webp({quality:90})).toBuffer(),mime=format==="jpeg"?"image/jpeg":`image/${format}`;return new File([bytes],name,{type:mime})}

describe("banner image processing",()=>{
  it.each([[386,755,"jpeg"],[1080,1920,"jpeg"],[720,1280,"png"],[600,1100,"webp"]] as const)("accepts and processes %sx%s %s",async(width,height,format)=>{const result=await processBannerImage(await imageFile(width,height,format));expect(result.sourceWidth).toBe(width);expect(result.sourceHeight).toBe(height);expect(result.sourceRatio).toBeGreaterThanOrEqual(BANNER_MIN_RATIO);expect(result.sourceRatio).toBeLessThanOrEqual(BANNER_MAX_RATIO);expect([result.width,result.height,result.mimeType,result.extension]).toEqual([BANNER_OUTPUT_WIDTH,BANNER_OUTPUT_HEIGHT,"image/webp","webp"]);const decoded=await sharp(result.bytes).metadata();expect([decoded.width,decoded.height,decoded.format]).toEqual([1080,1920,"webp"])});
  it("rejects a landscape image with the safe portrait message",async()=>{await expect(processBannerImage(await imageFile(1200,700,"jpeg"))).rejects.toMatchObject({code:"PORTRAIT_REQUIRED",message:"Please upload a portrait banner image."})});
  it("rejects an extremely narrow portrait",async()=>{await expect(processBannerImage(await imageFile(300,1000,"png"))).rejects.toBeInstanceOf(BannerImageError)});
  it("rejects corrupted content even when its MIME and outer signature claim JPEG",async()=>{const corrupt=new File([Buffer.from([0xff,0xd8,1,2,3,4,0xff,0xd9])],"broken.jpg",{type:"image/jpeg"});await expect(processBannerImage(corrupt)).rejects.toMatchObject({code:"PROCESSING_FAILED",message:"We could not process this image. Please try another JPG, PNG, or WEBP file."})});
  it("rejects a MIME/signature mismatch",async()=>{const png=await imageFile(720,1280,"png"),mismatch=new File([await png.arrayBuffer()],"fake.jpg",{type:"image/jpeg"});await expect(processBannerImage(mismatch)).rejects.toMatchObject({code:"PROCESSING_FAILED"})});
});
