import { AdminUserDetail } from "@/components/admin/admin-user-detail";export default async function Page({params}:{params:Promise<{uid:string}>}){return <AdminUserDetail uid={(await params).uid}/>}
