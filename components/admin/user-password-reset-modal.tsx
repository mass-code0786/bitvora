"use client";

import React, { FormEvent, useState } from "react";

import type { AdminUserRow } from "@/lib/admin/admin-types";

type ResetResponse = {
  success: boolean;
  message: string;
  code?: string;
};

export async function requestAdminPasswordReset(
  userId: string,
  newPassword: string,
  confirmPassword: string,
  fetcher: typeof fetch = fetch,
): Promise<ResetResponse> {
  const response = await fetcher(
    `/api/admin/users/${encodeURIComponent(userId)}/reset-password`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword, confirmPassword }),
    },
  );

  const payload = (await response.json().catch(() => null)) as Partial<ResetResponse> | null;
  if (!response.ok || payload?.success !== true) {
    return {
      success: false,
      code: typeof payload?.code === "string" ? payload.code : "REQUEST_FAILED",
      message:
        typeof payload?.message === "string"
          ? payload.message
          : "Unable to reset password.",
    };
  }

  return {
    success: true,
    message:
      typeof payload.message === "string"
        ? payload.message
        : "Password reset successfully.",
  };
}

export function UserPasswordResetModalView({
  user,
  newPassword,
  confirmPassword,
  loading,
  error,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onCancel,
  onSubmit,
}: {
  user: AdminUserRow;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  error: string;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const identity = user.name?.trim() || user.email?.trim() || user.uid || user.id;

  return (
    <div className="admin-fund-modal-backdrop" role="presentation">
      <form
        className="admin-fund-modal profile-password-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-title"
        onSubmit={onSubmit}
      >
        <small>ACCOUNT SECURITY</small>
        <h2 id="reset-password-title">Reset Password</h2>
        <p>
          Set a new password for <strong>{identity}</strong>
          {user.email && identity !== user.email ? ` (${user.email})` : ""}.
        </p>

        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            disabled={loading}
            onChange={(event) => onNewPasswordChange(event.target.value)}
            required
          />
        </label>

        <label>
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            disabled={loading}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            required
          />
        </label>

        {error ? (
          <p className="admin-fund-error" role="alert">
            {error}
          </p>
        ) : null}

        <div>
          <button type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading || !newPassword || !confirmPassword}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function UserPasswordResetModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);
    try {
      const result = await requestAdminPasswordReset(
        user.id,
        newPassword,
        confirmPassword,
      );
      if (!result.success) {
        setError(result.message);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      onSuccess(result.message);
    } catch {
      setError("Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <UserPasswordResetModalView
      user={user}
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      loading={loading}
      error={error}
      onNewPasswordChange={setNewPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onCancel={onClose}
      onSubmit={handleSubmit}
    />
  );
}
