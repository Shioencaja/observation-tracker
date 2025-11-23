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
  const validateUser = async (session: Session | null) => {
    if (!session || !session.user) {
      return false;
    }

    try {
      // Call getUser() which validates the user still exists in Supabase
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.warn("⚠️ User validation failed - user no longer exists:", error);
        // User was deleted or session is invalid
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        forceLogout();
        return false;
      }

      // User exists and is valid
      return true;
    } catch (err) {
      console.error("❌ Error validating user:", err);
      // On error, clear session to be safe
      setSession(null);
      setUser(null);
      forceLogout();
      return false;
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
      } else if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        // Validate user on token refresh or sign in
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
        // For other events, validate user if session exists
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
