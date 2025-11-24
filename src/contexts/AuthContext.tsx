"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { forceLogout, isSessionValid } from "@/lib/auth-utils";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Validate user credentials by checking if user still exists
  // Use getSession() instead of getUser() to avoid triggering token refresh
  const validateUser = async (session: Session | null) => {
    if (!session || !session.user) {
      return false;
    }

    try {
      // Use getSession() to check if session is still valid without triggering refresh
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      // If there's an error or no session, user is invalid
      if (error || !currentSession || !currentSession.user) {
        console.warn("⚠️ User validation failed - session invalid:", error);
        // User was deleted or session is invalid
        setSession(null);
        setUser(null);
        // Don't call signOut if session is already invalid to avoid auth errors
        forceLogout();
        return false;
      }

      // Check if the user ID matches (user still exists)
      if (currentSession.user.id !== session.user.id) {
        console.warn("⚠️ User validation failed - user ID mismatch");
        setSession(null);
        setUser(null);
        forceLogout();
        return false;
      }

      // User exists and is valid
      return true;
    } catch (err: any) {
      // Ignore auth errors that might be caused by token refresh issues
      // Only log non-auth errors
      if (err?.message && !err.message.includes("token") && !err.message.includes("refresh")) {
        console.error("❌ Error validating user:", err);
      }
      // Don't clear session on token-related errors to avoid disrupting user experience
      // Only clear if it's a clear authentication error
      if (err?.status === 401 || err?.status === 403) {
        setSession(null);
        setUser(null);
        forceLogout();
        return false;
      }
      // For other errors (like network issues), assume user is still valid
      return true;
    }
  };

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000); // 5 second timeout

    // Get initial session and validate user
    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        clearTimeout(timeout);
        if (error) {
          console.error("❌ AuthProvider: Error getting session", error);
          // Clear any invalid session data
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        if (session) {
          // Validate that the user still exists
          const isValid = await validateUser(session);
          if (isValid) {
            setSession(session);
            setUser(session.user);
          }
        } else {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ AuthProvider: Error getting session", err);
        clearTimeout(timeout);
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      clearTimeout(timeout);

      // Handle specific auth events
      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
      } else if (event === "TOKEN_REFRESHED") {
        // Don't validate on token refresh - token was just refreshed, so user is valid
        // Just update the session
        if (session) {
          setSession(session);
          setUser(session.user);
        } else {
          setSession(null);
          setUser(null);
        }
      } else if (event === "SIGNED_IN") {
        // Validate user on sign in
        if (session) {
          const isValid = await validateUser(session);
          if (isValid) {
            setSession(session);
            setUser(session.user);
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } else if (event === "PASSWORD_RECOVERY") {
        // Handle password recovery
        if (session) {
          const isValid = await validateUser(session);
          if (isValid) {
            setSession(session);
            setUser(session.user);
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } else {
        // For other events (like USER_UPDATED), just update session without validation
        // to avoid excessive validation calls
        if (session) {
          setSession(session);
          setUser(session.user);
        } else {
          setSession(null);
          setUser(null);
        }
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // Empty deps - we only want this to run once on mount

  // Separate effect for periodic and focus validation
  useEffect(() => {
    if (!session || !user) {
      return; // No need to validate if no session
    }

    // Validate user on window focus (when user returns to tab)
    const handleFocus = async () => {
      const currentSession = session;
      if (currentSession) {
        const isValid = await validateUser(currentSession);
        if (!isValid) {
          // User was invalidated, state already cleared by validateUser
          console.log("🔄 User invalidated on focus");
        }
      }
    };

    // Validate user periodically (every 5 minutes)
    const validationInterval = setInterval(async () => {
      const currentSession = session;
      if (currentSession) {
        const isValid = await validateUser(currentSession);
        if (!isValid) {
          // User was invalidated, state already cleared by validateUser
          console.log("🔄 User invalidated on periodic check");
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(validationInterval);
    };
  }, [session, user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      console.log("🚪 Starting sign out process...");

      // Clear local state immediately to provide instant feedback
      setUser(null);
      setSession(null);

      // Check if we have a valid session before trying to sign out
      const sessionValid = await isSessionValid();

      if (sessionValid) {
        try {
          // Only try to sign out if we have a valid session
          const { error } = await supabase.auth.signOut();

          if (error) {
            console.warn("⚠️ Sign out failed:", error);
            // Use force logout as fallback
            forceLogout();
          } else {
            console.log("✅ Successfully signed out from Supabase");
          }
        } catch (signOutError) {
          console.warn("⚠️ Sign out threw error:", signOutError);
          // Use force logout as fallback
          forceLogout();
        }
      } else {
        console.log("ℹ️ No active session found, using force logout");
        forceLogout();
      }

      console.log("✅ Sign out process completed");
    } catch (error) {
      console.error("❌ Unexpected sign out error:", error);
      // Use force logout as final fallback
      forceLogout();
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
