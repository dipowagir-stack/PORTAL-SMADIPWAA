export type ThreadCategory = 'Academic' | 'Attendance' | 'Finance' | 'Administration' | 'Behavior' | 'General';
export type ThreadStatus = 'Open' | 'Waiting' | 'Answered' | 'Closed';
export type ThreadPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface Participant {
  userId: string;
  role: 'parent' | 'teacher' | 'tu' | 'admin' | 'principal' | 'super_admin';
}

export interface Thread {
  id?: string;
  studentId: string;
  parentId: string;
  targetUserId: string;
  targetRole: string;
  subject: string;
  category: ThreadCategory;
  priority: ThreadPriority;
  status: ThreadStatus;
  participants: Participant[];
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id?: string;
  threadId: string;
  senderId: string;
  senderRole: string;
  body: string;
  attachments?: string[];
  readBy: string[];
  createdAt: number;
}
