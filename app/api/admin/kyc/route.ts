import { NextResponse } from "next/server";
import { requireDemoAdmin } from "@/lib/admin/admin-auth.server";
import { listKycRecords } from "@/lib/kyc/kyc-store.server";
import { maskDocumentNumber } from "@/lib/kyc/kyc-types";
import { migrateUserRegistry } from "@/lib/user-registry";
export async function GET(){try{await requireDemoAdmin();const records=await listKycRecords(),users=migrateUserRegistry(null).users,byUid=new Map(records.map(item=>[item.userUid,item]));return NextResponse.json({records:users.map(user=>{const item=byUid.get(user.uid);return{userId:user.id,userUid:user.uid,name:user.name,email:user.email,country:item?.country??"",documentType:item?.documentType??null,maskedDocumentNumber:item?maskDocumentNumber(item.documentNumber):null,status:item?.status??"NOT_SUBMITTED",submittedAt:item?.submittedAt??null,submissionVersion:item?.submissionVersion??0,reviewedAt:item?.reviewedAt??null,reviewedBy:item?.reviewedBy??null}}).sort((a,b)=>Number(b.status==="PENDING")-Number(a.status==="PENDING")||(b.submittedAt??0)-(a.submittedAt??0))})}catch{return NextResponse.json({error:"Admin access required."},{status:401})}}
