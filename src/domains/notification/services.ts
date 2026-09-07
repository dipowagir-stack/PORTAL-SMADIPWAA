import { ok, fail, Result } from '../../foundation/core/Result';
import { where, orderBy, limit } from 'firebase/firestore';
import {
  NotificationJob, NotificationPreference, NotificationTemplate, NotificationCategory
} from './types';
import { FirestoreRepository } from './repositories';
import { GenericNotificationService } from './coreServices';
import { ErrorCodes, AppError } from '../../foundation/shared/ErrorCatalog';

// Repositories
const jobsRepo = new FirestoreRepository<NotificationJob>('notification_jobs');
const prefsRepo = new FirestoreRepository<NotificationPreference>('notification_preferences');
export const notificationJobsService = new GenericNotificationService<NotificationJob>(jobsRepo);
export const notificationPrefsService = new GenericNotificationService<NotificationPreference>(prefsRepo);

// Helper to unwrap Result<T> to keep backward compatibility

// Enqueue a new notification
export async function enqueueNotification(job: Partial<NotificationJob>): Promise<Result<string>> {
  const data = {
    ...job,
    status: job.status || 'pending',
    priority: job.priority || 'normal',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  const resultRes = await notificationJobsService.createResult(data);
  if (resultRes.isFailure) return fail(resultRes.getError());
  const result = resultRes.getValue();
  return ok(result.id!);
}

// Get user's notifications (inbox view)
export async function getUserNotifications(userId: string, limitCount = 50): Promise<Result<NotificationJob[]>> {
  const constraints = [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  ];
  return await notificationJobsService.findWithConstraintsResult(constraints);
}

// Mark notification as read
export async function markAsRead(notificationId: string): Promise<Result<NotificationJob>> {
  return await notificationJobsService.updateResult(notificationId, {
    status: 'read',
    readAt: Date.now(),
    updatedAt: Date.now()
  });
}

// Fetch user preferences
export async function getUserPreference(userId: string): Promise<Result<NotificationPreference>> {
  const res = await notificationPrefsService.getByFieldResult('userId', userId);
  if (res.isFailure) return fail(res.getError());
  const data = res.getValue();
  return data.length > 0 ? ok(data[0]) : fail(ErrorCodes.NOT_FOUND);
}

// Update user preferences
export async function updateUserPreference(userId: string, prefs: Partial<NotificationPreference>): Promise<Result<NotificationPreference>> {
  const existingRes = await getUserPreference(userId);
  if (existingRes.isSuccess) {
    const existing = existingRes.getValue();
    return await notificationPrefsService.updateResult(existing.id!, { ...prefs, updatedAt: Date.now() });
  } else {
    return await notificationPrefsService.createResult({
      ...prefs,
      userId,
      updatedAt: Date.now()
    });
  }
}
