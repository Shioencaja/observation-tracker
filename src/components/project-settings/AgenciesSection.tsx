"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AgenciesSectionProps {
  agencies: string[];
  onAddAgency: (agency: string) => void;
  onRemoveAgency: (agency: string) => void;
  onUnsavedChange?: () => void;
}

export function AgenciesSection({
  agencies,
  onAddAgency,
  onRemoveAgency,
  onUnsavedChange,
}: AgenciesSectionProps) {
  const [newAgency, setNewAgency] = useState("");

  const handleAddAgency = () => {
    if (newAgency.trim() && !agencies.includes(newAgency.trim())) {
      onAddAgency(newAgency.trim());
      setNewAgency("");
      onUnsavedChange?.();
    }
  };

  const handleRemoveAgency = (agency: string) => {
    onRemoveAgency(agency);
    onUnsavedChange?.();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Agencias</h2>
        <p className="text-sm text-gray-500 mt-1">
          Define las agencias disponibles para este proyecto
        </p>
      </div>
      <div className="p-6 space-y-4">
        {/* Add Agency Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Agregar Agencia
          </h3>
          <div className="flex gap-3">
            <Input
              value={newAgency}
              onChange={(e) => setNewAgency(e.target.value)}
              placeholder="Nombre de la agencia"
              className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
              onKeyPress={(e) => e.key === "Enter" && handleAddAgency()}
            />
            <Button
              onClick={handleAddAgency}
              disabled={!newAgency.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Agregar
            </Button>
          </div>
        </div>

        {/* Current Agencies List */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Agencias Configuradas ({agencies.length})
          </h3>
          {agencies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No hay agencias configuradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agencies.map((agency, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-xs font-medium">
                        {agency.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {agency}
                    </span>
                  </div>
                  <Button
                    onClick={() => handleRemoveAgency(agency)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

