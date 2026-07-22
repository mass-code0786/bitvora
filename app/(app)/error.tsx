"use client";
import { useEffect } from "react";

export default function AuthenticatedRouteError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  const code=error.digest??"CLIENT_ROUTE_ERROR";
  useEffect(()=>{console.error("[bitvora-route-error]",{code,name:error.name})},[code,error.name]);
  return <main className="route-error" role="alert"><div><small>Error code: {code}</small><h1>We could not open this page.</h1><p>Your session is still protected. Retry the page or return home.</p><section><button onClick={reset}>Retry</button><a href="/home">Return home</a></section></div></main>
}
