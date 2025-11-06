"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  className?: string;
  /**
   * Color variant
   * @default "default"
   */
  variant?: "default" | "primary" | "muted";
}

/**
 * Standardized loading spinner component
 * Use for consistent loading indicators across the app
 */
export default function LoadingSpinner({
  size = "md",
  text = "Cargando...",
  className = "",
  variant = "default",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-10 h-10",
  };

  const variantClasses = {
    default: "text-foreground",
    primary: "text-primary",
    muted: "text-muted-foreground",
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2
        className={cn(
          sizeClasses[size],
          variantClasses[variant],
          "animate-spin"
        )}
      />
      {text && (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );
}

/**
 * Full page loading component
 * Use for initial page loads or major data fetches
 */
export function FullPageLoading({
  text = "Cargando...",
  showLogo = false,
}: {
  text?: string;
  showLogo?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" suppressHydrationWarning>
      <div className="text-center space-y-4">
        {showLogo && (
          <div className="mb-8" suppressHydrationWarning>
            <div className="w-32 h-12 bg-muted rounded animate-pulse mx-auto" />
          </div>
        )}
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading component
 * Use for loading states within content areas
 */
export function InlineLoading({
  text = "Cargando...",
  size = "md",
}: {
  text?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2
          size={size === "sm" ? 16 : size === "lg" ? 24 : 20}
          className="animate-spin"
        />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  );
}

/**
 * Loading overlay component
 * Use for blocking loading states (e.g., form submissions)
 */
export function LoadingOverlay({
  text = "Cargando...",
  show = true,
}: {
  text?: string;
  show?: boolean;
}) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
      <div className="text-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/**
 * Loading state wrapper component
 * Shows loading spinner while condition is true, otherwise shows children
 */
export function LoadingState({
  isLoading,
  loadingText = "Cargando...",
  children,
  fallback,
}: {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (isLoading) {
    return fallback || <InlineLoading text={loadingText} />;
  }

  return <>{children}</>;
}
