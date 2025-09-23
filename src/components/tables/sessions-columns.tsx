"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Eye, Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface Session {
  id: string;
  alias: string;
  agency: string | null;
  start_time: string;
  end_time: string | null;
  user_email?: string;
  observation_count?: number;
  is_finished?: boolean;
}

export const sessionsColumns: ColumnDef<Session>[] = [
  {
    accessorKey: "alias",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 w-48"
        >
          Sesión
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const alias = row.getValue("alias") as string;
      return (
        <div className="font-medium text-gray-900 w-48 truncate" title={alias}>
          {alias}
        </div>
      );
    },
    size: 192, // 48 * 4 = 192px (w-48)
    minSize: 192,
    maxSize: 192,
  },
  {
    accessorKey: "agency",
    header: "Agencia",
    cell: ({ row }) => {
      const agency = row.getValue("agency") as string | null;
      return <div className="text-gray-600">{agency || "Sin especificar"}</div>;
    },
  },
  {
    accessorKey: "start_time",
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
      const startTime = row.getValue("start_time") as string;
      const date = new Date(startTime);
      return (
        <div className="text-sm text-gray-600">
          {format(date, "dd/MM/yyyy", { locale: es })}
        </div>
      );
    },
  },
  {
    accessorKey: "start_time",
    id: "time",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <Clock className="mr-2 h-4 w-4" />
          Hora
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const startTime = row.getValue("start_time") as string;
      const date = new Date(startTime);
      return (
        <div className="text-sm text-gray-600">
          {format(date, "HH:mm", { locale: es })}
        </div>
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
    accessorKey: "observation_count",
    header: "Respuestas",
    cell: ({ row }) => {
      const count = row.getValue("observation_count") as number | undefined;
      return (
        <Badge variant="outline" className="text-xs">
          {count || 0}
        </Badge>
      );
    },
  },
  {
    accessorKey: "end_time",
    id: "status",
    header: "Estado",
    cell: ({ row }) => {
      const endTime = row.getValue("end_time") as string | null;
      const isFinished = !!endTime;
      return (
        <Badge variant={isFinished ? "default" : "secondary"}>
          {isFinished ? "Finalizada" : "Activa"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => {
      const session = row.original;
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // This will be handled by the parent component
            console.log("View session:", session.id);
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver Detalles
        </Button>
      );
    },
  },
];
