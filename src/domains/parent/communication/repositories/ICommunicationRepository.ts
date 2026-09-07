import { Thread, Message } from '../types';

export interface ICommunicationRepository {
  createThread(thread: Thread): Promise<Thread>;
  updateThread(threadId: string, data: Partial<Thread>): Promise<void>;
  getThreadById(threadId: string): Promise<Thread | null>;
  getThreadsByParentId(parentId: string): Promise<Thread[]>;
  getThreadsByTargetId(targetUserId: string): Promise<Thread[]>;
  
  createMessage(message: Message): Promise<Message>;
  getMessagesByThreadId(threadId: string): Promise<Message[]>;
  markMessagesAsRead(threadId: string, userId: string): Promise<void>;
}
