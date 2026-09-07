import { AIRequest, AIResponse, AIRole } from './types';

export class AIService {
  /**
   * Universal method to ask the AI engine with a specific role.
   */
  static async ask(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      return await response.json();
    } catch (error) {
      console.error('AI Service Error:', error);
      return { success: false, error: 'Network error or server unavailable' };
    }
  }

  // --- Domain-Specific Helper Methods ---

  static async askTeacher(query: string, context?: any): Promise<AIResponse> {
    return this.ask({ role: 'teacher', query, context });
  }

  static async askStudent(query: string, context?: any): Promise<AIResponse> {
    return this.ask({ role: 'student', query, context });
  }

  static async askAdministration(query: string, context?: any): Promise<AIResponse> {
    return this.ask({ role: 'administration', query, context });
  }

  static async askCurriculum(query: string, context?: any): Promise<AIResponse> {
    return this.ask({ role: 'curriculum', query, context });
  }

  static async askFinance(query: string, context?: any): Promise<AIResponse> {
    return this.ask({ role: 'finance', query, context });
  }

  static async askAnalytics(query: string, context?: any): Promise<AIResponse> {
    return this.ask({ role: 'analytics', query, context });
  }
}
