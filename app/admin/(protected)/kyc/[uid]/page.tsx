import { AdminKycDetail } from "@/components/admin/admin-kyc";export default async function Page({params}:{params:Promise<{uid:string}>}){return <AdminKycDetail uid={(await params).uid}/>}
