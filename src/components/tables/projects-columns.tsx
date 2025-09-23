"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Calendar, Users, Settings, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  agencies: string[];
  created_at: string;
  session_count?: number;
  user_count?: number;
}

export const projectsColumns: ColumnDef<Project>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3 w-48"
        >
          Proyecto
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const name = row.getValue("name") as string;
      const description = row.original.description;
      return (
        <div className="w-48">
          <div className="font-medium text-gray-900 truncate" title={name}>
            {name}
          </div>
          {description && (
            <div className="text-sm text-gray-500 truncate" title={description}>
              {description}
            </div>
          )}
        </div>
      );
    },
    size: 192, // 48 * 4 = 192px (w-48)
    minSize: 192,
    maxSize: 192,
  },
  {
    accessorKey: "agencies",
    header: "Agencias",
    cell: ({ row }) => {
      const agencies = row.getValue("agencies") as string[];
      return (
        <div className="flex flex-wrap gap-1">
          {agencies.slice(0, 2).map((agency, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {agency}
            </Badge>
          ))}
          {agencies.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{agencies.length - 2}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "session_count",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Sesiones
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const count = row.getValue("session_count") as number | undefined;
      return (
        <Badge variant="outline" className="text-xs">
          {count || 0}
        </Badge>
      );
    },
  },
  {
    accessorKey: "user_count",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <Users className="mr-2 h-4 w-4" />
          Usuarios
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const count = row.getValue("user_count") as number | undefined;
      return (
        <Badge variant="outline" className="text-xs">
          {count || 0}
        </Badge>
      );
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
          Creado
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string;
      const date = new Date(createdAt);
      return (
        <div className="text-sm text-gray-600">
          {format(date, "dd/MM/yyyy", { locale: es })}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => {
      const project = row.original;
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log("View project:", project.id);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log("Settings project:", project.id);
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
