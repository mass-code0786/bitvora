export type AdminAuthorizationReason="AUTHORIZED"|"NO_SESSION"|"ADMIN_ROLE_REQUIRED";
export class AdminAuthorizationError extends Error {
  constructor(public readonly reason:Exclude<AdminAuthorizationReason,"AUTHORIZED">,public readonly status:401|403){
    super(reason);
    this.name="AdminAuthorizationError";
  }
}

export function adminAuthorizationResponse(error:unknown){
  if(error instanceof AdminAuthorizationError)return{status:error.status,reason:error.reason,error:error.status===401?"Authentication required.":"Administrator access required."} as const;
  return null;
}
