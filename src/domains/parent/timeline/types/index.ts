export type TimelineEventCategory = 
  | 'Academic' 
  | 'Attendance' 
  | 'Finance' 
  | 'Communication' 
  | 'Approval' 
  | 'Notification' 
  | 'Document' 
  | 'Announcement' 
  | 'Meeting' 
  | 'System';

export interface TimelineEvent {
  id: string;
  category: TimelineEventCategory;
  title: string;
  description: string;
  timestamp: number;
  metadata?: any;
  studentId?: string;
  link?: string;
}

export type TimelineFilterPeriod = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all';
