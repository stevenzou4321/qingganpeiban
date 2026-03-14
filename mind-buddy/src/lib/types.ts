export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  emotion?: string;
}

export interface Memory {
  id: string;
  type: "event" | "emotion" | "personal";
  content: string;
  created_at: number;
  conversation_id?: string;
}

export interface EmotionEntry {
  date: string;
  emotion: string;
  score: number; // 1-5, 1=very low, 5=very good
  event?: string;
}
