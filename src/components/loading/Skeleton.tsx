"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variant of skeleton to display
   * @default "default"
   */
  variant?: "default" | "text" | "circular" | "rectangular";
  /**
   * Width of the skeleton
   */
  width?: string | number;
  /**
   * Height of the skeleton
   */
  height?: string | number;
  /**
   * Whether to show animation
   * @default true
   */
  animate?: boolean;
}

/**
 * Skeleton loader component for better loading UX
 * Provides animated placeholders while content loads
 */
export function Skeleton({
  className,
  variant = "default",
  width,
  height,
  animate = true,
  ...props
}: SkeletonProps) {
  const baseClasses = "bg-muted rounded";
  const variantClasses = {
    default: "rounded",
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-none",
  };

  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animate && "animate-pulse",
        className
      )}
      style={style}
      {...props}
    />
  );
}

/**
 * Skeleton for table rows
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="text" width="80%" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton for table with header and rows
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="w-full">
      <div className="rounded-md border">
        <div className="border-b bg-muted/50 p-4">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} variant="text" width="20%" />
            ))}
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4">
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton key={j} variant="text" width="20%" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for card components
 */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <Skeleton variant="text" width="60%" height={24} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? "40%" : "100%"}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for list items
 */
export function ListItemSkeleton({ showAvatar = false }: { showAvatar?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      {showAvatar && <Skeleton variant="circular" width={40} height={40} />}
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
  );
}

/**
 * Skeleton for project cards
 */
export function ProjectCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <Skeleton variant="text" width="60%" height={28} />
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <div className="flex gap-2 mt-4">
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  );
}


