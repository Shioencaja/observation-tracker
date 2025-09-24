import { supabase } from "./supabase";

/**
 * Force logout by clearing all auth data without calling Supabase signOut
 * This is useful when the standard signOut fails due to session issues
 */
export const forceLogout = () => {
  console.log("🔄 Force logout: Clearing all auth data...");
  
  try {
    // Clear localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.includes("supabase") || key.includes("auth") || key.includes("sb-")) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    Object.keys(sessionStorage).forEach((key) => {
      if (key.includes("supabase") || key.includes("auth") || key.includes("sb-")) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Clear any cookies that might contain auth data
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      if (name.includes("supabase") || name.includes("auth") || name.includes("sb-")) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
    
    console.log("✅ Force logout completed");
  } catch (error) {
    console.error("❌ Error during force logout:", error);
  }
};

/**
 * Check if the current session is valid
 */
export const isSessionValid = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    return !error && !!session;
  } catch (error) {
    console.error("❌ Error checking session validity:", error);
    return false;
  }
};

/**
 * Get the current user safely
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error("❌ Error getting current user:", error);
      return null;
    }
    return user;
  } catch (error) {
    console.error("❌ Error getting current user:", error);
    return null;
  }
};