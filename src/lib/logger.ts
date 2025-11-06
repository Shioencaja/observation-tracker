/**
 * Centralized logging utility
 * Provides consistent logging interface across the application
 * In production, these can be replaced with proper logging service
 */

type LogLevel = "log" | "error" | "warn" | "info" | "debug";

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Logger utility for consistent logging across the application
 */
export const logger = {
  /**
   * Log informational messages
   * @param message - Message to log
   * @param data - Optional data to include
   */
  info: (message: string, ...data: unknown[]) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, ...data);
    }
  },

  /**
   * Log error messages
   * @param message - Error message to log
   * @param error - Error object or additional data
   */
  error: (message: string, error?: unknown) => {
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, error);
    } else {
      // In production, send to error tracking service
      // Example: Sentry.captureException(error, { extra: { message } });
    }
  },

  /**
   * Log warning messages
   * @param message - Warning message to log
   * @param data - Optional data to include
   */
  warn: (message: string, ...data: unknown[]) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, ...data);
    }
  },

  /**
   * Log debug messages (only in development)
   * @param message - Debug message to log
   * @param data - Optional data to include
   */
  debug: (message: string, ...data: unknown[]) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...data);
    }
  },
};

/**
 * Create a scoped logger for a specific module
 * @param scope - Scope name (e.g., "AuthService", "UserProfile")
 * @returns Scoped logger instance
 */
export function createLogger(scope: string) {
  return {
    info: (message: string, ...data: unknown[]) => {
      logger.info(`[${scope}] ${message}`, ...data);
    },
    error: (message: string, error?: unknown) => {
      logger.error(`[${scope}] ${message}`, error);
    },
    warn: (message: string, ...data: unknown[]) => {
      logger.warn(`[${scope}] ${message}`, ...data);
    },
    debug: (message: string, ...data: unknown[]) => {
      logger.debug(`[${scope}] ${message}`, ...data);
    },
  };
}

