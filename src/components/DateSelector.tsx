"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function DateSelector({
  selectedDate,
  onDateChange,
}: DateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const today = new Date();
  const currentDate = new Date(selectedDate);

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const goToToday = () => {
    onDateChange(formatDate(today));
  };

  const isToday = formatDate(currentDate) === formatDate(today);

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-sm"
          >
            <Calendar size={14} />
            {formatDisplayDate(currentDate)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                onDateChange(e.target.value);
                setIsOpen(false);
              }}
              className="w-full text-sm"
              aria-label="Select date"
              title="Select date to view observations"
            />
          </div>
        </PopoverContent>
      </Popover>

      {!isToday && (
        <Button
          onClick={goToToday}
          variant="outline"
          size="sm"
          className="text-xs px-1.5 py-0.5 h-auto"
        >
          Hoy
        </Button>
      )}
    </div>
  );
}
