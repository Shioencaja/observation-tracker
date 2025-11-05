"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface CheckboxQuestionProps {
  id: string;
  name: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
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

// Helper to extract option ID (for checkbox value attribute)
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

export default function CheckboxQuestion({
  id,
  name,
  value,
  onChange,
  options,
  required = false,
}: CheckboxQuestionProps) {
  const handleOptionChange = (optionId: string, checked: boolean) => {
    const newValues = checked
      ? [...value, optionId]
      : value.filter((v) => v !== optionId);
    onChange(newValues);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700">
        {name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="space-y-2">
        {options.map((option, index) => {
          const displayValue = extractOptionValue(option);
          const optionId = extractOptionId(option);
          
          return (
            <div key={index} className="flex items-center space-x-2">
              <Checkbox
                id={`${id}-${index}`}
                checked={value.includes(optionId)}
                onCheckedChange={(checked) =>
                  handleOptionChange(optionId, checked as boolean)
                }
              />
              <Label htmlFor={`${id}-${index}`} className="cursor-pointer">
                {displayValue}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
