import { TimelineEventCategory, TimelineFilterPeriod } from '../types';

export interface GetTimelineDTO {
  parentId: string;
  studentId?: string; // Optional: to filter by specific student
  period?: TimelineFilterPeriod;
  categories?: TimelineEventCategory[];
  keyword?: string;
  limit?: number;
  offset?: number;
}
