"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface ProjectNotFoundDisplayProps {
  projectId: string;
}

export function ProjectNotFoundDisplay({
  projectId,
}: ProjectNotFoundDisplayProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Proyecto no encontrado</CardTitle>
          <CardDescription>
            El proyecto con el ID {projectId} no existe o no tienes acceso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/projects")}>
            Volver a Proyectos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

