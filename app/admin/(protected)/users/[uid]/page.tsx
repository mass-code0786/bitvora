import { AdminUserDetail } from "@/components/admin/admin-user-detail";
import { UserPasswordResetAction } from "@/components/admin/user-password-reset-action";

export default async function Page({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;

  return (
    <>
      <AdminUserDetail uid={uid} />
      <UserPasswordResetAction uid={uid} />
    </>
  );
}
