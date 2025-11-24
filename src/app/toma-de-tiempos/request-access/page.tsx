"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, UserPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FullPageLoading } from "@/components/LoadingSpinner";
import { OptimizedImage } from "@/components/OptimizedImage";
import { supabase } from "@/lib/supabase";
import { useToastManager } from "@/hooks/use-toast-manager";
import { ToastContainer } from "@/components/ui/toast";

export default function RequestAccessPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isInTdtUsers, setIsInTdtUsers] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const { toasts, handleError, showSuccess, removeToast } = useToastManager();

  // Check if user is already in tdt_users
  useEffect(() => {
    const checkTdtUser = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("tdt_users")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 is "not found" error, which is expected
          console.error("Error checking tdt_users:", error);
          setIsInTdtUsers(false);
        } else {
          setIsInTdtUsers(!!data);
          // If user already has access, redirect to toma-de-tiempos
          if (data) {
            setTimeout(() => {
              router.push("/toma-de-tiempos");
            }, 1000);
          }
        }
      } catch (error) {
        console.error("Error checking tdt_users:", error);
        setIsInTdtUsers(false);
      } finally {
        setIsChecking(false);
      }
    };

    if (!authLoading && user) {
      checkTdtUser();
    } else if (!authLoading && !user) {
      // User not logged in, redirect to login
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const handleAddToTdtUsers = async () => {
    if (!user) {
      handleError(new Error("Usuario no autenticado"));
      return;
    }

    setIsAdding(true);

    try {
      // Check again if user already exists
      const { data: existingUser } = await supabase
        .from("tdt_users")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existingUser) {
        handleError(new Error("El usuario ya está registrado en el sistema"));
        setIsInTdtUsers(true);
        setIsAdding(false);
        return;
      }

      // Add user to tdt_users table
      const { error: tdtUserError } = await supabase
        .from("tdt_users")
        .insert({
          user_id: user.id,
          created_at: new Date().toISOString(),
        });

      if (tdtUserError) {
        // Check if error is due to duplicate
        if (
          tdtUserError.code === "23505" ||
          tdtUserError.message.toLowerCase().includes("duplicate") ||
          tdtUserError.message.toLowerCase().includes("unique")
        ) {
          handleError(
            new Error("El usuario ya está registrado en el sistema")
          );
          setIsInTdtUsers(true);
        } else {
          throw tdtUserError;
        }
      } else {
        showSuccess("Usuario agregado exitosamente. Ahora puedes acceder a Toma de Tiempos.");
        setIsInTdtUsers(true);
        // Redirect to toma-de-tiempos after a short delay
        setTimeout(() => {
          router.push("/toma-de-tiempos");
        }, 1500);
      }
    } catch (error: unknown) {
      handleError(error, "Error al agregar usuario al sistema");
    } finally {
      setIsAdding(false);
    }
  };

  const handleBack = () => {
    router.push("/projects");
  };

  if (authLoading || isChecking) {
    return <FullPageLoading text="Cargando..." />;
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Logo in top left corner */}
      <div className="absolute top-6 left-6">
        <OptimizedImage
          src="/lg_container_light.svg"
          alt="Logo"
          width={120}
          height={49}
          priority
          sizes="(max-width: 768px) 120px, 120px"
          className="h-12 w-auto"
        />
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <CardTitle>Acceso Requerido</CardTitle>
              </div>
              <CardDescription>
                Para usar el sistema de Toma de Tiempos, necesitas agregar tu
                cuenta al sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInTdtUsers ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ya tienes acceso al sistema de Toma de Tiempos. Serás
                    redirigido...
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertDescription>
                    Haz clic en el botón de abajo para solicitar acceso al
                    sistema de Toma de Tiempos.
                  </AlertDescription>
                </Alert>
              )}

              {!isInTdtUsers && (
                <Button
                  onClick={handleAddToTdtUsers}
                  disabled={isAdding}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                  size="lg"
                >
                  {isAdding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Agregando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Solicitar Acceso a Toma de Tiempos
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={handleBack}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Volver a Proyectos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

