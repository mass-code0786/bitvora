"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Eye, LockKeyhole, Mail, MapPin, Sparkles, UserRound } from "lucide-react";
import { normalizeUid } from "@/lib/referral-team-data";
import { Logo } from "./brand";

const countries=["India","Bangladesh","Pakistan","United Arab Emirates","United Kingdom","United States"];
export function AuthForm({mode}:{mode:"login"|"register"}){
 const register=mode==="register",router=useRouter();
 const[name,setName]=useState(""),[country,setCountry]=useState("India"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[showPassword,setShowPassword]=useState(false),[sponsorUid,setSponsorUid]=useState(""),[referralLocked,setReferralLocked]=useState(false);
 useEffect(()=>{if(!register)return;const ref=new URLSearchParams(window.location.search).get("ref");if(ref){setReferralLocked(true);setSponsorUid(normalizeUid(ref))}},[register]);
 async function submit(event:FormEvent){event.preventDefault();setError("");if(register){try{const response=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,country,email,password,referralUid:sponsorUid||undefined})}),payload=await response.json() as {error?:string};if(!response.ok){setError(payload.error??"Registration failed.");return}}catch{setError("Registration is temporarily unavailable.");return}}const result=await signIn("credentials",{email,password,redirect:false});if(result?.error){setError("Invalid email or password.");return}for(let index=sessionStorage.length-1;index>=0;index--){const key=sessionStorage.key(index);if(key?.startsWith("bitvora-banner-dismissed:"))sessionStorage.removeItem(key)}router.push("/home");router.refresh()}
 return <main className="auth-bg min-h-screen px-5 py-8"><div className="ambient ambient-one"/><div className="auth-shell relative z-10 mx-auto max-w-md"><Logo/><div className="mt-14"><p className="eyebrow">Trade. Earn. Grow.</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{register?"Create your account":"Welcome back"}</h1><p className="mt-2 text-sm text-slate-500">{register?"Start your Bitvora journey in a few steps.":"Sign in to continue to your dashboard."}</p></div><form onSubmit={submit} className="mt-7 space-y-4">
  {register&&<label className="field"><span>Full name</span><div><UserRound size={17}/><input value={name} onChange={event=>setName(event.target.value)} placeholder="Full legal name" required/></div></label>}
  {register&&<label className="field"><span>Country</span><div><MapPin size={17}/><select value={country} onChange={event=>setCountry(event.target.value)}>{countries.map(value=><option key={value}>{value}</option>)}</select></div></label>}
  <label className="field"><span>Email address</span><div><Mail size={17}/><input value={email} onChange={event=>setEmail(event.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required/></div></label>
  <label className="field"><span>Password</span><div><LockKeyhole size={17}/><input value={password} onChange={event=>setPassword(event.target.value)} type={showPassword?"text":"password"} placeholder="••••••••" autoComplete={register?"new-password":"current-password"} required/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label="Toggle password visibility"><Eye size={17}/></button></div></label>
  {register&&<label className="field"><span>Sponsor UID <i>optional</i></span><div><Sparkles size={17}/><input value={sponsorUid} onChange={event=>{if(!referralLocked)setSponsorUid(normalizeUid(event.target.value))}} readOnly={referralLocked} placeholder="BV100001"/></div></label>}
  {error&&<p role="alert" className="rounded-xl border border-red-400/15 bg-red-400/[.06] px-3 py-2 text-xs text-red-300">{error}</p>}<button type="submit" className="primary-button trade-glow !mt-7 w-full">{register?"Create account":"Sign in"}<ArrowRight size={17}/></button>
 </form><p className="mt-6 text-center text-sm text-slate-500">{register?"Already a member?":"New to Bitvora?"} <Link className="text-blue-300" href={register?"/login":"/register"}>{register?"Sign in":"Create account"}</Link></p><p className="mt-5 text-center text-[10px] text-slate-600">Secure server-authenticated account access</p></div></main>
}
