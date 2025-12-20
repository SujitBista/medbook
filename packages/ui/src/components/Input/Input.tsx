"use client";

import React, { useId, useState } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Shared Input component with password visibility toggle
 */
export function Input({
  label,
  error,
  className = "",
  id,
  type,
  "aria-describedby": ariaDescribedByProp,
  "aria-invalid": ariaInvalidProp,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);

  const inputClasses = `
    w-full px-3 py-2 border-0 bg-transparent
    focus:outline-none
    ${isPassword ? "pr-2" : ""}
    ${className}
  `.trim();

  const wrapperClasses = `
    relative flex items-center
    border rounded-lg bg-white
    ${error ? "border-red-500" : "border-gray-300"}
    focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent
  `.trim();

  // Combine aria-describedby with errorId if error exists
  const ariaDescribedBy = error
    ? ariaDescribedByProp
      ? `${ariaDescribedByProp} ${errorId}`
      : errorId
    : ariaDescribedByProp;

  // Use aria-invalid from props or set based on error
  const ariaInvalid = ariaInvalidProp ?? (error ? "true" : "false");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className={wrapperClasses}>
        <input
          id={inputId}
          type={isPassword && showPassword ? "text" : type}
          className={inputClasses}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!props.disabled) {
                setShowPassword(!showPassword);
              }
            }}
            disabled={props.disabled}
            className={`flex items-center justify-center w-8 h-8 mr-2 focus:outline-none transition-colors pointer-events-auto shrink-0 ${
              props.disabled
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-500 hover:text-gray-700 cursor-pointer"
            }`}
            aria-label="Toggle password visibility"
            aria-pressed={showPassword}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.966 9.966 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
