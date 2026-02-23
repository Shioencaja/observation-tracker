import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type ProjectUserRole = "admin" | "editor" | "viewer";

interface ProjectUser {
  id: string;
  user_id: string;
  user_email: string;
  role: ProjectUserRole | null;
  created_at: string;
}

interface AllUser {
  user_id: string;
  email: string;
}

interface UseProjectUsersReturn {
  projectUsers: ProjectUser[];
  allUsers: AllUser[];
  isLoading: boolean;
  isAdding: boolean;
  isRemoving: boolean;
  isUpdatingRole: boolean;
  error: string | null;
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
  loadUsers: () => Promise<void>;
  addUser: (projectId: string, userId: string, addedBy: string, role?: ProjectUserRole) => Promise<void>;
  removeUser: (projectId: string, userId: string) => Promise<void>;
  updateUserRole: (projectId: string, userId: string, role: ProjectUserRole) => Promise<void>;
}

export function useProjectUsers(
  projectId: string | null
): UseProjectUsersReturn {
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  // Check if table exists
  const checkTableExists = async (): Promise<boolean> => {
    try {
      const { error: testError } = await supabase
        .from("project_users")
        .select("id")
        .limit(0);

      return !testError;
    } catch {
      return false;
    }
  };

  // Check if error is table missing error
  const isTableMissingError = (error: any): boolean => {
    const errorMessage = error?.message || "";
    const errorCode = error?.code || "";

    return (
      errorCode === "PGRST116" ||
      errorMessage.includes('relation "project_users" does not exist') ||
      errorMessage.includes("does not exist") ||
      errorMessage.includes("relation") ||
      errorCode === "42P01" ||
      errorCode === "PGRST202"
    );
  };

  // Load project users
  const loadProjectUsers = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setProjectUsers([]);

    const tableExists = await checkTableExists();
    if (!tableExists) {
      console.log("project_users table doesn't exist, skipping user management");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("project_users")
        .select("*")
        .eq("project_id", projectId);

      if (error) {
        if (isTableMissingError(error)) {
          console.log("project_users table doesn't exist yet");
          return;
        }
        throw error;
      }

      // Get user emails for the project users
      if (data && data.length > 0) {
        const withRole = (pu: (typeof data)[0]) => ({
          ...pu,
          role: (pu.role as ProjectUserRole) || null,
        });
        try {
          const userIds = data.map((pu) => pu.user_id);
          const { data: userEmails, error: emailError } = await supabase.rpc(
            "get_user_emails",
            { user_ids: userIds }
          );

          if (emailError) {
            console.error("Error loading user emails:", emailError);
            setProjectUsers(
              data.map((pu) => ({ ...withRole(pu), user_email: pu.user_id }))
            );
          } else {
            const projectUsersWithEmails = data.map((pu) => ({
              ...withRole(pu),
              user_email:
                userEmails?.find(
                  (ue: { user_id: string; email: string }) =>
                    ue.user_id === pu.user_id
                )?.email || pu.user_id,
            }));
            setProjectUsers(projectUsersWithEmails);
          }
        } catch (emailError) {
          console.error("Error in email loading:", emailError);
          setProjectUsers(
            data.map((pu) => ({ ...withRole(pu), user_email: pu.user_id }))
          );
        }
      }
    } catch (err) {
      console.error("Error loading project users:", err);
      if (!isTableMissingError(err)) {
        setError("Error al cargar los usuarios del proyecto");
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Load all users
  const loadAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_all_users");

      if (error) {
        if (
          error.code === "PGRST202" ||
          error.message?.includes("function get_all_users") ||
          error.message?.includes("does not exist")
        ) {
          console.log("get_all_users function doesn't exist yet");
          setAllUsers([]);
          return;
        }
        throw error;
      }
      setAllUsers(data || []);
    } catch (err) {
      console.error("Error loading all users:", err);
      setAllUsers([]);
    }
  }, []);

  // Load both project users and all users
  const loadUsers = useCallback(async () => {
    await Promise.all([loadProjectUsers(), loadAllUsers()]);
  }, [loadProjectUsers, loadAllUsers]);

  // Add user to project
  const addUser = useCallback(
    async (projectId: string, userId: string, addedBy: string, role: ProjectUserRole = "viewer") => {
      if (!userId || isAdding) return;

      setIsAdding(true);
      setError(null);

      const tableExists = await checkTableExists();
      if (!tableExists) {
        setError(
          "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
        );
        setIsAdding(false);
        return;
      }

      try {
        const { error } = await supabase.from("project_users").insert({
          project_id: projectId,
          user_id: userId,
          added_by: addedBy,
          role,
        });

        if (error) {
          if (isTableMissingError(error)) {
            setError(
              "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
            );
            return;
          }
          throw error;
        }

        await loadProjectUsers();
        setSelectedUserId("");
      } catch (err) {
        console.error("Error adding user to project:", err);
        if (isTableMissingError(err)) {
          setError(
            "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
          );
        } else {
          setError("Error al agregar usuario al proyecto");
        }
      } finally {
        setIsAdding(false);
      }
    },
    [isAdding, loadProjectUsers]
  );

  // Remove user from project
  const removeUser = useCallback(
    async (projectId: string, userId: string) => {
      if (isRemoving) return;

      setIsRemoving(true);
      setError(null);

      const tableExists = await checkTableExists();
      if (!tableExists) {
        setError(
          "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
        );
        setIsRemoving(false);
        return;
      }

      try {
        const { error } = await supabase
          .from("project_users")
          .delete()
          .eq("project_id", projectId)
          .eq("user_id", userId);

        if (error) {
          if (isTableMissingError(error)) {
            setError(
              "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
            );
            return;
          }
          throw error;
        }

        await loadProjectUsers();
      } catch (err) {
        console.error("Error removing user from project:", err);
        if (isTableMissingError(err)) {
          setError(
            "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
          );
        } else {
          setError("Error al remover usuario del proyecto");
        }
      } finally {
        setIsRemoving(false);
      }
    },
    [isRemoving, loadProjectUsers]
  );

  // Update user role in project
  const updateUserRole = useCallback(
    async (projectId: string, userId: string, role: ProjectUserRole) => {
      if (isUpdatingRole) return;

      setIsUpdatingRole(true);
      setError(null);

      const tableExists = await checkTableExists();
      if (!tableExists) {
        setError(
          "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
        );
        setIsUpdatingRole(false);
        return;
      }

      try {
        const { error } = await supabase
          .from("project_users")
          .update({ role })
          .eq("project_id", projectId)
          .eq("user_id", userId);

        if (error) {
          if (isTableMissingError(error)) {
            setError(
              "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
            );
            return;
          }
          throw error;
        }

        await loadProjectUsers();
      } catch (err) {
        console.error("Error updating user role:", err);
        if (isTableMissingError(err)) {
          setError(
            "La funcionalidad de gestión de usuarios no está disponible. Ejecute el script de migración de la base de datos."
          );
        } else {
          setError("Error al actualizar el rol");
        }
      } finally {
        setIsUpdatingRole(false);
      }
    },
    [isUpdatingRole, loadProjectUsers]
  );

  return {
    projectUsers,
    allUsers,
    isLoading,
    isAdding,
    isRemoving,
    isUpdatingRole,
    error,
    selectedUserId,
    setSelectedUserId,
    loadUsers,
    addUser,
    removeUser,
    updateUserRole,
  };
}

