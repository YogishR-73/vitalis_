export interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
}

export interface TriageResponse {
  session_id: string;
  ai_message: string;
  follow_up_question: string;
  timestamp: string;
}
