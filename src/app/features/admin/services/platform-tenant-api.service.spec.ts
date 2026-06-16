import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  createTenantFilterOptions,
  createTenantListResponse,
  createTenantSummary
} from '../../../testing/test-fixtures';
import { PlatformTenantApiService } from './platform-tenant-api.service';

describe('PlatformTenantApiService', () => {
  let service: PlatformTenantApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PlatformTenantApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('calls GET /api/v1/platform-admin/tenants with query params and maps response data', () => {
    let tenantName = '';

    service.getTenants({
      pageNumber: 2,
      pageSize: 6,
      search: 'demo',
      status: 'Active',
      plan: 'Professional',
      region: 'Sri Lanka / Western',
      createdFrom: '2026-06-01T00:00:00Z',
      sortBy: 'createdOn',
      sortDirection: 'desc'
    }).subscribe((response) => {
      tenantName = response.items[0]?.name ?? '';
    });

    const request = httpTesting.expectOne((req) => req.url === '/api/v1/platform-admin/tenants');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('pageNumber')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('6');
    expect(request.request.params.get('search')).toBe('demo');
    expect(request.request.params.get('status')).toBe('Active');
    expect(request.request.params.get('plan')).toBe('Professional');
    expect(request.request.params.get('region')).toBe('Sri Lanka / Western');
    expect(request.request.params.get('createdFrom')).toBe('2026-06-01T00:00:00Z');
    expect(request.request.params.get('sortBy')).toBe('createdOn');
    expect(request.request.params.get('sortDirection')).toBe('desc');

    request.flush({ success: true, message: 'ok', data: createTenantListResponse() });
    expect(tenantName).toBe('Demo Tenant Alpha');
  });

  it('calls GET /api/v1/platform-admin/tenants/summary and maps response data', () => {
    let totalTenants = 0;

    service.getSummary().subscribe((summary) => {
      totalTenants = summary.totalTenants;
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/summary');
    expect(request.request.method).toBe('GET');

    request.flush({ success: true, message: 'ok', data: createTenantSummary() });
    expect(totalTenants).toBe(3);
  });

  it('calls GET /api/v1/platform-admin/tenants/filter-options and maps response data', () => {
    let planCount = 0;

    service.getFilterOptions().subscribe((options) => {
      planCount = options.plans.length;
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/filter-options');
    expect(request.request.method).toBe('GET');

    request.flush({ success: true, message: 'ok', data: createTenantFilterOptions() });
    expect(planCount).toBe(3);
  });
});
