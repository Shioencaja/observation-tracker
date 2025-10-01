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

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000); // 5 second timeout

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(timeout);
        if (error) {
          console.error("❌ AuthProvider: Error getting session", error);
          // Clear any invalid session data
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(timeout);

      // Handle specific auth events
      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
      } else if (event === "TOKEN_REFRESHED") {
        setSession(session);
        setUser(session?.user ?? null);
      } else if (event === "SIGNED_IN") {
        setSession(session);
        setUser(session?.user ?? null);
      } else if (event === "PASSWORD_RECOVERY") {
        // Handle password recovery
        setSession(session);
        setUser(session?.user ?? null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

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
