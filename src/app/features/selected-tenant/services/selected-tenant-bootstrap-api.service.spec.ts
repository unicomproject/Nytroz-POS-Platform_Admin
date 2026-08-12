import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SelectedTenantBootstrapApiService } from './selected-tenant-bootstrap-api.service';

describe('SelectedTenantBootstrapApiService', () => {
  let service: SelectedTenantBootstrapApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SelectedTenantBootstrapApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads bootstrap summary and maps tenant identity fields', () => {
    let tenantName = '';

    service.getSummary('tenant-1').subscribe((summary) => {
      tenantName = summary.tenant.tenantName;
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/tenant-1/bootstrap/summary');
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      message: 'ok',
      data: {
        tenant: {
          id: 'tenant-1',
          name: 'ABC Retail',
          code: 'TEN-ABC',
          lifecycleStatus: 'ACTIVE',
          planName: 'Pro'
        },
        modules: [
          {
            moduleKey: 'outlets',
            status: 'NOT_STARTED',
            count: 0,
            entitled: true,
            canConfigure: true,
            dependencyNotice: null
          }
        ]
      }
    });

    expect(tenantName).toBe('ABC Retail');
  });

  it('posts outlet create with Idempotency-Key', () => {
    let outletCode = '';

    service
      .createOutlet(
        'tenant-1',
        {
          outletName: 'Main',
          outletType: 'STORE',
          timezone: 'UTC',
          status: 'ACTIVE',
          address: { addressLine1: '1 St', city: 'Colombo', countryCode: 'LK' }
        },
        'idem-1'
      )
      .subscribe((outlet) => {
        outletCode = outlet.outletCode;
      });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/tenant-1/bootstrap/outlets');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('idem-1');
    request.flush({
      success: true,
      message: 'ok',
      data: {
        outletId: 'out-1',
        outletName: 'Main',
        outletCode: 'OUT-1',
        outletType: 'STORE',
        status: 'ACTIVE',
        timezone: 'UTC'
      }
    });

    expect(outletCode).toBe('OUT-1');
  });

  it('puts online store with Idempotency-Key', () => {
    let status = '';

    service
      .upsertOnlineStore('tenant-1', { storeStatus: 'ACTIVE', taxDisplayMode: 'MATCH_TENANT' }, 'idem-os')
      .subscribe((response) => {
        status = response.storeStatus;
      });

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/tenant-1/bootstrap/online-store');
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Idempotency-Key')).toBe('idem-os');
    request.flush({
      success: true,
      message: 'ok',
      data: {
        entitled: true,
        storeStatus: 'ACTIVE',
        taxDisplayMode: 'MATCH_TENANT',
        clickCollectEntitled: false,
        clickCollectConfigured: false,
        dependencyNotice: null
      }
    });

    expect(status).toBe('ACTIVE');
  });
});
