import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PlatformPermissionCatalogApiService } from './platform-permission-catalog-api.service';

describe('PlatformPermissionCatalogApiService', () => {
  let service: PlatformPermissionCatalogApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PlatformPermissionCatalogApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('calls GET /api/v1/platform-admin/permission-catalog and maps response data', () => {
    let moduleCode = '';

    service.getPermissionCatalog().subscribe((response) => {
      moduleCode = response.modules[0]?.code ?? '';
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/permission-catalog');
    expect(request.request.method).toBe('GET');

    request.flush({
      success: true,
      message: 'ok',
      data: {
        modules: [
          {
            id: 'mod-1',
            code: 'tenant_admin',
            name: 'Tenant Admin',
            scope: 'tenant',
            sortOrder: 1,
            isActive: true,
            features: []
          }
        ]
      }
    });

    expect(moduleCode).toBe('tenant_admin');
  });
});
