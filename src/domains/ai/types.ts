export type AIRole = 
  | 'teacher' 
  | 'student' 
  | 'administration' 
  | 'curriculum' 
  | 'finance' 
  | 'analytics';

export interface AIRequest {
  role: AIRole;
  query: string;
  context?: any;
}

export interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
}
