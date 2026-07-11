// Tipos globales del proyecto PsySim

export interface User {
  id: string;
  email: string;
  role: 'teacher' | 'admin';
  created_at: string;
}

export interface SimulationSession {
  id: string;
  user_id: string;
  scenario_id: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed' | 'abandoned';
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  environment_model: string;
  npc_model: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface NPCMessage {
  id: string;
  session_id: string;
  content: string;
  sender: 'npc' | 'user';
  timestamp: string;
  emotion?: string;
}

export interface Metrics {
  id: string;
  session_id: string;
  empathy_score?: number;
  communication_score?: number;
  problem_solving_score?: number;
  duration_seconds?: number;
  created_at: string;
}
