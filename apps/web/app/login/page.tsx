"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Card, useToast } from "@medbook/ui";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      showSuccess("Registration successful! Please sign in.");
      const callbackUrl = searchParams.get("callbackUrl");
      const keep =
        callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
          ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
          : "";
      router.replace(`/login${keep}`, { scroll: false });
    }
  }, [searchParams, router, showSuccess]);

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
      showError("Please fix the errors below to continue");
      return;
    }

    setIsLoading(true);
    setErrors({});
    setFormError(null);

    try {
      console.log("[Login] Attempting sign in with:", { email });
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log("[Login] Sign in result:", JSON.stringify(result, null, 2));

      const invalidCredsMessage =
        "Invalid email or password. Please check and try again.";

      if (result?.error) {
        console.error("[Login] Sign in error:", result.error);
        const raw = String(result.error);
        const isCredentialsSignin =
          raw === "CredentialsSignin" || raw.includes("CredentialsSignin");
        const errorMessage = isCredentialsSignin
          ? invalidCredsMessage
          : raw || invalidCredsMessage;
        setFormError(errorMessage);
        showError(errorMessage);
        setIsLoading(false);
      } else if (result?.ok) {
        console.log("[Login] Sign in successful, redirecting...");
        showSuccess("Sign in successful! Redirecting...");
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
        const isValidCallback =
          callbackUrl.startsWith("/") && !callbackUrl.startsWith("//");
        const safeCallbackUrl = isValidCallback ? callbackUrl : "/dashboard";
        setTimeout(() => {
          router.push(safeCallbackUrl);
          router.refresh();
        }, 500);
      } else {
        // result null, undefined, or { ok: false } without error (e.g. some NextAuth/network cases)
        console.warn("[Login] Unexpected sign in result:", result);
        setFormError(invalidCredsMessage);
        showError(invalidCredsMessage);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[Login] Exception caught:", error);
      const errorMessage =
        "The service is temporarily unavailable. Please try again later.";
      setFormError(errorMessage);
      showError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Card title="Sign In">
          {formError && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {formError}
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            aria-label="Sign in form"
            noValidate
          >
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
                if (formError) setFormError(null);
              }}
              error={errors.email}
              disabled={isLoading}
              required
              autoComplete="email"
              aria-required="true"
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "email-error" : undefined}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
                if (formError) setFormError(null);
              }}
              error={errors.password}
              disabled={isLoading}
              required
              autoComplete="current-password"
              aria-required="true"
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={errors.password ? "password-error" : undefined}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Hide signup link for admin login */}
          {!searchParams.get("callbackUrl")?.includes("/admin") && (
            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600">
                Don&apos;t have an account?{" "}
                <Link
                  href={
                    searchParams.get("callbackUrl")
                      ? `/register?callbackUrl=${encodeURIComponent(searchParams.get("callbackUrl")!)}`
                      : "/register"
                  }
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
