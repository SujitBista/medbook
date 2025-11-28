"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@medbook/ui";
import Link from "next/link";
// API URL is available via NEXT_PUBLIC_API_URL environment variable
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function RegisterPage() {
  // Log API URL on component mount for debugging
  useEffect(() => {
    console.log("[Registration] Component mounted");
    console.log("[Registration] API URL configured:", API_URL);
    console.log(
      "[Registration] NEXT_PUBLIC_API_URL env:",
      process.env.NEXT_PUBLIC_API_URL || "not set (using default)"
    );
  }, []);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)
    ) {
      newErrors.password =
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      console.log("[Registration] Form validation failed");
      // Errors are already set by validateForm(), but add a general message
      setErrors((prevErrors) => ({
        ...prevErrors,
        general: "Please fix the errors below to continue",
      }));
      return;
    }

    setIsLoading(true);
    setErrors({});

    const registrationUrl = `${API_URL}/auth/register`;
    console.log("[Registration] Starting registration request");
    console.log("[Registration] API URL:", registrationUrl);
    console.log("[Registration] Email:", email);

    try {
      const requestBody = {
        email,
        password,
      };

      console.log("[Registration] Sending POST request to:", registrationUrl);

      const response = await fetch(registrationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("[Registration] Response status:", response.status);
      console.log("[Registration] Response statusText:", response.statusText);
      console.log(
        "[Registration] Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        console.warn(
          "[Registration] Response not OK, status:",
          response.status
        );

        // Handle CORS errors (403 Forbidden)
        if (response.status === 403) {
          // Try to parse as JSON first to get CORS error details
          try {
            const responseText = await response.text();
            const errorData = JSON.parse(responseText);
            if (errorData.error?.code === "CORS_ERROR") {
              console.error("[Registration] CORS error:", errorData.error);
              const corsDetails =
                errorData.error.details || errorData.error.message;
              setErrors({
                general: `CORS Error: ${corsDetails}. Please check that your frontend origin is allowed in the API's CORS configuration.`,
              });
              setIsLoading(false);
              return;
            }
          } catch (parseError) {
            // If not JSON, show generic CORS error
            setErrors({
              general:
                "CORS Error: Your request was blocked by CORS policy. Please check that your frontend origin is allowed in the API's CORS configuration.",
            });
            setIsLoading(false);
            return;
          }
        }

        // Handle non-JSON responses (e.g., 500 with HTML error page)
        if (response.status >= 500) {
          setErrors({
            general:
              "The server encountered an error. Please try again later or contact support if the problem persists.",
          });
          setIsLoading(false);
          return;
        }

        // Try to parse error response as JSON
        let errorData;
        try {
          const responseText = await response.text();
          console.log("[Registration] Error response text:", responseText);

          errorData = JSON.parse(responseText);
          console.error(
            "[Registration] Error response data:",
            JSON.stringify(errorData, null, 2)
          );
        } catch (parseError) {
          // If response is not JSON, use status text
          console.error(
            "[Registration] Failed to parse error response as JSON:",
            parseError
          );
          console.error(
            "[Registration] Response was not JSON, status:",
            response.status
          );

          // Provide user-friendly messages based on status code
          let errorMessage = "Registration failed. Please try again.";
          if (response.status === 500) {
            errorMessage = "A server error occurred. Please try again later.";
          } else if (response.status === 503) {
            errorMessage =
              "The service is temporarily unavailable. Please try again later.";
          } else if (response.status >= 500) {
            errorMessage =
              "A server error occurred. Please try again later or contact support.";
          }

          setErrors({
            general: errorMessage,
          });
          setIsLoading(false);
          return;
        }

        // Handle known error codes
        if (errorData.error?.code === "CORS_ERROR") {
          console.error("[Registration] CORS error:", errorData.error);
          // Show helpful CORS error message
          const corsDetails =
            errorData.error.details || errorData.error.message;
          setErrors({
            general: `CORS Error: ${corsDetails}. Please check that your frontend origin is allowed in the API's CORS configuration.`,
          });
        } else if (errorData.error?.code === "CONFLICT_ERROR") {
          console.warn("[Registration] Conflict error - email already exists");
          setErrors({ email: "An account with this email already exists" });
        } else if (errorData.error?.code === "VALIDATION_ERROR") {
          console.warn("[Registration] Validation error:", errorData.error);
          const validationErrors = errorData.error.details?.errors || {};
          setErrors({
            email: validationErrors.email,
            password: validationErrors.password,
            general: errorData.error.message,
          });
        } else if (errorData.error?.code === "INTERNAL_SERVER_ERROR") {
          console.error(
            "[Registration] Internal server error:",
            errorData.error
          );
          // Show user-friendly message for server errors
          // In development, check if it's a database configuration issue
          const isDevelopment = process.env.NODE_ENV === "development";
          let errorMessage =
            "A server error occurred. Please try again later or contact support if the problem persists.";

          if (isDevelopment && errorData.error.details?.message) {
            const detailsMessage = errorData.error.details.message;
            // Check for common configuration errors
            if (detailsMessage.includes("DATABASE_URL")) {
              errorMessage =
                "Server configuration error: Database connection is not configured. Please check server logs.";
            } else if (detailsMessage.includes("Environment variable")) {
              errorMessage =
                "Server configuration error: Missing required environment variables. Please check server configuration.";
            } else {
              // Show first line of error for development
              const firstLine = detailsMessage.split("\n")[0].trim();
              errorMessage = `Server error: ${firstLine}`;
            }
          }

          setErrors({
            general: errorMessage,
          });
        } else {
          console.error(
            "[Registration] Unknown error code:",
            errorData.error?.code
          );
          // For other errors, show the error message if available, otherwise generic message
          const errorMessage =
            errorData.error?.message ||
            "Registration failed. Please try again.";
          setErrors({
            general: errorMessage,
          });
        }
        setIsLoading(false);
        return;
      }

      // Parse successful response
      const responseText = await response.text();
      console.log("[Registration] Success response text:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log(
          "[Registration] Success response data:",
          JSON.stringify(data, null, 2)
        );
      } catch (parseError) {
        console.error(
          "[Registration] Failed to parse success response as JSON:",
          parseError
        );
        setErrors({
          general: "Registration response was invalid. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      // Verify response structure
      if (!data.success || !data.user) {
        console.error("[Registration] Invalid response structure:", data);
        setErrors({
          general: "Registration response was invalid. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      console.log(
        "[Registration] Registration successful! User ID:",
        data.user.id
      );
      console.log("[Registration] Redirecting to login page");

      // Registration successful - redirect to login
      router.push("/login?registered=true");
    } catch (error) {
      // Handle network errors or other exceptions
      console.error("[Registration] Exception caught:", error);
      console.error(
        "[Registration] Error type:",
        error instanceof Error ? error.constructor.name : typeof error
      );
      console.error(
        "[Registration] Error message:",
        error instanceof Error ? error.message : String(error)
      );
      console.error(
        "[Registration] Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );

      setErrors({
        general:
          error instanceof Error
            ? `Connection error: ${error.message}. Please ensure the API server is running.`
            : "An error occurred. Please try again.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Card title="Create Account">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                // Clear error when user starts typing
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
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
                // Clear error when user starts typing
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
                // Clear confirm password error if passwords now match
                if (
                  errors.confirmPassword &&
                  e.target.value === confirmPassword
                ) {
                  setErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
                }
              }}
              error={errors.password}
              disabled={isLoading}
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                // Clear error when user starts typing
                if (errors.confirmPassword) {
                  setErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
                }
                // Clear general error if it was a validation error
                if (
                  errors.general === "Please fix the errors below to continue"
                ) {
                  setErrors((prev) => ({ ...prev, general: undefined }));
                }
              }}
              error={errors.confirmPassword}
              disabled={isLoading}
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
