"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, RefreshCw, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  generateRegistrationToken,
  generateUserFriendlyToken,
} from "@/lib/registration-tokens";

export default function GenerateTokenPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [tokenType, setTokenType] = useState<"standard" | "friendly">("friendly");

  // Redirect if not authenticated
  if (authLoading) {
    return <FullPageLoading text="Cargando..." />;
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const handleGenerateToken = () => {
    const newToken =
      tokenType === "friendly"
        ? generateUserFriendlyToken()
        : generateRegistrationToken();
    setToken(newToken);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy token:", error);
    }
  };

  const getRegistrationUrl = () => {
    if (!token) return "";
    return `${window.location.origin}/register/${token}`;
  };

  const handleCopyUrl = async () => {
    const url = getRegistrationUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-6">
          <Button
            onClick={() => router.push("/projects")}
            variant="ghost"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft size={16} className="mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">
            Generar Token de Registro
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Genera tokens para permitir el registro de nuevos usuarios
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Token de Registro</CardTitle>
            <CardDescription>
              Genera un token que los usuarios necesitarán para registrarse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tipo de Token
              </label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={tokenType === "friendly" ? "default" : "outline"}
                  onClick={() => setTokenType("friendly")}
                  className="flex-1"
                >
                  Amigable (XXXX-XXXX-XXXX-XXXX)
                </Button>
                <Button
                  type="button"
                  variant={tokenType === "standard" ? "default" : "outline"}
                  onClick={() => setTokenType("standard")}
                  className="flex-1"
                >
                  Estándar (32 caracteres)
                </Button>
              </div>
            </div>

            <div>
              <Button
                onClick={handleGenerateToken}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                size="lg"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generar Nuevo Token
              </Button>
            </div>

            {token && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Token Generado
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-md font-mono text-sm break-all">
                      {token}
                    </div>
                    <Button
                      onClick={handleCopy}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    URL de Registro
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm break-all">
                      {getRegistrationUrl()}
                    </div>
                    <Button
                      onClick={handleCopyUrl}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Instrucciones:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Comparte el token o la URL con el usuario que necesita registrarse</li>
                      <li>El usuario debe acceder a la URL de registro o ingresar el token manualmente</li>
                      <li>Una vez usado, el token puede ser reutilizado (puedes implementar validación adicional si lo deseas)</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

