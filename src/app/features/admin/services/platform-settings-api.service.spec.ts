import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PlatformSettingsApiService } from './platform-settings-api.service';

describe('PlatformSettingsApiService', () => {
  let service: PlatformSettingsApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PlatformSettingsApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads settings from the platform settings API', () => {
    let displayName = '';

    service.getSettings().subscribe((settings) => {
      displayName = settings.platformDisplayName ?? '';
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/settings');
    expect(request.request.method).toBe('GET');

    request.flush({
      success: true,
      message: 'ok',
      data: {
        platformDisplayName: 'OneVerz',
        supportEmail: 'support@example.com',
        defaultCountryCode: 'LK',
        defaultCurrencyCode: 'LKR',
        defaultTimezone: 'Asia/Colombo',
        defaultLocale: 'en-LK',
        updatedAt: '2026-07-03T12:00:00Z',
        updatedByPlatformUserId: 'user-1'
      }
    });

    expect(displayName).toBe('OneVerz');
  });

  it('updates settings through the platform settings API', () => {
    let savedDisplayName = '';

    service
      .updateSettings({
        platformDisplayName: 'TM-EPOS',
        supportEmail: null,
        defaultCountryCode: 'LK',
        defaultCurrencyCode: 'LKR',
        defaultTimezone: 'Asia/Colombo',
        defaultLocale: 'en-LK'
      })
      .subscribe((settings) => {
        savedDisplayName = settings.platformDisplayName ?? '';
      });

    const request = httpTesting.expectOne('/api/v1/platform-admin/settings');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.platformDisplayName).toBe('TM-EPOS');
    expect(request.request.body.defaultCountryCode).toBe('LK');

    request.flush({
      success: true,
      message: 'ok',
      data: {
        platformDisplayName: 'TM-EPOS',
        defaultCountryCode: 'LK',
        defaultCurrencyCode: 'LKR',
        defaultTimezone: 'Asia/Colombo',
        defaultLocale: 'en-LK'
      }
    });

    expect(savedDisplayName).toBe('TM-EPOS');
  });
});
