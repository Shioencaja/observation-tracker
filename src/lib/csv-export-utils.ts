import { supabase } from "@/lib/supabase";
import { formatTimeFromSeconds } from "./session-utils";
import type { Session } from "./session-utils";

interface ProjectOption {
  id: string;
  name: string | null;
  question_type: string | null;
}

interface Observation {
  id: string;
  session_id: string;
  response: unknown;
  created_at: string;
  project_observation_options: {
    id: string;
    name: string;
    question_type: string;
  } | null;
}

// Format response for CSV export (show actual values, empty if no response)
export const formatResponseForCSV = (
  response: unknown,
  questionType: string
): string => {
  if (response === null || response === undefined) return "";

  // Helper function to safely parse JSON
  const parseJsonSafely = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  switch (questionType) {
    case "text":
    case "string":
      return String(response);

    case "boolean":
      // For true boolean questions, convert to Sí/No
      if (response === true || response === "true") return "Sí";
      if (response === false || response === "false") return "No";
      // If it's a string that's not "true"/"false", return as is
      return typeof response === "string" ? response : "";

    case "radio":
      // For radio questions, return the selected option text directly
      return typeof response === "string" ? response : "";

    case "checkbox":
      // Try to parse as JSON if it's a string
      let checkboxData = response;
      if (typeof response === "string") {
        checkboxData = parseJsonSafely(response);
      }

      if (Array.isArray(checkboxData)) {
        return checkboxData.length > 0 ? checkboxData.join(", ") : "";
      }
      return "";

    case "number":
    case "counter":
      if (typeof response === "number") {
        return response.toString();
      }
      // Handle string numbers
      if (typeof response === "string" && !isNaN(Number(response))) {
        return response;
      }
      return "";

    case "timer":
      // Try to parse as JSON if it's a string
      let timerData = response;
      if (typeof response === "string") {
        timerData = parseJsonSafely(response);
      }

      if (Array.isArray(timerData)) {
        return timerData
          .map(
            (cycle: { alias?: string; seconds?: number }, index: number) =>
              `${cycle.alias || `Ciclo ${index + 1}`}: ${
                cycle.seconds
                  ? formatTimeFromSeconds(cycle.seconds)
                  : "Sin duración"
              }`
          )
          .join(" | ");
      }
      return "";

    case "voice":
      // Handle voice responses with audio URL
      if (typeof response === "string" && response.includes("[Audio:")) {
        const audioUrlMatch = response.match(/\[Audio: (.*?)\]/);
        if (audioUrlMatch) {
          return "Audio grabado";
        }
      }
      return "";

    default:
      return typeof response === "string"
        ? response
        : JSON.stringify(response);
  }
};

export interface ExportSessionOptions {
  session: Session;
  observations: Observation[];
  projectOptions: ProjectOption[];
}

export const exportSessionToCSV = async ({
  session,
  observations,
  projectOptions,
}: ExportSessionOptions): Promise<void> => {
  // Create a map of question_id to question info from project options
  const questionMap = new Map<string, { name: string; question_type: string }>();
  projectOptions.forEach((opt) => {
    questionMap.set(opt.id, {
      name: opt.name || "Unknown Question",
      question_type: opt.question_type || "unknown",
    });
  });

  // Use ordered questions from project options
  const orderedQuestions = projectOptions.map((opt) => [
    opt.id,
    questionMap.get(opt.id)!,
  ]);

  // Prepare CSV headers: basic session info + question columns
  const csvHeaders = [
    "ID de Sesión",
    "Fecha",
    "Agencia",
    ...orderedQuestions.map(([_, q]) => q.name),
  ];

  // Create a map of question_id to response
  const sessionResponses = new Map<string, string>();
  observations.forEach((obs) => {
    const questionId = obs.project_observation_options?.id;
    const questionType = obs.project_observation_options?.question_type || "unknown";
    if (questionId) {
      sessionResponses.set(
        questionId,
        String(formatResponseForCSV(obs.response, questionType))
      );
    }
  });

  // Create CSV data with questions as columns
  const row: string[] = [];

  // Format date in Peru timezone (UTC-5)
  const sessionDate = new Date(session.start_time);
  const peruDate = new Date(sessionDate.getTime() - 5 * 60 * 60 * 1000);
  const formattedDate = peruDate.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Lima",
  });

  // Start with session info
  row.push(session.id, formattedDate, session.agency || "");

  // Add answers for each question in order
  orderedQuestions.forEach(([questionId, _]) => {
    row.push(sessionResponses.get(questionId) || "");
  });

  // Create CSV content
  const csvContent = [
    csvHeaders.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","),
    row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","),
  ].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `sesion-${session.id.substring(0, 8)}-${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface ExportAllSessionsOptions {
  sessions: Session[];
  projectId: string;
  projectName: string;
}

export const exportAllSessionsToCSV = async ({
  sessions,
  projectId,
  projectName,
}: ExportAllSessionsOptions): Promise<void> => {
  if (sessions.length === 0) {
    throw new Error("No hay sesiones para exportar");
  }

  // Get all project observation options with their order
  const { data: projectOptions, error: projectOptionsError } = await supabase
    .from("project_observation_options")
    .select("*")
    .eq("project_id", projectId)
    .order("order", { ascending: true })
    .order("created_at", { ascending: true });

  if (projectOptionsError) {
    throw new Error(`Error al cargar las opciones del proyecto: ${projectOptionsError.message}`);
  }

  // Get all observations for all sessions
  const sessionIds = sessions.map((session) => session.id);
  const { data: allObservations, error: obsError } = await supabase
    .from("observations")
    .select(
      `
      id,
      session_id,
      response,
      created_at,
      project_observation_options (
        id,
        name,
        question_type
      )
    `
    )
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });

  if (obsError) {
    throw new Error(`Error al cargar las observaciones: ${obsError.message}`);
  }

  // Create a map of question_id to question info from project options
  const questionMap = new Map<string, { name: string; question_type: string }>();
  (projectOptions || []).forEach((opt) => {
    questionMap.set(opt.id, {
      name: opt.name || "Unknown Question",
      question_type: opt.question_type || "unknown",
    });
  });

  // Use ordered questions from project options
  const orderedQuestions = (projectOptions || []).map((opt) => [
    opt.id,
    questionMap.get(opt.id)!,
  ]);

  // Prepare CSV headers: basic session info + question columns
  const csvHeaders = [
    "ID de Sesión",
    "Fecha",
    "Agencia",
    ...orderedQuestions.map(([_, q]) => q.name),
  ];

  // Create a map of session_id to question_id to response
  const sessionResponses = new Map<string, Map<string, string>>();

  sessions.forEach((session) => {
    sessionResponses.set(session.id, new Map());
  });

  // Populate the response map
  (allObservations || []).forEach((obs) => {
    const sessionId = obs.session_id;
    const questionId = obs.project_observation_options?.id;
    const questionType = obs.project_observation_options?.question_type || "unknown";

    if (sessionId && questionId) {
      const sessionMap = sessionResponses.get(sessionId);
      if (sessionMap) {
        sessionMap.set(
          questionId,
          String(formatResponseForCSV(obs.response, questionType))
        );
      }
    }
  });

  // Create CSV data with questions as columns
  const csvData: Array<string[]> = [];

  sessions.forEach((session) => {
    // Format date in Peru timezone (UTC-5)
    const sessionDate = new Date(session.start_time);
    const peruDate = new Date(sessionDate.getTime() - 5 * 60 * 60 * 1000);
    const formattedDate = peruDate.toLocaleDateString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Lima",
    });

    // Start with session info
    const row: string[] = [session.id, formattedDate, session.agency || ""];

    // Add answers for each question in order
    const sessionMap = sessionResponses.get(session.id) || new Map();
    orderedQuestions.forEach(([questionId, _]) => {
      row.push(sessionMap.get(questionId) || "");
    });

    csvData.push(row);
  });

  // Create CSV content
  const csvContent = [
    csvHeaders.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","),
    ...csvData.map((row) =>
      row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `sesiones-${projectName}-${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

