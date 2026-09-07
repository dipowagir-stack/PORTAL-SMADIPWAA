import { ThreadCategory, ThreadPriority } from '../types';

export interface CreateThreadDTO {
  studentId: string;
  parentId: string;
  targetUserId: string;
  targetRole: string;
  subject: string;
  category: ThreadCategory;
  priority: ThreadPriority;
  initialMessage: string;
  attachments?: string[];
}

export interface SendMessageDTO {
  threadId: string;
  senderId: string;
  senderRole: string;
  body: string;
  attachments?: string[];
}
