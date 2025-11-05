"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectQuestionProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}

// Helper to extract display value from option (handles JSON strings and objects)
const extractOptionValue = (option: string | any): string => {
  // If it's already a simple string, use it
  if (typeof option === 'string' && !option.trim().startsWith('{')) {
    return option;
  }
  
  // If it's a JSON string, parse it
  if (typeof option === 'string' && option.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(option);
      if (parsed && typeof parsed === 'object' && 'value' in parsed) {
        return String(parsed.value);
      }
    } catch (e) {
      // If parsing fails, return as is
      return option;
    }
  }
  
  // If it's an object with a value property
  if (typeof option === 'object' && option !== null && 'value' in option) {
    return String(option.value);
  }
  
  // Fallback
  return String(option);
};

// Helper to extract option ID (for select value attribute)
const extractOptionId = (option: string | any): string => {
  // If it's a JSON string, parse it to get the ID
  if (typeof option === 'string' && option.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(option);
      if (parsed && typeof parsed === 'object' && 'id' in parsed) {
        return String(parsed.id);
      }
    } catch (e) {
      // If parsing fails, use the value
      return extractOptionValue(option);
    }
  }
  
  // If it's an object with an id property
  if (typeof option === 'object' && option !== null && 'id' in option) {
    return String(option.id);
  }
  
  // Fallback: use the value as the ID
  return extractOptionValue(option);
};

export default function SelectQuestion({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  required = false,
}: SelectQuestionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-gray-200 focus:border-gray-400 focus:ring-gray-400">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option, index) => {
            const displayValue = extractOptionValue(option);
            const optionId = extractOptionId(option);
            
            return (
              <SelectItem key={index} value={optionId}>
                {displayValue}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
