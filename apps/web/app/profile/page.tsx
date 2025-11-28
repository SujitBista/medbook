"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@medbook/ui";
import { ProtectedRoute } from "../components/ProtectedRoute";
import Link from "next/link";

// Use Next.js API routes instead of calling backend directly

interface UserProfile {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  // Profile update form state
  const [email, setEmail] = useState("");
  const [profileErrors, setProfileErrors] = useState<{
    email?: string;
    general?: string;
  }>({});
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch("/api/users/profile", {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        setProfile(data.user);
        setEmail(data.user.email);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [session]);

  const validateProfileForm = () => {
    const errors: { email?: string } = {};

    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email format";
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = () => {
    const errors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      errors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters";
    } else if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(newPassword)
    ) {
      errors.newPassword =
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileErrors({});

    if (!validateProfileForm()) {
      // Errors are already set by validateProfileForm(), but add a general message
      setProfileErrors((prevErrors) => ({
        ...prevErrors,
        general: "Please fix the errors below to continue",
      }));
      return;
    }

    setIsUpdatingProfile(true);

    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === "VALIDATION_ERROR") {
          const validationErrors = data.error.details?.errors || {};
          setProfileErrors({
            email: validationErrors.email,
            general: data.error.message,
          });
        } else {
          setProfileErrors({
            general: data.error?.message || "Failed to update profile",
          });
        }
        return;
      }

      setProfileSuccess("Profile updated successfully");
      setProfile(data.user);
      // Update NextAuth session
      await updateSession();
    } catch (error) {
      setProfileErrors({
        general: "An error occurred. Please try again.",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordErrors({});

    if (!validatePasswordForm()) {
      // Errors are already set by validatePasswordForm(), but add a general message
      setPasswordErrors((prevErrors) => ({
        ...prevErrors,
        general: "Please fix the errors below to continue",
      }));
      return;
    }

    setIsChangingPassword(true);

    try {
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

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === "AUTHENTICATION_ERROR") {
          setPasswordErrors({
            currentPassword:
              data.error.message || "Current password is incorrect",
          });
        } else if (data.error?.code === "VALIDATION_ERROR") {
          const validationErrors = data.error.details?.errors || {};
          setPasswordErrors({
            newPassword: validationErrors.newPassword,
            general: data.error.message,
          });
        } else {
          setPasswordErrors({
            general: data.error?.message || "Failed to change password",
          });
        }
        return;
      }

      setPasswordSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordErrors({
        general: "An error occurred. Please try again.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-gray-900">
            MedBook
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("profile")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === "profile"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab("password")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === "password"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Change Password
            </button>
          </nav>
        </div>

        {/* Profile Update Form */}
        {activeTab === "profile" && (
          <Card title="Profile Information">
            {profileSuccess && (
              <div className="mb-4 rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800">{profileSuccess}</p>
              </div>
            )}
            {profileErrors.general && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{profileErrors.general}</p>
              </div>
            )}
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  User ID
                </label>
                <Input
                  type="text"
                  value={profile?.id || ""}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <Input
                  type="text"
                  value={profile?.role || ""}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Clear error when user starts typing
                  if (profileErrors.email) {
                    setProfileErrors((prev) => ({ ...prev, email: undefined }));
                  }
                  // Clear general error if it was a validation error
                  if (
                    profileErrors.general ===
                    "Please fix the errors below to continue"
                  ) {
                    setProfileErrors((prev) => ({
                      ...prev,
                      general: undefined,
                    }));
                  }
                }}
                error={profileErrors.email}
                disabled={isUpdatingProfile}
                required
                autoComplete="email"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Member Since
                </label>
                <Input
                  type="text"
                  value={
                    profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString()
                      : ""
                  }
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </Card>
        )}

        {/* Password Change Form */}
        {activeTab === "password" && (
          <Card title="Change Password">
            {passwordSuccess && (
              <div className="mb-4 rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800">{passwordSuccess}</p>
              </div>
            )}
            {passwordErrors.general && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{passwordErrors.general}</p>
              </div>
            )}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  // Clear error when user starts typing
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      currentPassword: undefined,
                    }));
                  }
                  // Clear general error if it was a validation error
                  if (
                    passwordErrors.general ===
                    "Please fix the errors below to continue"
                  ) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      general: undefined,
                    }));
                  }
                }}
                error={passwordErrors.currentPassword}
                disabled={isChangingPassword}
                required
                autoComplete="current-password"
              />

              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  // Clear error when user starts typing
                  if (passwordErrors.newPassword) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      newPassword: undefined,
                    }));
                  }
                  // Clear confirm password error if passwords now match
                  if (
                    passwordErrors.confirmPassword &&
                    e.target.value === confirmPassword
                  ) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      confirmPassword: undefined,
                    }));
                  }
                  // Clear general error if it was a validation error
                  if (
                    passwordErrors.general ===
                    "Please fix the errors below to continue"
                  ) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      general: undefined,
                    }));
                  }
                }}
                error={passwordErrors.newPassword}
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
                  // Clear error when user starts typing
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      confirmPassword: undefined,
                    }));
                  }
                  // Clear general error if it was a validation error
                  if (
                    passwordErrors.general ===
                    "Please fix the errors below to continue"
                  ) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      general: undefined,
                    }));
                  }
                }}
                error={passwordErrors.confirmPassword}
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
                {isChangingPassword
                  ? "Changing Password..."
                  : "Change Password"}
              </Button>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function ProfilePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    </Suspense>
  );
}
