export interface AppConfiguration {
  appName: string;
  version: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export interface EnvironmentConfiguration {
  mode: 'development' | 'staging' | 'production';
  apiUrl: string;
  debugLevel: 'info' | 'warn' | 'error' | 'none';
}

export interface AIConfiguration {
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  provider: 'gemini' | 'openai' | 'custom';
}

export interface FirebaseConfiguration {
  projectId: string;
  authDomain: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface AuthConfiguration {
  sessionTimeoutMinutes: number;
  allowedDomains: string[];
  mfaEnabled: boolean;
}

export interface FeatureFlags {
  enableSmartCalendar: boolean;
  enableVirtualMode: boolean;
  enableAdvancedAnalytics: boolean;
  enableNewScheduleEngine: boolean;
}

export interface GlobalConfiguration {
  app: AppConfiguration;
  environment: EnvironmentConfiguration;
  ai: AIConfiguration;
  firebase: FirebaseConfiguration;
  auth: AuthConfiguration;
  features: FeatureFlags;
}
