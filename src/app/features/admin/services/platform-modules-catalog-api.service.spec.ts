import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PlatformModulesCatalogApiService } from './platform-modules-catalog-api.service';

describe('PlatformModulesCatalogApiService', () => {
  let service: PlatformModulesCatalogApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PlatformModulesCatalogApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads modules and features from the platform catalog API', () => {
    let moduleCode = '';
    let featureCode = '';

    service.getCatalog().subscribe((catalog) => {
      moduleCode = catalog.modules[0]?.moduleCode ?? '';
      featureCode = catalog.modules[0]?.features[0]?.featureCode ?? '';
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/catalog/modules');
    expect(request.request.method).toBe('GET');

    request.flush({
      success: true,
      message: 'ok',
      data: {
        modules: [
          {
            id: 'module-1',
            moduleCode: 'core_pos',
            name: 'Core POS',
            description: 'Core module',
            sortOrder: 1,
            status: 'ACTIVE',
            features: [
              {
                id: 'feature-1',
                featureCode: 'pos_checkout',
                name: 'POS Checkout',
                description: 'Canonical POS checkout entitlement',
                sortOrder: 1,
                status: 'ACTIVE'
              }
            ]
          }
        ]
      }
    });

    expect(moduleCode).toBe('core_pos');
    expect(featureCode).toBe('pos_checkout');
  });
});
