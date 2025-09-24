"use client";

import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TextareaQuestionProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

export default function TextareaQuestion({
  id,
  name,
  value,
  onChange,
  placeholder = "Ingresa tu respuesta...",
  rows = 4,
  required = false,
}: TextareaQuestionProps) {
  const [localValue, setLocalValue] = useState(value || "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update local value when prop value changes (e.g., when loading existing data)
  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  // Debounced onChange handler
  const handleInputChange = (inputValue: string) => {
    setLocalValue(inputValue);
    
    // Clear existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new debounce timer (500ms delay)
    debounceRef.current = setTimeout(() => {
      onChange(inputValue);
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Textarea
        id={id}
        value={localValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
      />
    </div>
  );
}
