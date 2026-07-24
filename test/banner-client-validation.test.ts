import { afterEach,describe,expect,it,vi } from "vitest";
import { bannerUploadReady,decodeBannerDimensions,validateBannerDimensions } from "@/lib/banner/banner-validation";

describe("banner client validation",()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it.each([[1080,2400],[1080,1920],[720,1600],[1440,2560]])("accepts decoded %sx%s portrait dimensions",(width,height)=>expect(validateBannerDimensions({width,height})).toBeNull());
  it("rejects landscape and square dimensions",()=>{expect(validateBannerDimensions({width:1200,height:700})).toContain("portrait");expect(validateBannerDimensions({width:1080,height:1080})).toContain("portrait")});
  it("waits for delayed decode dimensions",async()=>{let resolve!:()=>void;const decoded=new Promise<void>(done=>{resolve=done}),close=vi.fn();vi.stubGlobal("createImageBitmap",vi.fn(async()=>{await decoded;return{width:1080,height:2400,close}}));const pending=decodeBannerDimensions(new Blob(),"blob:test");let settled=false;void pending.then(()=>{settled=true});await Promise.resolve();expect(settled).toBe(false);resolve();await expect(pending).resolves.toEqual({width:1080,height:2400});expect(close).toHaveBeenCalled()});
  it("requests orientation-correct decoding for mobile images",async()=>{const bitmap=vi.fn(async()=>({width:1080,height:2400,close:vi.fn()}));vi.stubGlobal("createImageBitmap",bitmap);await decodeBannerDimensions(new Blob(),"blob:test");expect(bitmap).toHaveBeenCalledWith(expect.any(Blob),{imageOrientation:"from-image"})});
  it("enables upload only for a valid decoded crop source",()=>{expect(bannerUploadReady(true,{width:1080,height:2400},"valid",false)).toBe(true);expect(bannerUploadReady(true,null,"decoding",false)).toBe(false);expect(bannerUploadReady(true,{width:1200,height:700},"invalid",false)).toBe(false);expect(bannerUploadReady(true,{width:1080,height:2400},"valid",true)).toBe(false)});
  it("clears a stale error before decoding a new selection",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile("components/admin/banner-management.tsx","utf8")),clear=source.indexOf('setMessage(\"\");if(!BANNER_ACCEPTED_TYPES'),decode=source.indexOf("decodeBannerDimensions(file,url)");expect(clear).toBeGreaterThan(0);expect(clear).toBeLessThan(decode)});
});
