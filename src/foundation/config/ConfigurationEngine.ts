import { 
  GlobalConfiguration, 
  AppConfiguration, 
  EnvironmentConfiguration, 
  AIConfiguration, 
  FirebaseConfiguration, 
  AuthConfiguration, 
  FeatureFlags 
} from './types';

/**
 * Configuration Engine (Foundation Layer)
 * 
 * Provides a centralized, strongly-typed, and predictable way to manage 
 * application configurations, feature flags, and environment variables.
 * Designed to act as a singleton service independent of any specific framework UI component.
 */
class ConfigurationEngine {
  private static instance: ConfigurationEngine;
  private state: GlobalConfiguration;

  private constructor() {
    this.state = this.initializeConfiguration();
  }

  public static getInstance(): ConfigurationEngine {
    if (!ConfigurationEngine.instance) {
      ConfigurationEngine.instance = new ConfigurationEngine();
    }
    return ConfigurationEngine.instance;
  }

  private initializeConfiguration(): GlobalConfiguration {
    return {
      app: this.loadAppConfig(),
      environment: this.loadEnvironmentConfig(),
      ai: this.loadAIConfig(),
      firebase: this.loadFirebaseConfig(),
      auth: this.loadAuthConfig(),
      features: this.loadFeatureFlags(),
    };
  }

  // Modules Loaders
  private loadAppConfig(): AppConfiguration {
    return {
      appName: 'SMAS ISLAM DIPONEGORO',
      version: '1.0.0',
      theme: 'light',
      language: 'id',
    };
  }

  private loadEnvironmentConfig(): EnvironmentConfiguration {
    return {
      mode: (import.meta.env.MODE as any) || 'development',
      apiUrl: import.meta.env.VITE_API_URL || '/api',
      debugLevel: import.meta.env.DEV ? 'info' : 'error',
    };
  }

  private loadAIConfig(): AIConfiguration {
    return {
      defaultModel: 'gemini-3.1-pro-preview',
      temperature: 0.7,
      maxTokens: 2048,
      provider: 'gemini',
    };
  }

  private loadFirebaseConfig(): FirebaseConfiguration {
    return {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
    };
  }

  private loadAuthConfig(): AuthConfiguration {
    return {
      sessionTimeoutMinutes: 120,
      allowedDomains: ['*'],
      mfaEnabled: false,
    };
  }

  private loadFeatureFlags(): FeatureFlags {
    return {
      enableSmartCalendar: true,
      enableVirtualMode: true,
      enableAdvancedAnalytics: false,
      enableNewScheduleEngine: false,
    };
  }

  // Public Getters
  public getConfig(): GlobalConfiguration {
    return this.state;
  }

  public getAppConfig(): AppConfiguration {
    return this.state.app;
  }

  public getFeatureFlag(flag: keyof FeatureFlags): boolean {
    return this.state.features[flag];
  }

  public isDevelopment(): boolean {
    return this.state.environment.mode === 'development';
  }

  public isProduction(): boolean {
    return this.state.environment.mode === 'production';
  }
}

export const configEngine = ConfigurationEngine.getInstance();
