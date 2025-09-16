"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Observation } from "@/types/observation";

interface ObservationItemProps {
  observation: Observation;
  onUpdate: () => void;
}

export default function ObservationItem({
  observation,
  onUpdate,
}: ObservationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(observation.description);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (description.trim() === "") return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("observations")
        .update({
          description: description.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", observation.id);

      if (error) throw error;

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating observation:", error);
      alert("Failed to update observation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setDescription(observation.description);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {isEditing ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full p-3 border border-blue-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              rows={3}
              autoFocus
              disabled={isLoading}
              placeholder="Enter your observation..."
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="cursor-pointer p-3 rounded-md hover:bg-white transition-colors"
            >
              <p className="text-gray-800 leading-relaxed">
                {observation.description}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-gray-500">
              {new Date(observation.created_at).toLocaleTimeString()}
            </p>
            {observation.updated_at !== observation.created_at && (
              <p className="text-xs text-blue-600">
                Edited {new Date(observation.updated_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isLoading || description.trim() === ""}
                className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save changes (Enter)"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Cancel (Escape)"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-600 hover:bg-white rounded-md transition-colors opacity-0 group-hover:opacity-100"
              title="Edit observation"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
