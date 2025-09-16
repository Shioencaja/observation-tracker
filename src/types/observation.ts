export interface Observation {
  id: string;
  session_id: string;
  user_id: string;
  option_ids: string | null; // Comma-separated list of option IDs
  created_at: string;
  updated_at: string;
}

export interface ObservationOption {
  id: string;
  name: string;
  description: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionWithObservations extends Session {
  observations: Observation[];
}
