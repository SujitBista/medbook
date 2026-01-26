"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { Button, Input, Card } from "@medbook/ui";
import Link from "next/link";
// API URL is available via NEXT_PUBLIC_API_URL environment variable
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// Zod validation schema for registration form
const registerSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /(?=.*[a-z])/,
        "Password must contain at least one lowercase letter"
      )
      .regex(
        /(?=.*[A-Z])/,
        "Password must contain at least one uppercase letter"
      )
      .regex(/(?=.*\d)/, "Password must contain at least one number")
      .regex(
        /(?=.*[!@#$%^&*])/,
        "Password must contain at least one special character (!@#$%^&*)"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    firstName: z.string().min(1, "First name is required").trim(),
    lastName: z.string().min(1, "Last name is required").trim(),
    phoneNumber: z.string().min(1, "Phone number is required").trim(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Log API URL on component mount for debugging
  useEffect(() => {
    console.log("[Registration] Component mounted");
    console.log("[Registration] API URL configured:", API_URL);
    console.log(
      "[Registration] NEXT_PUBLIC_API_URL env:",
      process.env.NEXT_PUBLIC_API_URL || "not set (using default)"
    );
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): {
    isValid: boolean;
    errors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      general?: string;
    };
  } => {
    try {
      registerSchema.parse({
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
        phoneNumber,
      });
      // Validation passed - no errors
      return { isValid: true, errors: {} };
    } catch (error) {
      // Check if it's a ZodError - extract and map validation errors
      if (error instanceof z.ZodError) {
        const newErrors: {
          email?: string;
          password?: string;
          confirmPassword?: string;
          firstName?: string;
          lastName?: string;
          phoneNumber?: string;
        } = {};

        // Zod errors array contains error objects with path and message
        // Path is always an array: ["email"], ["password"], ["confirmPassword"], etc.
        // Note: ZodError uses 'issues' property, not 'errors'
        console.log("[Registration] Zod error details:", {
          issuesCount: error.issues?.length,
          issues: error.issues,
        });

        if (
          error.issues &&
          Array.isArray(error.issues) &&
          error.issues.length > 0
        ) {
          error.issues.forEach((err, index) => {
            console.log(`[Registration] Processing Zod error ${index}:`, {
              path: err.path,
              message: err.message,
              code: err.code,
            });

            // Get the field name from the path array
            // For field errors, path will be like ["email"], ["password"], ["confirmPassword"]
            // For refine errors (like password mismatch), path is set in refine options
            if (Array.isArray(err.path) && err.path.length > 0) {
              const fieldName = err.path[0] as string;
              console.log(
                `[Registration] Extracted field name: "${fieldName}"`
              );

              // Map Zod field names to our error object keys
              if (
                fieldName === "email" ||
                fieldName === "password" ||
                fieldName === "confirmPassword" ||
                fieldName === "firstName" ||
                fieldName === "lastName" ||
                fieldName === "phoneNumber"
              ) {
                const errorKey = fieldName as keyof typeof newErrors;
                // Only keep the first error for each field (Zod may return multiple errors per field)
                if (!newErrors[errorKey]) {
                  newErrors[errorKey] = err.message;
                  console.log(
                    `[Registration] Mapped error to ${errorKey}: "${err.message}"`
                  );
                } else {
                  console.log(
                    `[Registration] Skipping duplicate error for ${errorKey}`
                  );
                }
              } else {
                console.log(
                  `[Registration] Field "${fieldName}" not in our form fields, skipping`
                );
              }
            } else {
              console.log(
                `[Registration] Error ${index} has no valid path array`
              );
            }
          });
        } else {
          console.warn(
            "[Registration] No Zod issues found or issues is not an array"
          );
        }

        console.log("[Registration] Final mapped errors:", newErrors);
        return { isValid: false, errors: newErrors };
      }
      // Fallback for unexpected errors
      console.error("[Registration] Unexpected validation error:", error);
      return {
        isValid: false,
        errors: {
          general: "Validation failed. Please check your input.",
        },
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.isValid) {
      console.log("[Registration] Form validation failed");
      console.log("[Registration] Validation errors:", validation.errors);

      // Build errors object with only defined values
      const errorsToSet: {
        email?: string;
        password?: string;
        confirmPassword?: string;
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
        general?: string;
      } = {};

      // Set field-specific errors if they exist
      if (validation.errors.email) {
        errorsToSet.email = validation.errors.email;
      }
      if (validation.errors.password) {
        errorsToSet.password = validation.errors.password;
      }
      if (validation.errors.confirmPassword) {
        errorsToSet.confirmPassword = validation.errors.confirmPassword;
      }
      if (validation.errors.firstName) {
        errorsToSet.firstName = validation.errors.firstName;
      }
      if (validation.errors.lastName) {
        errorsToSet.lastName = validation.errors.lastName;
      }
      if (validation.errors.phoneNumber) {
        errorsToSet.phoneNumber = validation.errors.phoneNumber;
      }

      // Check if we have any field-specific errors
      const hasFieldErrors = !!(
        errorsToSet.email ||
        errorsToSet.password ||
        errorsToSet.confirmPassword ||
        errorsToSet.firstName ||
        errorsToSet.lastName ||
        errorsToSet.phoneNumber
      );

      console.log("[Registration] Has field errors:", hasFieldErrors);
      console.log("[Registration] Errors to set:", errorsToSet);

      // Only show general error if there are no field-specific errors
      if (!hasFieldErrors) {
        errorsToSet.general = "Please fix the errors below to continue";
      }

      setErrors(errorsToSet);
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
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
          // Show error both on email field and as general message for visibility
          const conflictMessage =
            errorData.error.message ||
            "An account with this email already exists";
          setErrors({
            email: conflictMessage,
            general: `${conflictMessage}. If this is your account, please sign in instead.`,
          });
        } else if (errorData.error?.code === "VALIDATION_ERROR") {
          console.warn("[Registration] Validation error:", errorData.error);
          const details = errorData.error.details || {};

          // Handle field-specific errors (object format: { email: "...", password: "..." })
          const fieldErrors = details.errors || {};

          // Handle password errors - could be array or string
          let passwordError = fieldErrors.password;
          if (details.passwordErrors && Array.isArray(details.passwordErrors)) {
            // If password errors come as array, join them
            passwordError = details.passwordErrors.join(". ");
          }

          // Build error state with field-specific errors
          const newErrors: typeof errors = {};

          if (fieldErrors.email) {
            newErrors.email = fieldErrors.email;
          }
          if (passwordError) {
            newErrors.password = passwordError;
          }
          if (fieldErrors.firstName) {
            newErrors.firstName = fieldErrors.firstName;
          }
          if (fieldErrors.lastName) {
            newErrors.lastName = fieldErrors.lastName;
          }
          if (fieldErrors.phoneNumber) {
            newErrors.phoneNumber = fieldErrors.phoneNumber;
          }

          // Only show general message if there are no field-specific errors
          // or if it provides additional context
          if (Object.keys(fieldErrors).length === 0) {
            newErrors.general = errorData.error.message;
          } else if (
            errorData.error.message &&
            errorData.error.message !== "Password does not meet requirements"
          ) {
            // Show general message only if it's different from field errors
            newErrors.general = errorData.error.message;
          }

          setErrors(newErrors);
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

      const callbackUrl = searchParams.get("callbackUrl");
      const cb =
        callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
          ? `&callbackUrl=${encodeURIComponent(callbackUrl)}`
          : "";
      router.push(`/login?registered=true${cb}`);
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
          "The service is temporarily unavailable. Please try again later.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Card title="Create Account">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {errors.general && (
              <div
                className="rounded-md bg-red-50 p-4 border border-red-200"
                role="alert"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">
                      {errors.general}
                    </p>
                    {errors.general.includes("already exists") && (
                      <p className="mt-2 text-sm text-red-700">
                        <Link
                          href={
                            searchParams.get("callbackUrl")
                              ? `/login?callbackUrl=${encodeURIComponent(searchParams.get("callbackUrl")!)}`
                              : "/login"
                          }
                          className="font-medium underline hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                        >
                          Sign in to your existing account
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="First Name"
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (errors.firstName) {
                      setErrors((prev) => ({ ...prev, firstName: undefined }));
                    }
                  }}
                  error={errors.firstName}
                  disabled={isLoading}
                  required
                  autoComplete="given-name"
                  aria-invalid={errors.firstName ? "true" : "false"}
                  aria-describedby={
                    errors.firstName ? "firstName-error" : undefined
                  }
                />
              </div>
              <div>
                <Input
                  label="Last Name"
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (errors.lastName) {
                      setErrors((prev) => ({ ...prev, lastName: undefined }));
                    }
                  }}
                  error={errors.lastName}
                  disabled={isLoading}
                  required
                  autoComplete="family-name"
                  aria-invalid={errors.lastName ? "true" : "false"}
                  aria-describedby={
                    errors.lastName ? "lastName-error" : undefined
                  }
                />
              </div>
            </div>

            <div>
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
                  // Clear general error if it was a validation error
                  if (errors.general && errors.general.includes("email")) {
                    setErrors((prev) => ({ ...prev, general: undefined }));
                  }
                }}
                error={errors.email}
                disabled={isLoading}
                required
                autoComplete="email"
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
            </div>

            <div>
              <Input
                label="Phone Number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (errors.phoneNumber) {
                    setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                  }
                }}
                error={errors.phoneNumber}
                disabled={isLoading}
                required
                autoComplete="tel"
                placeholder="+1 (555) 123-4567"
                aria-invalid={errors.phoneNumber ? "true" : "false"}
                aria-describedby={
                  errors.phoneNumber ? "phoneNumber-error" : undefined
                }
              />
            </div>

            <div>
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
                  // Clear general error if it was a validation error
                  if (errors.general && errors.general.includes("Password")) {
                    setErrors((prev) => ({ ...prev, general: undefined }));
                  }
                }}
                error={errors.password}
                disabled={isLoading}
                required
                autoComplete="new-password"
                aria-invalid={errors.password ? "true" : "false"}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
              />
            </div>

            <div>
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
                aria-invalid={errors.confirmPassword ? "true" : "false"}
                aria-describedby={
                  errors.confirmPassword ? "confirm-password-error" : undefined
                }
              />
            </div>

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
                href={
                  searchParams.get("callbackUrl")
                    ? `/login?callbackUrl=${encodeURIComponent(searchParams.get("callbackUrl")!)}`
                    : "/login"
                }
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
