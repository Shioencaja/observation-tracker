"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, RotateCcw, Plus, Trash2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

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
}

export default function TimerQuestion({
  id,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
}: TimerQuestionProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [cycles, setCycles] = useState<Cycle[]>([
    { id: "1", name: "Ciclo 1", duration: 0 },
  ]);
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);
  const [cycleName, setCycleName] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse initial value and cycles
  useEffect(() => {
    if (value) {
      try {
        const parsedValue = JSON.parse(value);

        // Handle the actual data structure: array of cycle objects
        if (Array.isArray(parsedValue)) {
          // Convert the actual structure to our internal format
          const convertedCycles: Cycle[] = parsedValue.map((cycle, index) => ({
            id: cycle.id || `cycle-${index}`,
            name: cycle.alias || `Ciclo ${index + 1}`,
            duration: cycle.seconds || 0,
          }));
          setCycles(convertedCycles);
          // Set time to the total of all cycles
          const totalTime = parsedValue.reduce(
            (sum, cycle) => sum + (cycle.seconds || 0),
            0
          );
          setTime(totalTime);
        } else if (parsedValue.cycles && Array.isArray(parsedValue.cycles)) {
          // Handle the expected structure (for backward compatibility)
          setCycles(parsedValue.cycles);
          setTime(parsedValue.currentTime || 0);
        }
      } catch (error) {
        // If not JSON, treat as simple time value
        if (value.includes(":")) {
          const parts = value.split(":").map(Number);
          const totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          setTime(totalSeconds);
        } else {
          setTime(parseInt(value) || 0);
        }
      }
    }
  }, [value]);

  // Memoize the onChange callback to prevent infinite loops
  const handleTimeChange = useCallback(
    (newTime: number, newCycles?: Cycle[]) => {
      setTime(newTime);
      const currentCycles = newCycles || cycles;
      const formattedTime = formatTime(newTime);

      // Convert to the expected data structure
      const result = currentCycles.map((cycle) => ({
        id: cycle.id,
        seconds: cycle.duration,
        timestamp: new Date().toISOString(),
        alias: cycle.name,
      }));

      onChange(JSON.stringify(result));
    },
    [onChange, cycles]
  );

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimer = () => {
    if (disabled) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setTime((prev) => {
        const newTime = prev + 1;
        handleTimeChange(newTime);
        return newTime;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    if (disabled) return;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const stopTimer = () => {
    if (disabled) return;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    handleTimeChange(0);
  };

  const resetTimer = () => {
    if (disabled) return;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setCurrentCycleIndex(0);
    handleTimeChange(0);
  };

  const addCycle = () => {
    if (disabled) return;
    const newCycle: Cycle = {
      id: Date.now().toString(),
      name: cycleName || `Ciclo ${cycles.length + 1}`,
      duration: 0,
    };
    const newCycles = [...cycles, newCycle];
    setCycles(newCycles);
    setCycleName("");
    const totalTime = newCycles.reduce((sum, cycle) => sum + cycle.duration, 0);
    handleTimeChange(totalTime, newCycles);
  };

  const removeCycle = (cycleId: string) => {
    const newCycles = cycles.filter((cycle) => cycle.id !== cycleId);

    // If no cycles left, create a new default one
    if (newCycles.length === 0) {
      const defaultCycle: Cycle = {
        id: Date.now().toString(),
        name: "Ciclo 1",
        duration: 0,
      };
      setCycles([defaultCycle]);
      setCurrentCycleIndex(0);
      handleTimeChange(0, [defaultCycle]);
    } else {
      setCycles(newCycles);
      if (currentCycleIndex >= newCycles.length) {
        setCurrentCycleIndex(newCycles.length - 1);
      }
      const totalTime = newCycles.reduce(
        (sum, cycle) => sum + cycle.duration,
        0
      );
      handleTimeChange(totalTime, newCycles);
    }
  };

  const updateCycleDuration = (cycleId: string, duration: number) => {
    const newCycles = cycles.map((cycle) =>
      cycle.id === cycleId ? { ...cycle, duration } : cycle
    );
    setCycles(newCycles);
    const totalTime = newCycles.reduce((sum, cycle) => sum + cycle.duration, 0);
    handleTimeChange(totalTime, newCycles);
  };

  const updateCycleName = (cycleId: string, name: string) => {
    const newCycles = cycles.map((cycle) =>
      cycle.id === cycleId ? { ...cycle, name } : cycle
    );
    setCycles(newCycles);
    const totalTime = newCycles.reduce((sum, cycle) => sum + cycle.duration, 0);
    handleTimeChange(totalTime, newCycles);
  };

  const setCycleTime = (cycleId: string) => {
    const newCycles = cycles.map((cycle) =>
      cycle.id === cycleId ? { ...cycle, duration: time } : cycle
    );
    setCycles(newCycles);
    // Update the total time to reflect the sum of all cycle durations
    const totalTime = newCycles.reduce((sum, cycle) => sum + cycle.duration, 0);
    handleTimeChange(totalTime, newCycles);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-gray-700">
        {name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {/* Timer Display */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-2xl font-mono font-bold text-gray-900 bg-white px-4 py-2 rounded-lg min-w-[120px] text-center">
          {formatTime(time)}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button
              type="button"
              onClick={startTimer}
              size="sm"
              disabled={disabled}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="bg-yellow-600 hover:bg-yellow-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={16} className="mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Cycles Management */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-gray-700">Ciclos:</Label>
          {!disabled && (
            <div className="flex gap-2">
              <Input
                type="text"
                value={cycleName}
                onChange={(e) => setCycleName(e.target.value)}
                placeholder="Nombre del ciclo"
                className="w-40 text-sm"
              />
              <Button
                type="button"
                onClick={addCycle}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus size={16} className="mr-1" />
                Agregar
              </Button>
            </div>
          )}
        </div>

        {/* Cycles List */}
        <div className="space-y-2">
          {cycles.map((cycle, index) => (
            <div
              key={cycle.id}
              className={`flex items-center gap-2 p-2 rounded-lg border ${
                index === currentCycleIndex
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white"
              } ${disabled ? "opacity-60" : ""}`}
            >
              <div className="flex-1">
                <Input
                  type="text"
                  value={cycle.name}
                  onChange={(e) => updateCycleName(cycle.id, e.target.value)}
                  disabled={disabled}
                  className="text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {formatTime(cycle.duration)}
                </span>
                {!disabled && (
                  <>
                    <Button
                      type="button"
                      onClick={() => setCycleTime(cycle.id)}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => removeCycle(cycle.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
