"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Calendar, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface Observation {
  id: string;
  question_name: string;
  question_type: string;
  response: string | null;
  created_at: string;
  user_email?: string;
}

export const observationsColumns: ColumnDef<Observation>[] = [
  {
    accessorKey: "question_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 w-48"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Pregunta
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const questionName = row.getValue("question_name") as string;
      return (
        <div
          className="font-medium text-gray-900 w-48 truncate"
          title={questionName}
        >
          {questionName}
        </div>
      );
    },
    size: 192, // 48 * 4 = 192px (w-48)
    minSize: 192,
    maxSize: 192,
  },
  {
    accessorKey: "question_type",
    header: "Tipo",
    cell: ({ row }) => {
      const questionType = row.getValue("question_type") as string;
      const typeLabels: Record<string, string> = {
        text: "Texto",
        textarea: "Párrafo",
        boolean: "Sí/No",
        radio: "Opción única",
        checkbox: "Múltiple",
        select: "Lista",
        number: "Número",
        counter: "Contador",
        date: "Fecha",
        time: "Hora",
        email: "Email",
        url: "URL",
        timer: "Temporizador",
        voice: "Voz",
      };
      return (
        <Badge variant="outline" className="text-xs">
          {typeLabels[questionType] || questionType}
        </Badge>
      );
    },
  },
  {
    accessorKey: "response",
    header: "Respuesta",
    cell: ({ row }) => {
      const response = row.getValue("response") as string | null;
      const questionType = row.original.question_type;

      if (!response) {
        return <span className="text-gray-400 text-sm">Sin respuesta</span>;
      }

      // Handle different response types
      if (questionType === "voice" && response.includes("[Audio:")) {
        const audioUrlMatch = response.match(/\[Audio: (.*?)\]/);
        if (audioUrlMatch) {
          const audioUrl = audioUrlMatch[1];
          return (
            <div className="flex items-center gap-2">
              <audio controls className="max-w-xs h-8">
                <source src={audioUrl} type="audio/webm" />
                <source src={audioUrl} type="audio/wav" />
              </audio>
            </div>
          );
        }
      }

      if (questionType === "timer" && response.startsWith("[")) {
        try {
          const timerData = JSON.parse(response);
          if (Array.isArray(timerData)) {
            return (
              <div className="text-sm">
                {timerData.length} ciclo{timerData.length !== 1 ? "s" : ""}
              </div>
            );
          }
        } catch {
          // Fall through to default
        }
      }

      if (questionType === "boolean") {
        return (
          <Badge variant={response === "true" ? "default" : "secondary"}>
            {response === "true" ? "Sí" : "No"}
          </Badge>
        );
      }

      // Default: show truncated text
      const displayText =
        response.length > 50 ? response.substring(0, 50) + "..." : response;

      return (
        <div className="text-sm text-gray-600 max-w-xs">{displayText}</div>
      );
    },
  },
  {
    accessorKey: "user_email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <User className="mr-2 h-4 w-4" />
          Usuario
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const userEmail = row.getValue("user_email") as string | undefined;
      return <div className="text-sm text-gray-600">{userEmail || "N/A"}</div>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Fecha
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string;
      const date = new Date(createdAt);
      return (
        <div className="text-sm text-gray-600">
          {format(date, "dd/MM/yyyy HH:mm", { locale: es })}
        </div>
      );
    },
  },
];
