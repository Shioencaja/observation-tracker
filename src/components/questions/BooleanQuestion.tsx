"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface BooleanQuestionProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function BooleanQuestion({
  id,
  name,
  value,
  onChange,
  required = false,
}: BooleanQuestionProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700">
        {name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="flex gap-6"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="Sí" id={`${id}-yes`} />
          <Label htmlFor={`${id}-yes`} className="cursor-pointer">
            Sí
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="No" id={`${id}-no`} />
          <Label htmlFor={`${id}-no`} className="cursor-pointer">
            No
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
