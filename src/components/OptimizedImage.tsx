"use client";

import Image, { ImageProps } from "next/image";
import { forwardRef } from "react";

interface OptimizedImageProps extends Omit<ImageProps, "loading"> {
  /**
   * Whether this image is above the fold and should be loaded with priority
   * @default false
   */
  priority?: boolean;
  /**
   * Loading strategy for below-the-fold images
   * @default "lazy"
   */
  loading?: "lazy" | "eager";
  /**
   * Responsive image sizes for different viewport widths
   * Follows the same format as CSS media queries
   * @example "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
   */
  sizes?: string;
}

/**
 * Optimized Image component that wraps Next.js Image with best practices
 * 
 * Features:
 * - Automatic priority handling for above-the-fold images
 * - Lazy loading for below-the-fold images
 * - Responsive sizing support
 * - Performance optimizations
 */
export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  (
    {
      priority = false,
      loading = priority ? "eager" : "lazy",
      sizes,
      alt,
      ...props
    },
    ref
  ) => {
    // For priority images, always use eager loading
    const loadingStrategy = priority ? "eager" : loading;

    return (
      <Image
        {...props}
        ref={ref}
        alt={alt || ""}
        priority={priority}
        loading={loadingStrategy}
        sizes={sizes}
      />
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;


