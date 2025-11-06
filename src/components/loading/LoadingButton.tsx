"use client";

import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

interface LoadingButtonProps extends ButtonProps {
  /**
   * Whether the button is in a loading state
   */
  isLoading?: boolean;
  /**
   * Text to show when loading (replaces children)
   */
  loadingText?: string;
  /**
   * Whether to show spinner on the left side
   * @default true
   */
  showSpinner?: boolean;
}

/**
 * Button component with loading state support
 * Automatically disables button and shows loading indicator
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      isLoading = false,
      loadingText,
      showSpinner = true,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <Button ref={ref} disabled={isDisabled} {...props}>
        {isLoading && showSpinner && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {isLoading && loadingText ? loadingText : children}
      </Button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";

export default LoadingButton;


