"use client";

import { useEffect } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectUsers } from "@/hooks/use-project-users";

interface UserManagementSectionProps {
  projectId: string;
  projectCreatorId: string;
  currentUserId: string;
}

export function UserManagementSection({
  projectId,
  projectCreatorId,
  currentUserId,
}: UserManagementSectionProps) {
  const {
    projectUsers,
    allUsers,
    isLoading,
    isAdding,
    isRemoving,
    selectedUserId,
    setSelectedUserId,
    loadUsers,
    addUser,
    removeUser,
  } = useProjectUsers(projectId);

  useEffect(() => {
    if (projectId) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleAddUser = async () => {
    if (!selectedUserId) return;
    await addUser(projectId, selectedUserId, currentUserId);
  };

  const availableUsers = allUsers.filter(
    (u) => !projectUsers.some((pu) => pu.user_id === u.user_id)
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Usuarios del Proyecto
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona quién puede acceder a este proyecto
        </p>
      </div>
      <div className="p-6 space-y-4">
        {/* Add User Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Agregar Usuario
          </h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAddUser}
              disabled={!selectedUserId || isAdding}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {isAdding ? (
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
            Usuarios con Acceso ({projectUsers.length})
          </h3>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Cargando usuarios...</p>
              </div>
            </div>
          ) : projectUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No hay usuarios agregados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projectUsers.map((projectUser) => (
                <div
                  key={projectUser.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        projectUser.user_id === projectCreatorId
                          ? "bg-green-100"
                          : "bg-blue-100"
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          projectUser.user_id === projectCreatorId
                            ? "text-green-600"
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
                        {projectUser.user_id === projectCreatorId && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Creador
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {projectUser.user_id === projectCreatorId
                          ? "Creador del proyecto"
                          : `Agregado el ${new Date(
                              projectUser.created_at
                            ).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  {projectUser.user_id !== projectCreatorId && (
                    <Button
                      onClick={() => removeUser(projectId, projectUser.user_id)}
                      disabled={isRemoving}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      {isRemoving ? (
                        <Loader2 size={16} className="mr-1 animate-spin" />
                      ) : (
                        <Trash2 size={16} className="mr-1" />
                      )}
                      {isRemoving ? "Removiendo..." : "Remover"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

