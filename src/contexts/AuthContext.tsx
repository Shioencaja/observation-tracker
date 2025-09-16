"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
    console.log("🔍 AuthProvider: Starting initialization...");

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log(
        "⏰ AuthProvider: 5-second timeout reached - forcing loading to false"
      );
      setLoading(false);
    }, 5000); // 5 second timeout

    // Get initial session
    console.log("🔍 AuthProvider: Getting initial session...");
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        console.log("✅ AuthProvider: Initial session received", {
          hasSession: !!session,
          hasUser: !!session?.user,
          error: error?.message,
        });
        clearTimeout(timeout);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ AuthProvider: Error getting session", err);
        clearTimeout(timeout);
        setLoading(false);
      });

    // Listen for auth changes
    console.log("🔍 AuthProvider: Setting up auth state listener...");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 AuthProvider: Auth state changed", {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
      });
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log("🧹 AuthProvider: Cleaning up...");
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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
