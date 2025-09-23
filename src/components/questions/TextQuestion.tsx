"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TextQuestionProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function TextQuestion({
  id,
  name,
  value,
  onChange,
  placeholder = "Ingresa tu respuesta...",
  required = false,
  disabled = false,
}: TextQuestionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="border-gray-200 focus:border-gray-400 focus:ring-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
}
