"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button, Card } from "@medbook/ui";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Error caught:", error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
          <Card className="max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <span className="text-2xl text-red-600">⚠</span>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Something went wrong
              </h2>
              <p className="mb-6 text-gray-600">
                {this.state.error?.message ||
                  "An unexpected error occurred. Please try again."}
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button
                  variant="primary"
                  onClick={() => (window.location.href = "/")}
                >
                  Go Home
                </Button>
              </div>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
