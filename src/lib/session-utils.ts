export interface Session {
  id: string;
  user_id: string;
  project_id: string;
  agency: string | null;
  alias: string | null;
  start_time: string;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatTime = (timeString: string): string => {
  return new Date(timeString).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTimeFromSeconds = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

export const getSessionStatus = (session: Session) => {
  if (session.end_time) {
    return { label: "Completada", variant: "secondary" as const };
  }
  return { label: "En Progreso", variant: "outline" as const };
};

