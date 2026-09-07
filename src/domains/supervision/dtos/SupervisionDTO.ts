export interface CreateSupervisionDTO {
  principalId: string;
  teacherId: string;
  scheduledDate: number;
  type: 'Akademik' | 'Klinis' | 'Manajerial';
}

export interface UpdateSupervisionDTO {
  scheduledDate?: number;
  status?: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
}

export interface SubmitObservationDTO {
  rubricId: string;
  scores: Record<string, number>;
  notes: string;
}

export interface SubmitFeedbackDTO {
  strengths: string[];
  areasForImprovement: string[];
  actionPlan: string;
}
