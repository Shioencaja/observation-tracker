"use client";

import { DataTableWithPagination } from "@/components/ui/data-table-with-pagination";
import { projectsColumns, Project } from "./projects-columns";
import { useRouter } from "next/navigation";

interface ProjectsDataTableProps {
  projects: Project[];
  onProjectSelect?: (projectId: string) => void;
  onProjectSettings?: (projectId: string) => void;
  [key: string]: any; // Allow any additional props
}

export default function ProjectsDataTable({
  projects,
  onProjectSelect,
  onProjectSettings,
}: ProjectsDataTableProps) {
  const router = useRouter();

  const handleProjectView = (projectId: string) => {
    if (onProjectSelect) {
      onProjectSelect(projectId);
    } else {
      router.push(`/${projectId}/sessions`);
    }
  };

  const handleProjectSettings = (projectId: string) => {
    if (onProjectSettings) {
      onProjectSettings(projectId);
    } else {
      router.push(`/${projectId}/settings`);
    }
  };

  // Create columns with the action handlers
  const columnsWithActions = projectsColumns.map((column) => {
    if (column.id === "actions") {
      return {
        ...column,
        cell: ({ row }: any) => {
          const project = row.original;
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleProjectView(project.id)}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
              >
                Ver
              </button>
              <button
                onClick={() => handleProjectSettings(project.id)}
                title="Configuración del proyecto"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          );
        },
      };
    }
    return column;
  });

  return (
    <div className="w-full">
      <DataTableWithPagination
        columns={columnsWithActions}
        data={projects}
        itemsPerPage={10}
      />
    </div>
  );
}
