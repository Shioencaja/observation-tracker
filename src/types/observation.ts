export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  agencies: string[];
  created_at: string;
  updated_at: string;
  session_count?: number;
}

export interface ProjectUser {
  id: string;
  project_id: string;
  user_id: string;
  added_by: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export interface ProjectObservationOption {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  question_type:
    | "string"
    | "boolean"
    | "radio"
    | "checkbox"
    | "counter"
    | "timer"
    | "voice";
  options: string[];
  is_visible: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Observation {
  id: string;
  session_id: string;
  user_id: string;
  project_observation_option_id: string | null;
  response: string | null;
  alias: string | null;
  created_at: string;
  updated_at: string;
}

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

export interface SessionWithObservations extends Session {
  observations: Observation[];
}

// Legacy types for backward compatibility during migration
export interface ObservationOption {
  id: string;
  name: string;
  description: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}
