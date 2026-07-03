import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  createTenantFilterOptionsApiDto,
  createTenantListResponseApiDto,
  createTenantSummaryApiDto,
  createTenantCreateOptionsApiDto,
  createTenantDetailApiDto,
  createTenantEntitlementOptionsApiDto
} from '../../../testing/test-fixtures';
import { CreatePlatformTenantRequest } from '../models/platform-tenant-create.model';
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
      status: 'active',
      planId: 'plan-2',
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
    expect(request.request.params.get('status')).toBe('active');
    expect(request.request.params.get('planId')).toBe('plan-2');
    expect(request.request.params.get('sortBy')).toBe('createdAt');
    expect(request.request.params.get('sortDirection')).toBe('desc');

    request.flush({ success: true, message: 'ok', data: createTenantListResponseApiDto() });
    expect(tenantName).toBe('Demo Tenant Alpha');
  });

  it('calls GET /api/v1/platform-admin/tenants/summary and maps response data', () => {
    let totalTenants = 0;

    service.getSummary().subscribe((summary) => {
      totalTenants = summary.totalTenants;
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/summary');
    expect(request.request.method).toBe('GET');

    request.flush({ success: true, message: 'ok', data: createTenantSummaryApiDto() });
    expect(totalTenants).toBe(3);
  });

  it('calls GET /api/v1/platform-admin/tenants/filter-options and maps response data', () => {
    let planCount = 0;

    service.getFilterOptions().subscribe((options) => {
      planCount = options.plans.length;
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/filter-options');
    expect(request.request.method).toBe('GET');

    request.flush({ success: true, message: 'ok', data: createTenantFilterOptionsApiDto() });
    expect(planCount).toBe(3);
  });

  it('calls GET /api/v1/platform-admin/tenants/{tenantId} and maps response data', () => {
    let tenantCode = '';

    service.getTenantById('tenant-1').subscribe((tenant) => {
      tenantCode = tenant.code;
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/tenant-1');
    expect(request.request.method).toBe('GET');

    request.flush({ success: true, message: 'ok', data: createTenantDetailApiDto() });
    expect(tenantCode).toBe('demo-alpha');
  });

  it('calls GET /api/v1/platform-admin/tenants/create-options and maps response data', () => {
    let planCode = '';

    service.getCreateOptions().subscribe((options) => {
      planCode = options.plans[0]?.planCode ?? '';
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/create-options');
    expect(request.request.method).toBe('GET');

    request.flush({ success: true, message: 'ok', data: createTenantCreateOptionsApiDto() });
    expect(planCode).toBe('STARTER');
  });

  it('calls POST /api/v1/platform-admin/tenants and maps tenant detail response', () => {
    let createdTenantId = '';
    const payload: CreatePlatformTenantRequest = {
      code: 'TEN-NEW',
      name: 'New Tenant',
      subscriptionPlanId: 'plan-1',
      tenantAdmin: {
        firstName: 'Ada',
        email: 'ada@tenant.com',
        sendInvite: true
      }
    };

    service.createTenant(payload).subscribe((tenant) => {
      createdTenantId = tenant.id;
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.code).toBe('TEN-NEW');
    expect(request.request.body.tenantAdmin.sendInvite).toBe(true);

    request.flush({ success: true, message: 'ok', data: createTenantDetailApiDto({ id: 'tenant-new' }) });
    expect(createdTenantId).toBe('tenant-new');
  });

  it('calls POST /api/v1/platform-admin/tenants/{tenantId}/activate and maps response data', () => {
    let status = '';

    service.activateTenant('tenant-1').subscribe((tenant) => {
      status = tenant.status;
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/tenant-1/activate');
    expect(request.request.method).toBe('POST');

    request.flush({
      success: true,
      message: 'ok',
      data: createTenantDetailApiDto({ status: 'active', canActivate: false, canSuspend: true })
    });
    expect(status).toBe('active');
  });

  it('calls POST /api/v1/platform-admin/tenants/{tenantId}/suspend and maps response data', () => {
    let status = '';

    service.suspendTenant('tenant-1').subscribe((tenant) => {
      status = tenant.status;
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/tenant-1/suspend');
    expect(request.request.method).toBe('POST');

    request.flush({
      success: true,
      message: 'ok',
      data: createTenantDetailApiDto({ status: 'suspended', canActivate: true, canSuspend: false })
    });
    expect(status).toBe('suspended');
  });

  it('calls GET /api/v1/platform-admin/tenants/{tenantId}/entitlement-options and maps response data', () => {
    let planCode = '';

    service.getEntitlementOptions('tenant-1').subscribe((options) => {
      planCode = options.currentSubscriptionPlanCode ?? '';
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/tenant-1/entitlement-options');
    expect(request.request.method).toBe('GET');

    request.flush({ success: true, message: 'ok', data: createTenantEntitlementOptionsApiDto() });
    expect(planCode).toBe('PRO');
  });

  it('calls PUT /api/v1/platform-admin/tenants/{tenantId}/entitlements and maps response data', () => {
    let enabledFeatureCount = 0;

    service
      .updateEntitlements('tenant-1', {
        subscriptionPlanId: 'plan-1',
        enabledFeatureIds: ['feature-offline'],
        enabledFeatureCodes: ['offline_operation_sync']
      })
      .subscribe((tenant) => {
        enabledFeatureCount = tenant.enabledFeatureIds.length;
      });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/tenant-1/entitlements');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.subscriptionPlanId).toBe('plan-1');
    expect(request.request.body.enabledFeatureIds).toEqual(['feature-offline']);
    expect(request.request.body.enabledFeatureCodes).toEqual(['offline_operation_sync']);

    request.flush({
      success: true,
      message: 'ok',
      data: createTenantDetailApiDto({ enabledFeatureIds: ['feature-offline'], enabledFeatureCodes: ['offline_operation_sync'] })
    });
    expect(enabledFeatureCount).toBe(1);
  });
});
