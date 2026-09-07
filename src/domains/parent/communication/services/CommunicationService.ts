import { ICommunicationRepository } from '../repositories/ICommunicationRepository';
import { CommunicationRepositoryImpl } from '../repositories/CommunicationRepositoryImpl';
import { Thread, Message } from '../types';
import { CreateThreadDTO, SendMessageDTO } from '../dtos';
import { CommunicationValidators } from '../validators';
import { Result, ok, fail } from '../../../../foundation/core/Result';
import { ErrorCodes } from '../../../../foundation/shared/ErrorCatalog';

// Integrate Notification Existing
import { enqueueNotification } from '../../../notification/services';

const repo: ICommunicationRepository = new CommunicationRepositoryImpl();

export class ParentCommunicationService {
  static async createThread(dto: CreateThreadDTO): Promise<Result<Thread>> {
    try {
      const validation = CommunicationValidators.validateCreateThread(dto);
      if (validation.isFailure) return fail(validation.getError());

      const now = Date.now();
      const thread: Thread = {
        studentId: dto.studentId,
        parentId: dto.parentId,
        targetUserId: dto.targetUserId,
        targetRole: dto.targetRole,
        subject: dto.subject,
        category: dto.category,
        priority: dto.priority,
        status: 'Waiting',
        participants: [
          { userId: dto.parentId, role: 'parent' },
          { userId: dto.targetUserId, role: dto.targetRole as any }
        ],
        createdAt: now,
        updatedAt: now
      };

      const createdThread = await repo.createThread(thread);

      // Create initial message
      const initialMessage: Message = {
        threadId: createdThread.id!,
        senderId: dto.parentId,
        senderRole: 'parent',
        body: dto.initialMessage,
        attachments: dto.attachments || [],
        readBy: [dto.parentId],
        createdAt: now
      };
      await repo.createMessage(initialMessage);

      // Trigger Notification to target
      await enqueueNotification({
        userId: dto.targetUserId,
        category: 'communication' as any,
        channels: ['in_app'],
        priority: dto.priority === 'Urgent' ? 'urgent' : 'normal',
        payload: {
          title: `Pesan Baru: ${dto.subject}`,
          body: `Anda mendapatkan pesan baru dari Orang Tua siswa.`,
          data: { threadId: createdThread.id }
        }
      });

      return ok(createdThread);
    } catch (error: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  static async sendMessage(dto: SendMessageDTO): Promise<Result<Message>> {
    try {
      const validation = CommunicationValidators.validateSendMessage(dto);
      if (validation.isFailure) return fail(validation.getError());

      const thread = await repo.getThreadById(dto.threadId);
      if (!thread) return fail(ErrorCodes.NOT_FOUND);

      const now = Date.now();
      const message: Message = {
        threadId: dto.threadId,
        senderId: dto.senderId,
        senderRole: dto.senderRole,
        body: dto.body,
        attachments: dto.attachments || [],
        readBy: [dto.senderId],
        createdAt: now
      };

      const createdMessage = await repo.createMessage(message);

      // Update thread status and timestamp
      const newStatus = dto.senderRole === 'parent' ? 'Waiting' : 'Answered';
      await repo.updateThread(dto.threadId, { status: newStatus, updatedAt: now });

      // Trigger notification to the other participant
      const targetParticipant = thread.participants.find(p => p.userId !== dto.senderId);
      if (targetParticipant) {
        await enqueueNotification({
          userId: targetParticipant.userId,
          category: 'communication' as any,
          channels: ['in_app'],
          priority: 'normal',
          payload: {
            title: `Balasan Baru: ${thread.subject}`,
            body: `Ada balasan baru pada percakapan Anda.`,
            data: { threadId: thread.id }
          }
        });
      }

      return ok(createdMessage);
    } catch (error: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  static async getThreadDetails(threadId: string, userId: string): Promise<Result<{ thread: Thread; messages: Message[] }>> {
    try {
      const thread = await repo.getThreadById(threadId);
      if (!thread) return fail(ErrorCodes.NOT_FOUND);

      const messages = await repo.getMessagesByThreadId(threadId);

      // Mark messages as read for this user
      await repo.markMessagesAsRead(threadId, userId);

      return ok({ thread, messages });
    } catch (error: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  static async getParentThreads(parentId: string): Promise<Result<Thread[]>> {
    try {
      const threads = await repo.getThreadsByParentId(parentId);
      return ok(threads);
    } catch (error: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  static async getTeacherThreads(targetUserId: string): Promise<Result<Thread[]>> {
    try {
      const threads = await repo.getThreadsByTargetId(targetUserId);
      return ok(threads);
    } catch (error: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  static async closeThread(threadId: string): Promise<Result<void>> {
    try {
      await repo.updateThread(threadId, { status: 'Closed', updatedAt: Date.now() });
      return ok(undefined);
    } catch (error: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }
}
