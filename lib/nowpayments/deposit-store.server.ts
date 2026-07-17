import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DemoDepositRecord } from "./deposit-types";

const directory=path.join(process.cwd(),".data"),file=path.join(directory,"nowpayments-deposits.json");
let queue=Promise.resolve();
async function readAll(){try{const value=JSON.parse(await readFile(file,"utf8"));return Array.isArray(value)?value as DemoDepositRecord[]:[]}catch{return[]}}
async function writeAll(records:DemoDepositRecord[]){await mkdir(directory,{recursive:true});await writeFile(file,JSON.stringify(records,null,2),"utf8")}
export async function listServerDeposits(){await queue;return readAll()}
export async function findDepositByPaymentId(paymentId:string){return(await listServerDeposits()).find(item=>item.providerPaymentId===paymentId)??null}
export async function findDepositByIdempotency(userId:string,key:string){return(await listServerDeposits()).find(item=>item.userId===userId&&item.idempotencyKey===key)??null}
export async function saveServerDeposit(record:DemoDepositRecord){queue=queue.then(async()=>{const records=await readAll(),next=[record,...records.filter(item=>item.id!==record.id)];await writeAll(next)});await queue;return record}
