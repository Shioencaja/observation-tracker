"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FullPageLoading } from "@/components/LoadingSpinner";

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
    <FullPageLoading text="Cargando aplicación..." showLogo />
  );
}
