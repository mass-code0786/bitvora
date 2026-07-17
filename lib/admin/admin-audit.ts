import type { AdminAuditEntry } from "./admin-types";
export const ADMIN_AUDIT_KEY="bitvora-admin-audit-v1";
export const loadAudit=():AdminAuditEntry[]=>{try{return JSON.parse(localStorage.getItem(ADMIN_AUDIT_KEY)??"[]")}catch{return[]}};
export function appendAudit(entry:Omit<AdminAuditEntry,"id"|"timestamp">){const current=loadAudit(),record={...entry,id:`ADMIN_AUDIT:${entry.actionType}:${crypto.randomUUID()}`,timestamp:Date.now()};localStorage.setItem(ADMIN_AUDIT_KEY,JSON.stringify([record,...current]));return record}
