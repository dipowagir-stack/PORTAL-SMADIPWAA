import { notificationJobsService, notificationPrefsService, enqueueNotification } from '../../../notification/services';
import { NotificationJob, NotificationPreference } from '../../../notification/types';
import { ParentNotification, ParentNotificationCategory, ParentNotificationStatus } from '../types';
import { SendParentNotificationDTO, UpdateParentPreferenceDTO } from '../dtos';
import { Result, ok, fail } from '../../../../foundation/core/Result';
import { ErrorCodes } from '../../../../foundation/shared/ErrorCatalog';
import { where, orderBy, limit } from 'firebase/firestore';

export class ParentNotificationService {
  
  /**
   * Helper to map NotificationJob to ParentNotification
   */
  private static mapToParentNotification(job: NotificationJob): ParentNotification {
    const parentStatus = (job.payload.data?.parentStatus as ParentNotificationStatus) || 
      (job.status === 'read' ? 'read' : 'unread');

    return {
      ...job,
      category: job.category as ParentNotificationCategory,
      parentStatus
    };
  }

  /**
   * Send a new notification to a parent
   */
  static async sendNotification(dto: SendParentNotificationDTO): Promise<Result<string>> {
    try {
      // Respect user preferences before sending
      const prefsRes = await this.getPreferences(dto.userId);
      if (prefsRes.isSuccess) {
        const prefs = prefsRes.getValue();
        if (prefs.optOutCategories && prefs.optOutCategories.includes(dto.category as any)) {
          // User opted out, skip sending but return ok
          return ok('SKIPPED_BY_PREFERENCE');
        }
      }

      const res = await enqueueNotification({
        userId: dto.userId,
        category: dto.category as any, // Cast to any to bypass strict type check for new categories
        priority: dto.priority || 'normal',
        channels: ['in_app'], // Default to in_app, can be extended based on preferences
        payload: {
          title: dto.title,
          body: dto.body,
          data: {
            ...dto.data,
            parentStatus: 'unread'
          }
        }
      });

      return res;
    } catch (error) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  /**
   * Get all active notifications for a parent (excludes deleted and archived)
   */
  static async getActiveNotifications(userId: string, limitCount = 50): Promise<Result<ParentNotification[]>> {
    try {
      const constraints = [
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      ];
      
      const res = await notificationJobsService.findWithConstraintsResult(constraints);
      if (res.isFailure) return fail(res.getError());
      
      const jobs = res.getValue();
      
      // Filter out deleted and archived in memory since we store them in payload.data (not indexable directly without complex composite indexes)
      const activeNotifications = jobs
        .map(this.mapToParentNotification)
        .filter(n => n.parentStatus !== 'deleted' && n.parentStatus !== 'archived');
        
      return ok(activeNotifications);
    } catch (error) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string): Promise<Result<ParentNotification>> {
    try {
      const jobRes = await notificationJobsService.getById(notificationId);
      if (!jobRes) return fail(ErrorCodes.NOT_FOUND);

      const updatedPayload = {
        ...jobRes.payload,
        data: {
          ...(jobRes.payload.data || {}),
          parentStatus: 'read'
        }
      };

      const res = await notificationJobsService.updateResult(notificationId, {
        status: 'read',
        readAt: Date.now(),
        updatedAt: Date.now(),
        payload: updatedPayload
      });

      if (res.isFailure) return fail(res.getError());
      return ok(this.mapToParentNotification(res.getValue()));
    } catch (error) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  /**
   * Archive a notification
   */
  static async archiveNotification(notificationId: string): Promise<Result<ParentNotification>> {
    try {
      const jobRes = await notificationJobsService.getById(notificationId);
      if (!jobRes) return fail(ErrorCodes.NOT_FOUND);

      const updatedPayload = {
        ...jobRes.payload,
        data: {
          ...(jobRes.payload.data || {}),
          parentStatus: 'archived'
        }
      };

      const res = await notificationJobsService.updateResult(notificationId, {
        updatedAt: Date.now(),
        payload: updatedPayload
      });

      if (res.isFailure) return fail(res.getError());
      return ok(this.mapToParentNotification(res.getValue()));
    } catch (error) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  /**
   * Soft delete a notification
   */
  static async softDeleteNotification(notificationId: string): Promise<Result<void>> {
    try {
      const jobRes = await notificationJobsService.getById(notificationId);
      if (!jobRes) return fail(ErrorCodes.NOT_FOUND);

      const updatedPayload = {
        ...jobRes.payload,
        data: {
          ...(jobRes.payload.data || {}),
          parentStatus: 'deleted'
        }
      };

      const res = await notificationJobsService.updateResult(notificationId, {
        updatedAt: Date.now(),
        payload: updatedPayload
      });

      if (res.isFailure) return fail(res.getError());
      return ok(undefined);
    } catch (error) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  /**
   * Get Parent Preferences
   */
  static async getPreferences(userId: string): Promise<Result<NotificationPreference>> {
    try {
      const res = await notificationPrefsService.getByFieldResult('userId', userId);
      if (res.isFailure) return fail(res.getError());
      const data = res.getValue();
      
      if (data.length > 0) {
        return ok(data[0]);
      } else {
        // Return default preference
        return ok({
          userId,
          optOutCategories: [],
          preferredChannels: ['in_app', 'push'],
          updatedAt: Date.now()
        } as NotificationPreference);
      }
    } catch (error) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  /**
   * Update Parent Preferences
   */
  static async updatePreferences(dto: UpdateParentPreferenceDTO): Promise<Result<NotificationPreference>> {
    try {
      const existingRes = await this.getPreferences(dto.userId);
      let existingId: string | undefined = undefined;
      let existingData: Partial<NotificationPreference> = {};
      
      if (existingRes.isSuccess && existingRes.getValue().id) {
        existingId = existingRes.getValue().id;
        existingData = existingRes.getValue();
      }

      const updatedData: Partial<NotificationPreference> = {
        ...existingData,
        userId: dto.userId,
        updatedAt: Date.now()
      };

      if (dto.optOutCategories) {
        updatedData.optOutCategories = dto.optOutCategories as any[];
      }
      
      if (dto.emailNotification !== undefined || dto.pushNotification !== undefined) {
        const channels = new Set(updatedData.preferredChannels || ['in_app']);
        if (dto.emailNotification) channels.add('email');
        else if (dto.emailNotification === false) channels.delete('email');
        
        if (dto.pushNotification) channels.add('push');
        else if (dto.pushNotification === false) channels.delete('push');
        
        updatedData.preferredChannels = Array.from(channels) as any[];
      }

      if (existingId) {
        const res = await notificationPrefsService.updateResult(existingId, updatedData);
        if (res.isFailure) return fail(res.getError());
        return ok(res.getValue());
      } else {
        const res = await notificationPrefsService.createResult(updatedData);
        if (res.isFailure) return fail(res.getError());
        return ok(res.getValue());
      }
    } catch (error) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }
}
