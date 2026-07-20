import { z } from "zod";
export type Cursor={at:Date;id:string};
export const pageSize=(value:string|null,fallback=25)=>Math.min(50,Math.max(1,z.coerce.number().int().catch(fallback).parse(value??fallback)));
export function encodeCursor(at:Date,id:string){return Buffer.from(`${at.toISOString()}|${id}`,"utf8").toString("base64url")}
export function decodeCursor(value:string|null):Cursor|null{if(!value)return null;try{const [raw,id]=Buffer.from(value,"base64url").toString("utf8").split("|");const at=new Date(raw);return id&&!Number.isNaN(at.getTime())?{at,id}:null}catch{return null}}
export const olderThan=(cursor:Cursor|null,dateField="createdAt")=>cursor?{OR:[{[dateField]:{lt:cursor.at}},{[dateField]:cursor.at,id:{lt:cursor.id}}]}:{};

