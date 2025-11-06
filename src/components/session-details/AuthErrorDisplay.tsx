import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { redirectToProjects } from "@/lib/auth-utils";

interface AuthErrorDisplayProps {
  error: string;
}

export function AuthErrorDisplay({ error }: AuthErrorDisplayProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error de Acceso
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => redirectToProjects()} className="w-full">
            Volver a Proyectos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

