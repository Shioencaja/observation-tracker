"use client";

import { useState, useEffect } from "react";
import { Clock, Square } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Session } from "@/types/observation";

interface SessionHeaderProps {
  session: Session;
  onUpdate: () => void;
}

export default function SessionHeader({
  session,
  onUpdate,
}: SessionHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sessionDuration, setSessionDuration] = useState("");

  // Calculate session duration
  useEffect(() => {
    const updateDuration = () => {
      const start = new Date(session.start_time);
      const end = session.end_time ? new Date(session.end_time) : new Date();
      const diff = end.getTime() - start.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setSessionDuration(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setSessionDuration(`${minutes}m ${seconds}s`);
      } else {
        setSessionDuration(`${seconds}s`);
      }
    };

    updateDuration();

    if (!session.end_time) {
      const interval = setInterval(updateDuration, 1000);
      return () => clearInterval(interval);
    }
  }, [session.start_time, session.end_time]);

  const handleEndSession = async () => {
    if (session.end_time) return; // Already ended

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("sessions")
        .update({
          end_time: now,
          updated_at: now,
        })
        .eq("id", session.id);

      if (error) throw error;

      onUpdate();
    } catch (error) {
      console.error("Error ending session:", error);
      alert("Failed to end session");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Observation Session
          </h2>
          {sessionDuration && (
            <p className="text-sm text-gray-600 mt-1">
              Duration:{" "}
              <span className="font-medium text-blue-600">
                {sessionDuration}
              </span>
              {!session.end_time && (
                <span className="ml-2 text-green-600">● Live</span>
              )}
            </p>
          )}
        </div>
        {!session.end_time && (
          <button
            onClick={handleEndSession}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Square size={16} />
            End Session
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Time */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Clock size={16} />
            Start Time
          </label>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <span className="text-gray-800 font-medium">
              {formatDateTime(session.start_time)}
            </span>
            <p className="text-xs text-gray-500 mt-1">
              Set when session was created
            </p>
          </div>
        </div>

        {/* End Time */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Square size={16} />
            End Time
          </label>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            {session.end_time ? (
              <>
                <span className="text-gray-800 font-medium">
                  {formatDateTime(session.end_time)}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Set when session was ended
                </p>
              </>
            ) : (
              <>
                <span className="text-gray-600 italic">
                  Session in progress...
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Will be set when you end the session
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
