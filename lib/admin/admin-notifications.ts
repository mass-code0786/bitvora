import type { AdminNotification } from "./admin-types";
export const ADMIN_NOTIFICATIONS_KEY="bitvora-admin-notifications-v1";
export const loadAdminNotifications=():AdminNotification[]=>{try{return JSON.parse(localStorage.getItem(ADMIN_NOTIFICATIONS_KEY)??"[]")}catch{return[]}};
export function sendAdminNotification(input:{targetUid:string|"ALL";title:string;message:string;type:string;adminId:string;idempotencyKey:string}){const current=loadAdminNotifications(),id=`ADMIN_NOTICE:${input.targetUid}:${input.idempotencyKey}`;if(current.some(item=>item.id===id))return current;const record:AdminNotification={...input,id,read:false,createdAt:Date.now()};const next=[record,...current];localStorage.setItem(ADMIN_NOTIFICATIONS_KEY,JSON.stringify(next));return next}
