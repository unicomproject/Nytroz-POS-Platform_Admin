export interface PlatformSettings {
  platformDisplayName: string | null;
  supportEmail: string | null;
  defaultCountryCode: string | null;
  defaultCurrencyCode: string | null;
  defaultTimezone: string | null;
  defaultLocale: string | null;
  updatedAt: string | null;
  updatedByPlatformUserId: string | null;
}

export interface UpdatePlatformSettingsRequest {
  platformDisplayName: string;
  supportEmail: string | null;
  defaultCountryCode: string;
  defaultCurrencyCode: string;
  defaultTimezone: string;
  defaultLocale: string;
}
