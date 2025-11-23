"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Lock, AlertCircle } from "lucide-react";
import { LoadingButton } from "@/components/loading/LoadingButton";
import { FullPageLoading } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OptimizedImage } from "@/components/OptimizedImage";
import { supabase } from "@/lib/supabase";
import { useToastManager } from "@/hooks/use-toast-manager";
import { ToastContainer } from "@/components/ui/toast";
import { isValidTokenFormat } from "@/lib/registration-tokens";

function RegisterPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  const { toasts, handleError, showSuccess, showError, removeToast } = useToastManager();

  // Check if token is provided and valid
  useEffect(() => {
    if (!token) {
      setHasAccess(false);
    } else {
      // Validate token format
      // Remove dashes for user-friendly tokens (XXXX-XXXX-XXXX-XXXX)
      const cleanToken = token.replace(/-/g, "");
      if (isValidTokenFormat(cleanToken)) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    }
  }, [token]);

  useEffect(() => {
    // Don't redirect if user is registering or if we're in the registration flow
    // Also check if we're coming from registration (to avoid redirecting during the flow)
    const fromRegister = sessionStorage.getItem("fromRegister");
    if (!authLoading && user && !isRegistering && !isLoading && !fromRegister) {
      // If user is already logged in (and not registering), show alert and redirect
      handleError(
        new Error("No puedes registrarte si ya estás iniciado sesión. Serás redirigido a la página de proyectos.")
      );
      setTimeout(() => {
        router.push("/projects");
      }, 3000); // Give time to see the message
    }
  }, [user, authLoading, router, isLoading, isRegistering]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsRegistering(true);

    // Validation
    if (password !== confirmPassword) {
      handleError(new Error("Las contraseñas no coinciden"));
      setIsLoading(false);
      setIsRegistering(false);
      return;
    }

    if (password.length < 6) {
      handleError(new Error("La contraseña debe tener al menos 6 caracteres"));
      setIsLoading(false);
      setIsRegistering(false);
      return;
    }

    try {
      // Check if user already exists in tdt_users by checking if email is already registered
      // We'll check this by attempting sign up and handling the error, or by checking auth
      // Get the site URL from environment variable or fallback to current origin
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      
      // First, try to sign up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=/register/success`,
        },
      });

      if (signUpError) {
        // Check if error is due to user already existing
        const errorMessage = signUpError.message.toLowerCase();
        const errorCode = signUpError.status?.toString() || "";
        
        console.log("SignUp error:", signUpError);
        console.log("Error message:", errorMessage);
        console.log("Error code:", errorCode);
        
        // Check various patterns for "user already exists" errors
        // Supabase typically returns errors like:
        // - "User already registered"
        // - "Email address is already registered"
        // - Status code 422 for validation errors
        const isAlreadyRegistered = 
          errorMessage.includes("already registered") ||
          errorMessage.includes("user already exists") ||
          errorMessage.includes("email already") ||
          errorMessage.includes("already exists") ||
          errorMessage.includes("user already registered") ||
          errorMessage.includes("email address is already") ||
          errorMessage.includes("duplicate") ||
          errorMessage.includes("email is already") ||
          errorCode === "422" || // Unprocessable Entity - often used for duplicate emails
          signUpError.name === "AuthApiError";
        
        if (isAlreadyRegistered) {
          console.log("⚠️ User already registered, showing error toast");
          // Use showError directly to ensure toast is shown
          showError("Este correo electrónico ya está registrado. Por favor, inicia sesión.");
          setIsLoading(false);
          setIsRegistering(false);
          return;
        }
        
        // For other errors, show them as well
        console.error("❌ SignUp error (not duplicate):", signUpError);
        handleError(signUpError, "Error al registrar usuario");
        setIsLoading(false);
        setIsRegistering(false);
        return;
      }

      // Registration successful - check if we have user data
      if (data.user) {
        console.log("✅ Registration successful, user created:", data.user.id);
        console.log("✅ Session data:", data.session ? "Session exists" : "No session (email confirmation required)");
        
        // Check if email confirmation is required
        if (!data.session) {
          // Email confirmation is required
          showSuccess("Cuenta creada. Por favor, revisa tu correo electrónico para confirmar tu cuenta. El enlace de confirmación te llevará a la página de éxito.");
          setEmailConfirmationSent(true);
          
          // Don't redirect immediately - show message about email confirmation
          setIsLoading(false);
          setIsRegistering(false);
          return;
        } else {
          // User is automatically logged in (email confirmation disabled)
          showSuccess("Cuenta creada exitosamente. Redirigiendo...");

          // Set a flag to indicate we're coming from registration
          // This prevents other pages from redirecting during the registration flow
          sessionStorage.setItem("fromRegister", "true");
          sessionStorage.setItem("registeredUserId", data.user.id);

          // Redirect to success page
          console.log("🔄 Redirecting to success page in 1.5 seconds...");
          setTimeout(() => {
            console.log("🔄 Executing redirect now...");
            window.location.href = "/register/success";
          }, 1500);
        }
      } else {
        // This shouldn't happen, but handle it
        console.error("❌ Registration succeeded but no user data returned");
        console.error("Data received:", data);
        handleError(new Error("Error inesperado durante el registro. Por favor, intenta de nuevo."));
        setIsRegistering(false);
      }
    } catch (error: unknown) {
      handleError(error, "Error al registrar usuario");
      setIsRegistering(false);
      setIsLoading(false);
    }
    // Note: We don't use finally here because if registration is successful,
    // we want to keep isLoading true until redirect happens to prevent UI flicker
  };

  if (authLoading || hasAccess === null) {
    return <FullPageLoading text="Verificando acceso..." />;
  }

  // If no token provided, show access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
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

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <CardTitle>Acceso Denegado</CardTitle>
              </div>
              <CardDescription>
                No tienes acceso a esta página de registro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertDescription>
                  Esta página de registro requiere un token de acceso válido.
                  Por favor, contacta al administrador para obtener acceso.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => router.push("/login")}
                className="w-full mt-4"
                variant="outline"
              >
                Volver al Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (user && !isRegistering) {
    // Show a message while redirecting
    return (
      <div className="min-h-screen bg-white flex flex-col">
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
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="h-6 w-6 text-yellow-500" />
                <CardTitle>Ya estás iniciado sesión</CardTitle>
              </div>
              <CardDescription>
                No puedes registrarte si ya tienes una cuenta activa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Serás redirigido a la página de proyectos en unos segundos...
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => router.push("/projects")}
                className="w-full mt-4"
                variant="outline"
              >
                Ir a Proyectos Ahora
              </Button>
            </CardContent>
          </Card>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
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
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Lock className="h-6 w-6 text-gray-600" />
                <CardTitle>Crear Cuenta</CardTitle>
              </div>
              <CardDescription>
                Completa el formulario para crear tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailConfirmationSent && (
                <Alert className="mb-4">
                  <AlertDescription>
                    <strong>¡Cuenta creada exitosamente!</strong>
                    <br />
                    Por favor, revisa tu correo electrónico ({email}) y haz clic en el enlace de confirmación. 
                    El enlace te llevará a la página de éxito del registro donde podrás agregarte al sistema.
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-2 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Contraseña
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-gray-700"
                  >
                    Confirmar Contraseña
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirma tu contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <LoadingButton
                  type="submit"
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                  isLoading={isLoading}
                  loadingText="Creando cuenta..."
                  size="lg"
                >
                  Crear Cuenta
                </LoadingButton>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => router.push("/login")}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    ¿Ya tienes una cuenta? Inicia sesión
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <FullPageLoading text="Cargando..." />
          </div>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}

