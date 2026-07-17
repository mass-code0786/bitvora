import { redirect } from "next/navigation";
import { requireDemoAdmin } from "@/lib/admin/admin-auth.server";
import { AdminShell } from "@/components/admin/admin-shell";
export default async function AdminProtectedLayout({children}:{children:React.ReactNode}){try{await requireDemoAdmin()}catch{redirect("/admin/login")}return <AdminShell>{children}</AdminShell>}
