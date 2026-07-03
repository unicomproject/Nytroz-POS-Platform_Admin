import { PlatformSettings, UpdatePlatformSettingsRequest } from '../models/platform-settings.model';

export interface PlatformSettingsApiDto {
  platformDisplayName?: string | null;
  supportEmail?: string | null;
  defaultCountryCode?: string | null;
  defaultCurrencyCode?: string | null;
  defaultTimezone?: string | null;
  defaultLocale?: string | null;
  updatedAt?: string | null;
  updatedByPlatformUserId?: string | null;
}

export function mapPlatformSettings(data: PlatformSettingsApiDto | null | undefined): PlatformSettings {
  return {
    platformDisplayName: normalizeNullableText(data?.platformDisplayName),
    supportEmail: normalizeNullableText(data?.supportEmail),
    defaultCountryCode: normalizeNullableText(data?.defaultCountryCode),
    defaultCurrencyCode: normalizeNullableText(data?.defaultCurrencyCode),
    defaultTimezone: normalizeNullableText(data?.defaultTimezone),
    defaultLocale: normalizeNullableText(data?.defaultLocale),
    updatedAt: data?.updatedAt ?? null,
    updatedByPlatformUserId: data?.updatedByPlatformUserId ?? null
  };
}

export function mapUpdatePlatformSettingsRequest(
  request: UpdatePlatformSettingsRequest
): PlatformSettingsApiDto {
  return {
    platformDisplayName: request.platformDisplayName.trim(),
    supportEmail: normalizeNullableText(request.supportEmail),
    defaultCountryCode: request.defaultCountryCode.trim().toUpperCase(),
    defaultCurrencyCode: request.defaultCurrencyCode.trim().toUpperCase(),
    defaultTimezone: request.defaultTimezone.trim(),
    defaultLocale: request.defaultLocale.trim()
  };
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
