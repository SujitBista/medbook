"use client";

import React, { useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

/**
 * Individual Toast component
 */
export function ToastComponent({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  const typeStyles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const iconStyles = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all ${typeStyles[toast.type]}`}
    >
      <span className="flex-shrink-0 text-lg font-semibold">
        {iconStyles[toast.type]}
      </span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded"
        aria-label="Close notification"
      >
        <span className="sr-only">Close</span>
        <span className="text-lg">×</span>
      </button>
    </div>
  );
}
