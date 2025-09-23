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

export default function CheckboxQuestion({
  id,
  name,
  value,
  onChange,
  options,
  required = false,
}: CheckboxQuestionProps) {
  const handleOptionChange = (option: string, checked: boolean) => {
    const newValues = checked
      ? [...value, option]
      : value.filter((v) => v !== option);
    onChange(newValues);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700">
        {name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Checkbox
              id={`${id}-${index}`}
              checked={value.includes(option)}
              onCheckedChange={(checked) =>
                handleOptionChange(option, checked as boolean)
              }
            />
            <Label htmlFor={`${id}-${index}`} className="cursor-pointer">
              {option}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
