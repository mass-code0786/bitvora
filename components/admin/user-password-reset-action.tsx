"use client";

import { useState } from "react";

import { useAdminData } from "@/hooks/use-admin-data";
import { UserPasswordResetModal } from "./user-password-reset-modal";

export function UserPasswordResetAction({ uid }: { uid: string }) {
  const { data } = useAdminData();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const user = data?.users.find((candidate) => candidate.uid === uid);

  if (!user) return null;

  return (
    <div className="admin-page">
      {message ? <div className="admin-banner">{message}</div> : null}
      <section className="admin-card">
        <h2>Account security</h2>
        <p>Reset this user&apos;s password and sign out all of their active sessions.</p>
        <button type="button" onClick={() => setOpen(true)}>
          Reset Password
        </button>
      </section>

      {open ? (
        <UserPasswordResetModal
          user={user}
          onClose={() => setOpen(false)}
          onSuccess={(successMessage) => {
            setMessage(successMessage);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
