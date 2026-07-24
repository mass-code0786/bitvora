import "server-only";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { KycRecord } from "./kyc-types";
export const KYC_DATA_DIR=process.env.KYC_DATA_DIR?path.resolve(process.env.KYC_DATA_DIR):path.join(process.cwd(),".data"),KYC_UPLOAD_DIR=path.join(KYC_DATA_DIR,"kyc-uploads"),KYC_RECORD_FILE=path.join(KYC_DATA_DIR,"kyc-records.json");
let queue=Promise.resolve();
async function readAll(){try{const value=JSON.parse(await readFile(KYC_RECORD_FILE,"utf8"));return Array.isArray(value)?value as KycRecord[]:[]}catch{return[]}}
async function writeAll(records:KycRecord[]){await mkdir(KYC_DATA_DIR,{recursive:true});const temporary=path.join(KYC_DATA_DIR,`.kyc-records-${randomUUID()}.tmp`);try{await writeFile(temporary,JSON.stringify(records,null,2),{encoding:"utf8",flag:"wx"});await rename(temporary,KYC_RECORD_FILE)}catch(error){await rm(temporary,{force:true}).catch(()=>undefined);throw error}}
export async function listKycRecords(){await queue;return readAll()}
export async function findKycByUserId(userId:string){return(await listKycRecords()).find(item=>item.userId===userId)??null}
export async function findKycByUid(uid:string){return(await listKycRecords()).find(item=>item.userUid===uid)??null}
export async function saveKycRecord(record:KycRecord){queue=queue.catch(()=>undefined).then(async()=>{const records=await readAll();await writeAll([record,...records.filter(item=>item.id!==record.id)])});await queue;return record}
