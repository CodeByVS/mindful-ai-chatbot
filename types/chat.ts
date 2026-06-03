export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  messages: Message[];
}

export interface ChatErrorResponse {
  error: string;
  code: string;
}
