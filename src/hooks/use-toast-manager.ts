import { useState } from "react";
import {
  createAppError,
  getToastTypeForError,
  type AppError,
} from "@/services/error-handling-service";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export function useToastManager() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 5 seconds for non-error toasts
    if (type !== "error") {
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  /**
   * Handle errors and show appropriate toast
   * Automatically extracts user-friendly message from error
   */
  const handleError = (error: unknown, customMessage?: string) => {
    const appError = createAppError(error);
    const toastType = getToastTypeForError(appError);
    const message = customMessage || appError.message;
    
    // Log error for debugging
    console.error("Error handled:", error);
    
    showToast(message, toastType);
  };

  /**
   * Show success message
   */
  const showSuccess = (message: string) => {
    showToast(message, "success");
  };

  /**
   * Show error message (for explicit errors)
   */
  const showError = (message: string) => {
    showToast(message, "error");
  };

  /**
   * Show warning message
   */
  const showWarning = (message: string) => {
    showToast(message, "warning");
  };

  /**
   * Show info message
   */
  const showInfo = (message: string) => {
    showToast(message, "info");
  };

  return {
    toasts,
    showToast,
    removeToast,
    handleError,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

