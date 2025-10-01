import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/types/observation";

export function useProjectRole(
  projectId: string,
  userId: string,
  createdBy: string
) {
  const [role, setRole] = useState<UserRole>("viewer");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!projectId || !userId) {
        setIsLoading(false);
        return;
      }

      // If user is the creator, they're always creator
      if (userId === createdBy) {
        setRole("creator");
        setIsLoading(false);
        return;
      }

      try {
        // Check project_users table for their role
        const { data, error } = await supabase
          .from("project_users")
          .select("role")
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .single();

        if (error) {
          // If table doesn't exist or user not found, default to viewer
          if (error.code === "PGRST116" || error.code === "42P01") {
            setRole("viewer");
          } else {
            console.error("Error fetching user role:", error);
            setRole("viewer");
          }
        } else {
          setRole((data?.role as UserRole) || "viewer");
        }
      } catch (error) {
        console.error("Error in fetchRole:", error);
        setRole("viewer");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, [projectId, userId, createdBy]);

  return { role, isLoading };
}
