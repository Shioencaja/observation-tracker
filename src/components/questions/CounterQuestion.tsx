"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useState, useCallback, useEffect } from "react";

interface CounterQuestionProps {
  id: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
}

export default function CounterQuestion({
  id,
  name,
  value,
  onChange,
  required = false,
}: CounterQuestionProps) {
  const [count, setCount] = useState(value || 0);

  // Memoize the onChange callback to prevent infinite loops
  const handleCountChange = useCallback(
    (newCount: number) => {
      setCount(newCount);
      onChange(newCount);
    },
    [onChange]
  );

  // Initialize count from value
  useEffect(() => {
    if (value !== undefined && value !== count) {
      setCount(value);
    }
  }, [value]);

  const increment = () => {
    handleCountChange(count + 1);
  };

  const decrement = () => {
    if (count > 0) {
      handleCountChange(count - 1);
    }
  };

  const reset = () => {
    handleCountChange(0);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700">
        {name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="flex items-center gap-4">
        {/* Counter Display */}
        <div className="text-2xl font-mono font-bold text-gray-900 bg-gray-100 px-6 py-3 rounded-lg min-w-[80px] text-center">
          {count}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={decrement}
            size="sm"
            variant="outline"
            disabled={count <= 0}
            className="border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus size={16} />
          </Button>

          <Button
            type="button"
            onClick={increment}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus size={16} />
          </Button>

          <Button
            type="button"
            onClick={reset}
            size="sm"
            variant="outline"
            className="border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            <RotateCcw size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
