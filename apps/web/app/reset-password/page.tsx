"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@medbook/ui";
import Link from "next/link";

export default function ResetPasswordPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Debug: Log errors when they change
  useEffect(() => {
    if (errors.currentPassword) {
      console.log(
        "[ResetPassword] Current password error set:",
        errors.currentPassword
      );
    }
  }, [errors.currentPassword]);

  // Redirect if not authenticated or doesn't need password reset
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (
      status === "authenticated" &&
      !session?.user?.mustResetPassword
    ) {
      // Already reset password, redirect to admin dashboard
      router.push("/admin");
    }
  }, [status, session, router]);

  const validatePasswordForm = (): boolean => {
    const newErrors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])/.test(newPassword)) {
      newErrors.newPassword =
        "Password must contain at least one lowercase letter";
    } else if (!/(?=.*[A-Z])/.test(newPassword)) {
      newErrors.newPassword =
        "Password must contain at least one uppercase letter";
    } else if (!/(?=.*\d)/.test(newPassword)) {
      newErrors.newPassword = "Password must contain at least one number";
    } else if (!/(?=.*[!@#$%^&*])/.test(newPassword)) {
      newErrors.newPassword =
        "Password must contain at least one special character (!@#$%^&*)";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (currentPassword === newPassword) {
      newErrors.newPassword =
        "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setErrors({});

    if (!validatePasswordForm()) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        general: "Please fix the errors below to continue",
      }));
      return;
    }

    setIsChangingPassword(true);

    try {
      console.log("[ResetPassword] Calling password API...");
      const response = await fetch("/api/users/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      console.log(
        "[ResetPassword] Response status:",
        response.status,
        response.statusText
      );

      let data;
      try {
        const responseText = await response.text();
        console.log("[ResetPassword] Response text:", responseText);
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("[ResetPassword] Failed to parse response:", parseError);
        setErrors({
          general:
            "Invalid response from server. Please check console for details.",
        });
        return;
      }

      console.log("[ResetPassword] Parsed data:", data);

      if (!response.ok) {
        console.error("[ResetPassword] Request failed:", data);

        // Clear any previous success message
        setSuccess(null);

        // Set appropriate error based on error code
        if (data.error?.code === "AUTHENTICATION_ERROR") {
          const errorMessage =
            data.error.message || "Current password is incorrect";
          console.log(
            "[ResetPassword] Setting currentPassword error:",
            errorMessage
          );
          setErrors({
            currentPassword: errorMessage,
          });
        } else if (data.error?.code === "VALIDATION_ERROR") {
          const validationErrors = data.error.details?.errors || {};
          setErrors({
            newPassword: validationErrors.newPassword,
            general: data.error.message,
          });
        } else if (data.error?.code === "CORS_ERROR") {
          setErrors({
            general: `CORS Error: ${data.error.message}. ${data.error.details || ""}`,
          });
        } else {
          setErrors({
            general:
              data.error?.message ||
              `Failed to change password (Status: ${response.status})`,
          });
        }

        setIsChangingPassword(false);
        return;
      }

      setSuccess(
        "Password reset successfully! Please sign in again with your new password..."
      );

      // Always sign out after password reset to ensure fresh session
      // This ensures the mustResetPassword flag is correctly read from the database
      // and prevents middleware from seeing stale session data
      try {
        console.log("[ResetPassword] Signing out to refresh session...");
        await signOut({
          redirect: false,
          callbackUrl: "/login?callbackUrl=/admin",
        });

        console.log("[ResetPassword] Redirecting to login...");
        // Use setTimeout to ensure signOut completes before redirect
        setTimeout(() => {
          window.location.href = "/login?callbackUrl=/admin";
        }, 500);
      } catch (signOutError) {
        console.error("[ResetPassword] Failed to sign out:", signOutError);
        // Fallback: redirect to login even if signOut fails
        setTimeout(() => {
          window.location.href = "/login?callbackUrl=/admin";
        }, 1000);
      }
    } catch (error) {
      console.error("[ResetPassword] Exception caught:", error);
      setErrors({
        general:
          error instanceof Error
            ? `Error: ${error.message}`
            : "An error occurred. Please try again.",
      });
      setIsChangingPassword(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user?.mustResetPassword) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Card title="Reset Password Required">
          <div className="mb-4 rounded-md bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              You must reset your password before accessing the admin dashboard.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            {errors.general && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            )}

            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                // Clear error when user starts typing
                if (errors.currentPassword) {
                  console.log(
                    "[ResetPassword] Clearing currentPassword error as user types"
                  );
                  setErrors((prev) => ({
                    ...prev,
                    currentPassword: undefined,
                  }));
                }
              }}
              error={errors.currentPassword}
              disabled={isChangingPassword}
              required
              autoComplete="current-password"
              aria-invalid={errors.currentPassword ? "true" : "false"}
            />

            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) {
                  setErrors((prev) => ({ ...prev, newPassword: undefined }));
                }
              }}
              error={errors.newPassword}
              disabled={isChangingPassword}
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
                }
              }}
              error={errors.confirmPassword}
              disabled={isChangingPassword}
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? "Resetting Password..." : "Reset Password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
