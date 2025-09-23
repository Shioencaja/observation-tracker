"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Plus,
  Trash2,
  SquarePen,
} from "lucide-react";

interface TimerQuestionProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

interface Cycle {
  id: string;
  name: string;
  duration: number; // in seconds
  timestamp?: string;
}

export default function TimerQuestionNew({
  id,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
}: TimerQuestionProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef(0);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Parse initial value and cycles
  useEffect(() => {
    if (value) {
      try {
        // Check if value is already parsed (array/object) or needs parsing (string)
        const parsedValue =
          typeof value === "string" ? JSON.parse(value) : value;

        // Handle the actual data structure: array of cycle objects
        if (Array.isArray(parsedValue)) {
          // Convert the actual structure to our internal format
          const convertedCycles: Cycle[] = parsedValue.map((cycle, index) => ({
            id: cycle.id || `cycle-${index}`,
            name: cycle.alias || `Ciclo ${index + 1}`,
            duration: cycle.seconds || 0,
            timestamp: cycle.timestamp,
          }));
          setCycles(convertedCycles);
          // When loading existing cycles, reset timer to 0
          // The cycles are already saved, so we start fresh
          setTime(0);
          currentTimeRef.current = 0;
        } else if (parsedValue.cycles && Array.isArray(parsedValue.cycles)) {
          // Handle the expected structure (for backward compatibility)
          setCycles(parsedValue.cycles);
          const initialTime = parsedValue.currentTime || 0;
          setTime(initialTime);
          currentTimeRef.current = initialTime;
        }
      } catch (error) {
        // If not JSON, treat as simple time value
        if (value.includes(":")) {
          const parts = value.split(":").map(Number);
          const totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          setTime(totalSeconds);
          currentTimeRef.current = totalSeconds;
        } else {
          const initialTime = parseInt(value) || 0;
          setTime(initialTime);
          currentTimeRef.current = initialTime;
        }
      }
    } else {
      // Initialize with empty state if no value
      setCycles([]);
      setTime(0);
      currentTimeRef.current = 0;
    }
  }, [value]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimeShort = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const startTimer = () => {
    if (disabled) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      currentTimeRef.current += 1;
      setTime(currentTimeRef.current);
    }, 1000);
  };

  const startNextCycle = () => {
    if (disabled) return;

    // Always save current time as a cycle (even if 0)
    const newCycle: Cycle = {
      id: Date.now().toString(),
      name: `Ciclo ${cycles.length + 1}`,
      duration: currentTimeRef.current,
      timestamp: new Date().toISOString(),
    };
    const newCycles = [...cycles, newCycle];

    // Clear existing interval FIRST to prevent any more ticks
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Reset timer to 0 IMMEDIATELY
    currentTimeRef.current = 0;
    setTime(0);
    setCycles(newCycles);

    // Restart timer if it was running
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        currentTimeRef.current += 1;
        setTime(currentTimeRef.current);
      }, 1000);
    }

    // Notify parent with the new cycles
    notifyParent(newCycles);
  };

  const pauseTimer = () => {
    if (disabled) return;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    // Notify parent when user pauses
    notifyParent();
  };

  const stopTimer = () => {
    if (disabled) return;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    // Save current time as a cycle if there's any time
    if (currentTimeRef.current > 0) {
      const newCycle: Cycle = {
        id: Date.now().toString(),
        name: `Ciclo ${cycles.length + 1}`,
        duration: currentTimeRef.current,
        timestamp: new Date().toISOString(),
      };
      const newCycles = [...cycles, newCycle];
      setCycles(newCycles);
      currentTimeRef.current = 0;
      setTime(0);
      notifyParent(newCycles);
    }
  };

  const resetTimer = () => {
    if (disabled) return;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    currentTimeRef.current = 0;
    setTime(0);
    // Don't notify parent on reset - just clear the timer
  };

  const startEditingCycle = (cycleId: string, currentName: string) => {
    if (disabled) return;
    setEditingCycleId(cycleId);
    setEditingName(currentName);
  };

  const saveCycleName = (cycleId: string) => {
    if (disabled) return;
    const newCycles = cycles.map((cycle) =>
      cycle.id === cycleId ? { ...cycle, name: editingName } : cycle
    );
    setCycles(newCycles);
    setEditingCycleId(null);
    setEditingName("");
    // Don't change the current timer time when editing cycle names
    // The timer should continue from where it was
    // Notify parent when user edits cycle name
    notifyParent(newCycles);
  };

  const cancelEditing = () => {
    setEditingCycleId(null);
    setEditingName("");
  };

  const removeCycle = (cycleId: string) => {
    if (disabled) return;
    const newCycles = cycles.filter((cycle) => cycle.id !== cycleId);
    setCycles(newCycles);
    // Don't change the current timer time when removing cycles
    // The timer should continue from where it was
    // Notify parent with the new cycles
    notifyParent(newCycles);
  };

  // Simple notify parent function
  const notifyParent = useCallback(
    (cyclesToNotify?: Cycle[]) => {
      const cyclesToUse = cyclesToNotify || cycles;
      const result = cyclesToUse.map((cycle) => ({
        id: cycle.id,
        seconds: cycle.duration,
        timestamp: cycle.timestamp || new Date().toISOString(),
        alias: cycle.name,
      }));
      onChange(JSON.stringify(result));
    },
    [cycles, onChange]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700">
        {name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="space-y-3">
        {/* Timer Display and Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Timer Display */}
          <div className="bg-muted/50 rounded-md px-3 py-2 min-w-[100px] sm:min-w-[120px] text-center w-full sm:w-auto">
            <span className="text-xl sm:text-2xl font-semibold">
              {formatTime(time)}
            </span>
          </div>

          {/* Start Next Cycle Button - only show when timer is running */}
          {isRunning && (
            <Button
              type="button"
              onClick={startNextCycle}
              size="sm"
              variant="outline"
              disabled={disabled}
              className="flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} className="mr-1" />
              Nuevo Ciclo
            </Button>
          )}

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {!isRunning ? (
              <Button
                type="button"
                onClick={startTimer}
                size="sm"
                disabled={disabled}
                className="flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={16} className="mr-1" />
                Iniciar
              </Button>
            ) : (
              <Button
                type="button"
                onClick={pauseTimer}
                size="sm"
                disabled={disabled}
                className="flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pause size={16} className="mr-1" />
                Pausar
              </Button>
            )}

            <Button
              type="button"
              onClick={stopTimer}
              size="sm"
              variant="outline"
              disabled={disabled}
              className="flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square size={16} className="mr-1" />
              Parar
            </Button>

            <Button
              type="button"
              onClick={resetTimer}
              size="sm"
              variant="outline"
              disabled={disabled}
              className="flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={16} className="mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Cycle History */}
        {cycles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Historial de Ciclos
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {cycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="flex justify-between items-center text-xs sm:text-sm bg-muted/30 px-2 sm:px-3 py-2 rounded-md"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      {editingCycleId === cycle.id ? (
                        <div className="flex items-center space-x-1">
                          <Input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="text-xs h-6 px-1 py-0"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveCycleName(cycle.id);
                              } else if (e.key === "Escape") {
                                cancelEditing();
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            type="button"
                            onClick={() => saveCycleName(cycle.id)}
                            size="sm"
                            className="h-6 px-1 text-xs"
                          >
                            ✓
                          </Button>
                          <Button
                            type="button"
                            onClick={cancelEditing}
                            size="sm"
                            variant="outline"
                            className="h-6 px-1 text-xs"
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium truncate cursor-pointer hover:text-primary">
                            {cycle.name}
                          </span>
                          {!disabled && (
                            <Button
                              type="button"
                              onClick={() =>
                                startEditingCycle(cycle.id, cycle.name)
                              }
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0"
                            >
                              <SquarePen size={10} />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    {cycle.timestamp && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(cycle.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-semibold text-xs sm:text-sm flex-shrink-0 ml-2">
                      {formatTimeShort(cycle.duration)}
                    </span>
                    {!disabled && (
                      <Button
                        type="button"
                        onClick={() => removeCycle(cycle.id)}
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={10} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
