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

export default function RegisterSuccessPage() {
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
      // Check if we're coming from registration
      const fromRegister = sessionStorage.getItem("fromRegister");
      if (fromRegister === "true") {
        // Wait a bit for auth state to update (user might be logging in)
        setTimeout(() => {
          // Check again after delay
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
              // Still no session, redirect to login
              sessionStorage.removeItem("fromRegister");
              router.push("/login");
            }
          });
        }, 2000);
      } else {
        // User not logged in and not from registration, redirect to login
        router.push("/login");
      }
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
        showSuccess("Usuario agregado exitosamente al sistema");
        setIsInTdtUsers(true);
      }
    } catch (error: unknown) {
      handleError(error, "Error al agregar usuario al sistema");
    } finally {
      setIsAdding(false);
    }
  };

  const handleContinue = () => {
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
                <CardTitle>¡Cuenta Creada Exitosamente!</CardTitle>
              </div>
              <CardDescription>
                Tu cuenta ha sido creada. Ahora puedes agregarte al sistema de
                Toma de Tiempos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInTdtUsers ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ya estás registrado en el sistema de Toma de Tiempos.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertDescription>
                    Para usar el sistema de Toma de Tiempos, necesitas agregar
                    tu cuenta al sistema.
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
                      Agregar al Sistema de Toma de Tiempos
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={handleContinue}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Continuar a Proyectos
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

