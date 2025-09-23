"use client";

import { useState } from "react";

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  size?: "default" | "large";
}

export default function DateSelector({
  selectedDate,
  onDateChange,
  size = "default",
}: DateSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Fecha</label>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        max={new Date().toISOString().split("T")[0]}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
