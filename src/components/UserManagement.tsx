"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Loader2, Trash2, ChevronDown, Check, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/types/observation";
import { getRoleLabel, getRoleColor } from "@/lib/roles";

interface User {
  id: string;
  user_id: string;
  email: string;
}

interface ProjectUser {
  id: string;
  user_id: string;
  user_email: string;
  role: UserRole;
  created_at: string;
}

interface UserManagementProps {
  projectId: string;
  projectCreatorId: string;
  currentUserId: string;
  currentUserRole?: UserRole;
  mode?: "create" | "edit";
  // For create mode
  selectedUsers?: Array<{ user_id: string; role: UserRole }>;
  onUsersChange?: (users: Array<{ user_id: string; role: UserRole }>) => void;
}

export default function UserManagement({
  projectId,
  projectCreatorId,
  currentUserId,
  currentUserRole = "viewer",
  mode = "edit",
  selectedUsers = [],
  onUsersChange,
}: UserManagementProps) {
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isRemovingUser, setIsRemovingUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserRole, setSelectedUserRole] = useState<
    "admin" | "editor" | "viewer"
  >("viewer");
  const [error, setError] = useState<string | null>(null);
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(
    null
  );
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);

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
          setAllUsers([]);
          return;
        }
        throw error;
      }
      setAllUsers(data || []);
    } catch (error) {
      console.error("Error loading all users:", error);
      setAllUsers([]);
    }
  }, []);

  // Load project users (edit mode only)
  const loadProjectUsers = useCallback(async () => {
    if (mode !== "edit") return;

    setIsLoadingUsers(true);
    setProjectUsers([]);

    try {
      const { error: testError } = await supabase
        .from("project_users")
        .select("id")
        .limit(0);

      if (testError) {
        setIsLoadingUsers(false);
        return;
      }
    } catch (testErr) {
      setIsLoadingUsers(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("project_users")
        .select("*")
        .eq("project_id", projectId);

      if (error) {
        setIsLoadingUsers(false);
        return;
      }

      if (data && data.length > 0) {
        const userIds = data.map((pu) => pu.user_id);
        const { data: userEmails, error: emailError } = await supabase.rpc(
          "get_user_emails",
          { user_ids: userIds }
        );

        if (emailError) {
          setProjectUsers(
            data.map((pu) => ({ ...pu, user_email: pu.user_id }))
          );
        } else {
          const projectUsersWithEmails = data.map((pu) => ({
            ...pu,
            user_email:
              userEmails?.find(
                (ue: { user_id: string; email: string }) =>
                  ue.user_id === pu.user_id
              )?.email || pu.user_id,
          }));
          setProjectUsers(projectUsersWithEmails);
        }
      }
    } catch (error) {
      console.error("Error loading project users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [mode, projectId]);

  // Load data on mount
  useEffect(() => {
    loadAllUsers();
    if (mode === "edit") {
      loadProjectUsers();
    } else {
      setIsLoadingUsers(false);
    }
  }, [loadAllUsers, loadProjectUsers, mode]);

  // Add user to project
  const addUserToProject = async () => {
    if (!selectedUserId || isAddingUser) return;

    if (mode === "create") {
      // In create mode, just update the parent component's state
      const newUser = {
        user_id: selectedUserId,
        role: selectedUserRole,
      };
      onUsersChange?.([...selectedUsers, newUser]);
      setSelectedUserId("");
      setSelectedUserRole("viewer");
      return;
    }

    // Edit mode - add to database
    setIsAddingUser(true);

    try {
      const { error: testError } = await supabase
        .from("project_users")
        .select("id")
        .limit(0);

      if (testError) {
        setError("La funcionalidad de gestión de usuarios no está disponible.");
        setIsAddingUser(false);
        return;
      }
    } catch (testErr) {
      setError("La funcionalidad de gestión de usuarios no está disponible.");
      setIsAddingUser(false);
      return;
    }

    try {
      const { error } = await supabase.from("project_users").insert({
        project_id: projectId,
        user_id: selectedUserId,
        added_by: currentUserId,
        role: selectedUserRole,
      });

      if (error) throw error;

      await loadProjectUsers();
      setSelectedUserId("");
      setSelectedUserRole("viewer");
      setError(null);
    } catch (error) {
      console.error("Error adding user to project:", error);
      setError("Error al agregar usuario al proyecto");
    } finally {
      setIsAddingUser(false);
    }
  };

  // Remove user from project
  const removeUserFromProject = async (userId: string) => {
    if (mode === "create") {
      // In create mode, just update the parent component's state
      onUsersChange?.(selectedUsers.filter((u) => u.user_id !== userId));
      return;
    }

    // Edit mode - remove from database
    setIsRemovingUser(true);
    try {
      const { error } = await supabase
        .from("project_users")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) throw error;

      await loadProjectUsers();
    } catch (error) {
      console.error("Error removing user from project:", error);
      setError("Error al eliminar usuario del proyecto");
    } finally {
      setIsRemovingUser(false);
    }
  };

  // Update user role
  const updateUserRole = async (
    userId: string,
    newRole: "admin" | "editor" | "viewer"
  ) => {
    if (mode === "create") {
      // In create mode, just update the parent component's state
      const updatedUsers = selectedUsers.map((u) =>
        u.user_id === userId ? { ...u, role: newRole } : u
      );
      onUsersChange?.(updatedUsers);
      setEditingRoleUserId(null);
      return;
    }

    // Edit mode - update in database
    setIsUpdatingRole(true);
    try {
      const { error } = await supabase
        .from("project_users")
        .update({ role: newRole })
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) throw error;

      await loadProjectUsers();
      setEditingRoleUserId(null);
      setError(null);
    } catch (error) {
      console.error("Error updating user role:", error);
      setError("Error al actualizar el rol del usuario");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Get users list based on mode
  const displayUsers =
    mode === "create"
      ? [
          // Always show the creator first
          {
            id: projectCreatorId,
            user_id: projectCreatorId,
            user_email:
              allUsers.find((au) => au.user_id === projectCreatorId)?.email ||
              projectCreatorId,
            role: "creator" as UserRole,
            created_at: new Date().toISOString(),
          },
          // Then show selected users
          ...selectedUsers.map((u) => ({
            id: u.user_id,
            user_id: u.user_id,
            user_email:
              allUsers.find((au) => au.user_id === u.user_id)?.email ||
              u.user_id,
            role: u.role,
            created_at: new Date().toISOString(),
          })),
        ]
      : projectUsers;

  // Get available users (not already added)
  const availableUsers = allUsers.filter(
    (u) => !displayUsers.some((pu) => pu.user_id === u.user_id)
  );

  // Filter users by search query (only show after first letter)
  const filteredUsers = useMemo(() => {
    if (searchQuery.length === 0) {
      return []; // Don't show any until user types
    }
    return availableUsers.filter((u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableUsers, searchQuery]);

  // Paginate filtered users
  const visibleUsers = filteredUsers.slice(0, visibleCount);
  const hasMore = filteredUsers.length > visibleCount;

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(6);
  }, [searchQuery]);

  // Handle user selection
  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setIsComboboxOpen(false);
    setSearchQuery("");
    setVisibleCount(6);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Add User Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Agregar Usuario
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,auto] gap-3">
          <div>
            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isComboboxOpen}
                  className={cn(
                    "w-full justify-between",
                    !selectedUserId && "text-muted-foreground"
                  )}
                  disabled={isAddingUser}
                >
                  {selectedUserId
                    ? allUsers.find((u) => u.user_id === selectedUserId)?.email
                    : "Buscar usuario..."}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <div className="p-2">
                  <Input
                    placeholder="Escribe para buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mb-2"
                    autoFocus
                  />
                  {searchQuery.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-500">
                      Escribe al menos una letra para buscar
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-500">
                      No se encontraron usuarios
                    </div>
                  ) : (
                    <div className="max-h-[200px] overflow-y-auto">
                      {visibleUsers.map((user) => (
                        <div
                          key={user.user_id}
                          onClick={() => handleSelectUser(user.user_id)}
                          className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedUserId === user.user_id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {user.email}
                        </div>
                      ))}
                      {hasMore && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-1"
                          onClick={() => setVisibleCount((prev) => prev + 6)}
                        >
                          Mostrar más ({filteredUsers.length - visibleCount}{" "}
                          restantes)
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="sm:w-48">
            <Select
              value={selectedUserRole}
              onValueChange={(value: "admin" | "editor" | "viewer") =>
                setSelectedUserRole(value)
              }
              disabled={isAddingUser}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Observador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={addUserToProject}
            disabled={!selectedUserId || isAddingUser}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isAddingUser ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Agregando...</span>
              </div>
            ) : (
              "Agregar"
            )}
          </Button>
        </div>
      </div>

      {/* Current Users List */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Usuarios con Acceso ({displayUsers.length})
        </h3>
        {isLoadingUsers ? (
          <div className="text-center py-8 text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm">Cargando usuarios...</p>
            </div>
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No hay usuarios agregados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayUsers.map((projectUser) => (
              <div
                key={projectUser.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      projectUser.user_id === projectCreatorId
                        ? "bg-purple-100"
                        : "bg-blue-100"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        projectUser.user_id === projectCreatorId
                          ? "text-purple-600"
                          : "text-blue-600"
                      }`}
                    >
                      {(projectUser.user_email || projectUser.user_id)
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {projectUser.user_email || projectUser.user_id}
                      </p>
                      {projectUser.user_id === projectCreatorId ? (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                          Creador
                        </Badge>
                      ) : editingRoleUserId === projectUser.user_id ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={projectUser.role}
                            onValueChange={(
                              value: "admin" | "editor" | "viewer"
                            ) => updateUserRole(projectUser.user_id, value)}
                            disabled={isUpdatingRole}
                          >
                            <SelectTrigger className="h-7 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                Administrador
                              </SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Observador</SelectItem>
                            </SelectContent>
                          </Select>
                          {isUpdatingRole && (
                            <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {(() => {
                            const roleColor = getRoleColor(
                              projectUser.role as UserRole
                            );
                            const canEditRole =
                              currentUserRole === "creator" ||
                              currentUserRole === "admin";
                            return (
                              <>
                                <Badge
                                  className={cn(roleColor.bg, roleColor.text)}
                                >
                                  {getRoleLabel(projectUser.role as UserRole)}
                                </Badge>
                                {canEditRole && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingRoleUserId(projectUser.user_id);
                                    }}
                                    className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600"
                                    title="Editar rol"
                                  >
                                    <Edit2 size={12} />
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {projectUser.user_id === projectCreatorId
                        ? "Control total del proyecto"
                        : `Agregado el ${new Date(
                            projectUser.created_at
                          ).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                {projectUser.user_id !== projectCreatorId && (
                  <Button
                    onClick={() => removeUserFromProject(projectUser.user_id)}
                    disabled={isRemovingUser}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                  >
                    {isRemovingUser ? (
                      <Loader2 size={16} className="mr-1 animate-spin" />
                    ) : (
                      <Trash2 size={16} className="mr-1" />
                    )}
                    Eliminar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
