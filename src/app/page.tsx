"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        // User is logged in, redirect to projects
        router.push("/projects");
      } else {
        // User is not logged in, redirect to login
        router.push("/login");
      }
    }
  }, [user, authLoading, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Observaciones BCP
        </h1>
        <p className="text-muted-foreground text-lg">Cargando aplicación...</p>
      </div>
    </div>
  );
}
