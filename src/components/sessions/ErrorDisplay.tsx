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

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onRetry}>Reintentar</Button>
          <Button
            variant="link"
            onClick={() => router.push("/projects")}
            className="ml-2"
          >
            Volver a Proyectos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

