import React from "react";

export interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

/**
 * Skeleton component for loading states
 */
export function Skeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
  animation = "pulse",
}: SkeletonProps) {
  const baseStyles = "bg-gray-200 rounded";
  const animationStyles = {
    pulse: "animate-pulse",
    wave: "animate-[shimmer_2s_infinite]",
    none: "",
  };

  const variantStyles = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height)
    style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}
      style={style}
      aria-label="Loading..."
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
