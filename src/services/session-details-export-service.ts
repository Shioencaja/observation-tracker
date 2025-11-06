import { Session, Observation } from "@/types/observation";
import { SessionCreator } from "./session-details-service";
import { formatResponseForCSV, getSessionDuration } from "@/lib/session-details-utils";

export interface ObservationWithDetails extends Observation {
  question_name?: string;
  question_type?: string;
}

/**
 * Export session details to CSV
 */
export async function exportSessionDetails(
  session: Session,
  observations: ObservationWithDetails[],
  sessionCreator: SessionCreator
): Promise<void> {
  if (!session || !observations.length) {
    throw new Error(
      "No hay datos de sesión o respuestas disponibles para exportar"
    );
  }

  // Use the session creator's email (username only)
  const userEmail = sessionCreator.email
    ? sessionCreator.email.split("@")[0]
    : `Usuario ${session.user_id.substring(0, 8)}`;

  // Create headers with each question as a column
  const headers = [
    "ID de Sesión",
    "Alias de Sesión",
    "Usuario",
    "Fecha de Inicio",
    "Fecha de Fin",
    "Duración",
    ...observations.map((obs) => obs.question_name || "Unknown"),
  ];

  // Create data row
  const dataRow = [
    session.id,
    session.alias || "Sin alias",
    userEmail,
    new Date(session.start_time).toLocaleString(),
    session.end_time
      ? new Date(session.end_time).toLocaleString()
      : "Sesión activa",
    getSessionDuration(session),
    ...observations.map((obs) =>
      formatResponseForCSV(
        obs.response,
        obs.question_type || "unknown"
      )
    ),
  ];

  // Create CSV content
  const csvContent = [
    headers.join(","),
    dataRow
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(","),
  ].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `sesion-${session.alias || session.id}-${
      new Date().toISOString().split("T")[0]
    }.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

