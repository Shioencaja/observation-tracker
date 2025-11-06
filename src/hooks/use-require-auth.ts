import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to require authentication and redirect to login if not authenticated
 * 
 * @param options - Configuration options
 * @param options.redirectTo - Custom redirect path (default: "/login")
 * @param options.redirectOnMount - Whether to redirect immediately on mount (default: true)
 * @returns Object with user, loading state, and whether user is authenticated
 */
export function useRequireAuth(options?: {
  redirectTo?: string;
  redirectOnMount?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const redirectTo = options?.redirectTo || "/login";
  const redirectOnMount = options?.redirectOnMount !== false; // Default to true

  useEffect(() => {
    if (redirectOnMount && !authLoading && !user) {
      router.push(redirectTo);
    }
  }, [user, authLoading, router, redirectTo, redirectOnMount]);

  return {
    user,
    isLoading: authLoading,
    isAuthenticated: !!user,
  };
}

