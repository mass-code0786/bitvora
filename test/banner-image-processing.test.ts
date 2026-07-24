import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { BANNER_OUTPUT_HEIGHT, BANNER_OUTPUT_WIDTH, BannerImageError, processBannerImage } from "@/lib/banner/banner-image.server";

async function imageFile(width:number,height:number,format:"jpeg"|"png"|"webp",name=`banner.${format}`){const pipeline=sharp({create:{width,height,channels:3,background:{r:95,g:65,b:210}}}),bytes=await (format==="jpeg"?pipeline.jpeg({quality:90}):format==="png"?pipeline.png():pipeline.webp({quality:90})).toBuffer(),mime=format==="jpeg"?"image/jpeg":`image/${format}`;return new File([bytes],name,{type:mime})}

describe("banner image processing",()=>{
  it.each([[386,755,"jpeg"],[1080,1920,"jpeg"],[1080,2400,"jpeg"],[720,1600,"png"],[1440,2560,"webp"]] as const)("accepts and processes %sx%s %s",async(width,height,format)=>{const result=await processBannerImage(await imageFile(width,height,format));expect(result.sourceWidth).toBe(width);expect(result.sourceHeight).toBe(height);expect(result.sourceRatio).toBeCloseTo(width/height);expect([result.width,result.height,result.mimeType,result.extension]).toEqual([BANNER_OUTPUT_WIDTH,BANNER_OUTPUT_HEIGHT,"image/webp","webp"]);const decoded=await sharp(result.bytes).metadata();expect([decoded.width,decoded.height,decoded.format]).toEqual([1080,1920,"webp"])});
  it("rejects a landscape image with the safe portrait message",async()=>{await expect(processBannerImage(await imageFile(1200,700,"jpeg"))).rejects.toMatchObject({code:"PORTRAIT_REQUIRED",message:"Please upload a portrait banner image."})});
  it("rejects a square image",async()=>{await expect(processBannerImage(await imageFile(1080,1080,"png"))).rejects.toMatchObject({code:"PORTRAIT_REQUIRED"})});
  it("rejects an image below minimum dimensions",async()=>{await expect(processBannerImage(await imageFile(300,1000,"png"))).rejects.toBeInstanceOf(BannerImageError)});
  it("honors EXIF orientation before portrait validation",async()=>{const bytes=await sharp({create:{width:2400,height:1080,channels:3,background:"#6541d2"}}).jpeg().withMetadata({orientation:6}).toBuffer(),result=await processBannerImage(new File([bytes],"mobile.jpg",{type:"image/jpeg"}));expect([result.sourceWidth,result.sourceHeight]).toEqual([1080,2400])});
  it("rejects corrupted content even when its MIME and outer signature claim JPEG",async()=>{const corrupt=new File([Buffer.from([0xff,0xd8,1,2,3,4,0xff,0xd9])],"broken.jpg",{type:"image/jpeg"});await expect(processBannerImage(corrupt)).rejects.toMatchObject({code:"PROCESSING_FAILED",message:"We could not process this image. Please try another JPG, PNG, or WEBP file."})});
  it("rejects a MIME/signature mismatch",async()=>{const png=await imageFile(720,1280,"png"),mismatch=new File([await png.arrayBuffer()],"fake.jpg",{type:"image/jpeg"});await expect(processBannerImage(mismatch)).rejects.toMatchObject({code:"PROCESSING_FAILED"})});
});
