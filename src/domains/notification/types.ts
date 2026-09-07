export type NotificationChannel = 'push' | 'email' | 'whatsapp' | 'in_app';
export type NotificationCategory = 'announcement' | 'reminder' | 'task' | 'academic' | 'finance' | 'system';
export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'delivered' | 'read' | 'failed';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  actionUrl?: string;
  imageUrl?: string;
}

export interface NotificationJob {
  id?: string;
  userId: string;
  category: NotificationCategory;
  channels: NotificationChannel[]; // Targeted channels
  priority: NotificationPriority;
  payload: NotificationPayload;
  status: NotificationStatus;
  scheduledAt?: number;
  sentAt?: number;
  readAt?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface NotificationPreference {
  id?: string;
  userId: string;
  optOutCategories: NotificationCategory[];
  preferredChannels: NotificationChannel[];
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "06:00"
  updatedAt: number;
}

export interface NotificationTemplate {
  id?: string;
  name: string;
  category: NotificationCategory;
  subjectTemplate: string;
  bodyTemplate: string;
  whatsappTemplateId?: string; // Pre-approved WA template ID
  isActive: boolean;
}
