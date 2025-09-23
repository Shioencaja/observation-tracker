"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateQuestionProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function DateQuestion({
  id,
  name,
  value,
  onChange,
  required = false,
}: DateQuestionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
      />
    </div>
  );
}
