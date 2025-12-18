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
  profilePictureUrl?: string;
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
    profilePicture?: string;
    general?: string;
  }>({});
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Profile picture state
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
        const pictureUrl: string | undefined = data.user.profilePictureUrl;
        setProfilePictureUrl(pictureUrl ?? null);
        setImagePreview(pictureUrl ?? null);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [session]);

  const handleProfileImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Reset previous errors
    setProfileErrors((prev) => ({ ...prev, profilePicture: undefined }));

    // Client-side validation (must match server-side rules)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setProfileErrors((prev) => ({
        ...prev,
        profilePicture:
          "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
      }));
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setProfileErrors((prev) => ({
        ...prev,
        profilePicture: "File size must be less than 5MB",
      }));
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProfileImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    // Mark profile picture as cleared
    setProfilePictureUrl(null);
    // Reset file input value
    const fileInput = document.getElementById(
      "profilePicture"
    ) as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const uploadProfileImage = async (): Promise<string | null> => {
    if (!selectedFile) {
      // No new file selected; keep existing (which may already be null/cleared)
      return profilePictureUrl || null;
    }

    setIsUploadingImage(true);
    setProfileErrors((prev) => ({ ...prev, profilePicture: undefined }));

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/users/profile/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to upload image");
      }

      return data.data.url as string;
    } catch (error) {
      console.error("[ProfilePage] Error uploading profile image:", error);
      setProfileErrors((prev) => ({
        ...prev,
        profilePicture:
          error instanceof Error
            ? error.message
            : "Failed to upload profile image",
      }));
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

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
      // If a new image is selected, upload it first
      let nextProfilePictureUrl = profilePictureUrl;
      if (selectedFile) {
        const uploadedUrl = await uploadProfileImage();
        if (!uploadedUrl) {
          // Error already set by uploadProfileImage
          return;
        }
        nextProfilePictureUrl = uploadedUrl;
      }

      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          // If nextProfilePictureUrl is null, the backend will clear it.
          // If undefined, the backend will leave it unchanged.
          profilePictureUrl: nextProfilePictureUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === "VALIDATION_ERROR") {
          const validationErrors = data.error.details?.errors || {};
          setProfileErrors((prev) => ({
            ...prev,
            email: validationErrors.email,
            general: data.error.message,
          }));
        } else {
          setProfileErrors((prev) => ({
            ...prev,
            general: data.error?.message || "Failed to update profile",
          }));
        }
        return;
      }

      setProfileSuccess("Profile updated successfully");
      setProfile(data.user);
      const updatedPictureUrl: string | undefined =
        data.user.profilePictureUrl ?? undefined;
      const nextUrl = updatedPictureUrl ?? null;
      setProfilePictureUrl(nextUrl);
      setImagePreview(nextUrl);
      setSelectedFile(null);
      // Update NextAuth session so components like the dashboard dropdown
      // can immediately reflect the new profile picture.
      if (session?.user) {
        await updateSession({
          user: {
            ...session.user,
            profilePictureUrl: nextUrl,
          },
        });
      }
    } catch (error) {
      setProfileErrors((prev) => ({
        ...prev,
        general: "An error occurred. Please try again.",
      }));
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
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Profile Picture
                </label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreview}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-semibold">
                        {profile?.email
                          ? profile.email.charAt(0).toUpperCase()
                          : "U"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <label>
                        <span className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer">
                          {isUploadingImage ? "Uploading..." : "Change Photo"}
                        </span>
                        <input
                          id="profilePicture"
                          name="profilePicture"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          onChange={handleProfileImageChange}
                          disabled={isUploadingImage || isUpdatingProfile}
                        />
                      </label>
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={handleRemoveProfileImage}
                          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                          disabled={isUploadingImage || isUpdatingProfile}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      JPG, PNG, or WebP. Max size 5MB.
                    </p>
                    {profileErrors.profilePicture && (
                      <p className="text-xs text-red-600">
                        {profileErrors.profilePicture}
                      </p>
                    )}
                  </div>
                </div>
              </div>
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
