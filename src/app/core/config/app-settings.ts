export interface AppSettings {
  production: boolean;
  apiBaseUrl: string;
  appName: string;
  appVersion: string;
  defaultLocale: string;
  requestTimeoutMs: number;
  enableDebugLogging: boolean;
}

export const appSettings: AppSettings = {
  production: false,
  apiBaseUrl: '/api/v1',
  appName: 'SCS-TIX Platform Admin',
  appVersion: '0.0.0',
  defaultLocale: 'en',
  requestTimeoutMs: 30000,
  enableDebugLogging: true
};
