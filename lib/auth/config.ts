export const authStrategy = "database" as const;
export const secureAuthCookie = process.env.NODE_ENV==="production"||process.env.AUTH_URL?.startsWith("https://")===true;
export const sessionCookieName = secureAuthCookie?"__Secure-authjs.session-token":"authjs.session-token";
export const sessionCookieOptions = {httpOnly:true,sameSite:"lax" as const,path:"/",secure:secureAuthCookie};
