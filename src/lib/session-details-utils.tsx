import { formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import React from "react";

/**
 * Safely parse JSON string, returning original string if parsing fails
 */
export function parseJsonSafely(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/**
 * Format response for display in the UI
 */
export function formatResponse(
  response: any,
  questionType: string
): string | React.ReactElement {
  if (response === null || response === undefined) return "Sin respuesta";

  switch (questionType) {
    case "text":
    case "string":
      return response;

    case "boolean":
      // For true boolean questions, convert to Sí/No
      if (response === true || response === "true") return "Sí";
      if (response === false || response === "false") return "No";
      // If it's a string that's not "true"/"false", it might be a radio option
      return typeof response === "string" ? response : "Sin respuesta";

    case "radio":
      // For radio questions, return the selected option text directly
      return typeof response === "string" ? response : "Sin respuesta";

    case "checkbox":
      // Try to parse as JSON if it's a string
      let checkboxData = response;
      if (typeof response === "string") {
        checkboxData = parseJsonSafely(response);
      }

      if (Array.isArray(checkboxData)) {
        return checkboxData.length > 0
          ? checkboxData.join(", ")
          : "Sin Respuesta";
      }
      return "Sin Respuesta";

    case "number":
    case "counter":
      if (typeof response === "number") {
        return response.toString();
      }
      // Handle string numbers
      if (typeof response === "string" && !isNaN(Number(response))) {
        return response;
      }
      return "Sin valor";

    case "timer":
      // Try to parse as JSON if it's a string
      let timerData = response;
      if (typeof response === "string") {
        timerData = parseJsonSafely(response);
      }

      if (Array.isArray(timerData)) {
        return timerData.map((cycle: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {cycle.alias || `Ciclo ${index + 1}`}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {cycle.seconds ? formatTime(cycle.seconds) : "Sin duración"}
            </span>
          </div>
        ));
      }
      return "Sin ciclos";

    case "voice":
      // Handle voice responses with audio URL
      if (typeof response === "string" && response.includes("[Audio:")) {
        const audioUrlMatch = response.match(/\[Audio: (.*?)\]/);
        if (audioUrlMatch) {
          const audioUrl = audioUrlMatch[1];
          return (
            <div className="flex items-center gap-2">
              <audio controls className="max-w-xs">
                <source src={audioUrl} type="audio/webm" />
                <source src={audioUrl} type="audio/wav" />
                Tu navegador no soporta el elemento de audio.
              </audio>
              <span className="text-xs text-muted-foreground">
                Audio grabado
              </span>
            </div>
          );
        }
      }
      return "Sin audio grabado";

    default:
      return typeof response === "string"
        ? response
        : JSON.stringify(response);
  }
}

/**
 * Re-export formatResponseForCSV from csv-export-utils for backward compatibility
 * All CSV formatting is now centralized in csv-export-utils.ts
 */
export { formatResponseForCSV } from "@/lib/csv-export-utils";

/**
 * Calculate and format session duration
 */
export function getSessionDuration(session: {
  start_time: string;
  end_time: string | null;
}): string {
  if (!session.end_time) return "Sesión activa";

  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

  return formatTime(duration);
}

