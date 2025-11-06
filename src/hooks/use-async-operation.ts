import { useState, useCallback } from "react";

interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  resetErrorOnStart?: boolean;
}

interface UseAsyncOperationReturn<T> {
  isLoading: boolean;
  error: string | null;
  execute: (operation: () => Promise<T>) => Promise<T | undefined>;
  resetError: () => void;
}

/**
 * Hook to manage loading and error states for async operations
 * 
 * @param options - Configuration options
 * @returns Object with loading state, error state, execute function, and resetError function
 */
export function useAsyncOperation<T = void>(
  options?: UseAsyncOperationOptions<T>
): UseAsyncOperationReturn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (operation: () => Promise<T>): Promise<T | undefined> => {
      try {
        setIsLoading(true);
        if (options?.resetErrorOnStart !== false) {
          setError(null);
        }

        const result = await operation();
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        options?.onError?.(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    execute,
    resetError,
  };
}

