export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  conversation_id: string;
  role: Role;
  content: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  created_at: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  system_prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  tag: string;
  is_default: boolean;
}

export interface User {
  id: string;
  username: string;
  role: string;
}

export interface Persona {
  id: string;
  name: string;
  icon: string;
  description: string;
  systemPrompt: string;
}
