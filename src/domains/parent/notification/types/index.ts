import { NotificationJob, NotificationPreference } from '../../../notification/types';

export type ParentNotificationCategory = 
  | 'academic' 
  | 'attendance' 
  | 'finance' 
  | 'communication' 
  | 'approval' 
  | 'document' 
  | 'announcement' 
  | 'meeting' 
  | 'system';

export type ParentNotificationStatus = 'unread' | 'read' | 'archived' | 'deleted';

// Wrapper for NotificationJob to include our custom state in payload.data
export interface ParentNotification extends Omit<NotificationJob, 'category'> {
  category: ParentNotificationCategory;
  parentStatus: ParentNotificationStatus;
}

export interface ParentNotificationPreference extends NotificationPreference {
  // Extending the base preference if needed
}
