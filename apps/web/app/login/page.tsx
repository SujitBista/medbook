"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Card } from "@medbook/ui";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMessage("Registration successful! Please sign in.");
      // Remove the query parameter from URL to prevent showing message on refresh
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Errors are already set by validateForm(), but add a general message
      setErrors((prevErrors) => ({
        ...prevErrors,
        general: "Please fix the errors below to continue",
      }));
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      console.log("[Login] Attempting sign in with:", { email });
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log("[Login] Sign in result:", JSON.stringify(result, null, 2));

      if (result?.error) {
        console.error("[Login] Sign in error:", result.error);
        // Show the actual error message if available, otherwise show generic message
        const errorMessage =
          result.error === "CredentialsSignin"
            ? "Invalid email or password"
            : result.error || "Invalid email or password";
        setErrors({ general: errorMessage });
        setIsLoading(false);
      } else if (result?.ok) {
        console.log("[Login] Sign in successful, redirecting...");
        // Redirect to callbackUrl if provided, otherwise to dashboard
        // Validate callbackUrl to prevent open redirect vulnerability
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
        // Only allow same-origin paths starting with "/"
        const isValidCallback =
          callbackUrl.startsWith("/") && !callbackUrl.startsWith("//");
        const safeCallbackUrl = isValidCallback ? callbackUrl : "/dashboard";
        router.push(safeCallbackUrl);
        router.refresh();
      } else {
        console.warn("[Login] Unexpected sign in result:", result);
        setErrors({ general: "Invalid email or password" });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[Login] Exception caught:", error);
      // Provide more specific error messages
      const errorMessage =
        error instanceof Error
          ? `Connection error: ${error.message}. Please ensure the API server is running.`
          : "An error occurred. Please try again.";
      setErrors({ general: errorMessage });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Card title="Sign In">
          <form onSubmit={handleSubmit} className="space-y-4">
            {successMessage && (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            )}
            {errors.general && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // Clear success message when user starts typing
                if (successMessage) {
                  setSuccessMessage(null);
                }
                // Clear error when user starts typing
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
                // Clear general error if it was a validation error
                if (
                  errors.general === "Please fix the errors below to continue"
                ) {
                  setErrors((prev) => ({ ...prev, general: undefined }));
                }
              }}
              error={errors.email}
              disabled={isLoading}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                // Clear success message when user starts typing
                if (successMessage) {
                  setSuccessMessage(null);
                }
                // Clear error when user starts typing
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
                // Clear general error if it was a validation error
                if (
                  errors.general === "Please fix the errors below to continue"
                ) {
                  setErrors((prev) => ({ ...prev, general: undefined }));
                }
              }}
              error={errors.password}
              disabled={isLoading}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Hide signup link for admin login */}
          {!searchParams.get("callbackUrl")?.includes("/admin") && (
            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign up
                </Link>
              </p>
            </div>
          )}
          {/* Show admin login info */}
          {searchParams.get("callbackUrl")?.includes("/admin") && (
            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600">
                Admin access only. Company will provide the initial password.
                <br />
                You will be required to reset your password after first login.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
