import { ParentNotificationCategory } from '../types';

export interface SendParentNotificationDTO {
  userId: string;
  category: ParentNotificationCategory;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface UpdateParentPreferenceDTO {
  userId: string;
  optOutCategories?: ParentNotificationCategory[];
  emailNotification?: boolean;
  pushNotification?: boolean;
}
