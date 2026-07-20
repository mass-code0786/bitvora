export type AttachmentKind="image/jpeg"|"image/png"|"image/webp"|"application/pdf";
const ascii=(bytes:Uint8Array,start:number,length:number)=>String.fromCharCode(...bytes.slice(start,start+length));
export function detectAttachmentType(bytes:Uint8Array):AttachmentKind|null{
  if(bytes.length<12)return null;
  if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff&&bytes.at(-2)===0xff&&bytes.at(-1)===0xd9)return"image/jpeg";
  if(bytes.slice(0,8).every((v,i)=>v===[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a][i])&&ascii(bytes,12,4)==="IHDR"&&ascii(bytes,bytes.length-8,4)==="IEND")return"image/png";
  if(ascii(bytes,0,4)==="RIFF"&&ascii(bytes,8,4)==="WEBP"&&["VP8 ","VP8L","VP8X"].includes(ascii(bytes,12,4)))return"image/webp";
  if(ascii(bytes,0,5)==="%PDF-"&&ascii(bytes,Math.max(0,bytes.length-1024),1024).includes("%%EOF"))return"application/pdf";
  return null;
}
export function validateAttachmentBytes(bytes:Uint8Array,declared:string){const detected=detectAttachmentType(bytes);if(!detected)throw new Error("INVALID_ATTACHMENT_SIGNATURE");if(detected!==declared)throw new Error("ATTACHMENT_MIME_MISMATCH");const head=ascii(bytes,0,Math.min(bytes.length,512)).toLowerCase();if(head.includes("<script")||head.includes("<html")||head.startsWith("mz"))throw new Error("UNSAFE_ATTACHMENT");return detected}

