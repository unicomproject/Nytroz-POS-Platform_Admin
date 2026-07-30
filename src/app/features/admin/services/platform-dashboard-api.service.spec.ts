import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AccessControlService } from '../../../core/services/access-control.service';
import { createDashboardApiDto } from '../../../testing/test-fixtures';
import { PlatformDashboardApiService } from './platform-dashboard-api.service';

describe('PlatformDashboardApiService', () => {
  let service: PlatformDashboardApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AccessControlService,
          useValue: { hasPermission: () => true }
        }
      ]
    });
    service = TestBed.inject(PlatformDashboardApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('calls the platform dashboard endpoint and maps response data', () => {
    let totalTenants = 0;

    service.getDashboard().subscribe((dashboard) => {
      totalTenants = dashboard.kpis.totalTenants ?? 0;
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/dashboard');
    expect(request.request.method).toBe('GET');

    request.flush({ success: true, message: 'ok', data: createDashboardApiDto() });
    expect(totalTenants).toBe(3);
  });
});
