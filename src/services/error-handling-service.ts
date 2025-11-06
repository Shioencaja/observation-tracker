/**
 * Error Handling Service
 * 
 * Provides standardized error handling and user-friendly error messages
 */

export interface AppError {
  message: string;
  code?: string;
  type?: "database" | "auth" | "validation" | "network" | "unknown";
}

/**
 * Maps Supabase error codes to user-friendly messages
 */
const SUPABASE_ERROR_MESSAGES: Record<string, string> = {
  "23503": "No se puede realizar esta acción debido a restricciones de integridad de datos",
  "42501": "No tienes permisos para realizar esta acción",
  "PGRST116": "El recurso no existe o ya fue eliminado",
  "23505": "Este registro ya existe",
  "22P02": "El formato de los datos es incorrecto",
  "23502": "Faltan datos requeridos",
};

/**
 * Maps common error patterns to user-friendly messages
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check if it's a Supabase error with code
    const supabaseError = error as any;
    if (supabaseError.code && SUPABASE_ERROR_MESSAGES[supabaseError.code]) {
      return SUPABASE_ERROR_MESSAGES[supabaseError.code];
    }

    // Check for common error patterns in message
    const message = error.message.toLowerCase();
    
    if (message.includes("network") || message.includes("fetch")) {
      return "Error de conexión. Por favor, verifica tu conexión a internet.";
    }
    
    if (message.includes("permission") || message.includes("access")) {
      return "No tienes permisos para realizar esta acción.";
    }
    
    if (message.includes("not found") || message.includes("no existe")) {
      return "El recurso solicitado no existe o ya fue eliminado.";
    }
    
    if (message.includes("validation") || message.includes("invalid")) {
      return "Los datos proporcionados no son válidos.";
    }

    // Return the error message if it's already user-friendly
    if (error.message && error.message.length < 200) {
      return error.message;
    }
  }

  // Fallback for unknown errors
  return "Ocurrió un error inesperado. Por favor, intenta nuevamente.";
}

/**
 * Categorizes error type for better handling
 */
export function getErrorType(error: unknown): AppError["type"] {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const supabaseError = error as any;

    if (supabaseError.code === "42501" || message.includes("permission")) {
      return "auth";
    }

    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("timeout")
    ) {
      return "network";
    }

    if (
      supabaseError.code?.startsWith("23") ||
      message.includes("validation") ||
      message.includes("invalid")
    ) {
      return "validation";
    }

    if (supabaseError.code || message.includes("database")) {
      return "database";
    }
  }

  return "unknown";
}

/**
 * Creates a standardized error object
 */
export function createAppError(error: unknown): AppError {
  const supabaseError = error as any;
  return {
    message: getErrorMessage(error),
    code: supabaseError.code,
    type: getErrorType(error),
  };
}

/**
 * Determines toast type based on error type
 */
export function getToastTypeForError(error: AppError): "error" | "warning" {
  switch (error.type) {
    case "auth":
      return "error";
    case "validation":
      return "warning";
    case "network":
      return "error";
    case "database":
      return "error";
    default:
      return "error";
  }
}

