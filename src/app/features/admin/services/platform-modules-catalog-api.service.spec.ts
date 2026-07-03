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

  it('loads modules and features from the subscription catalog API', () => {
    let moduleName = '';

    service.getCatalog().subscribe((catalog) => {
      moduleName = catalog.modules[0]?.name ?? '';
    });

    const request = httpTesting.expectOne('/api/v1/platform/subscription-plans/catalog');
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
            features: [
              {
                id: 'feature-1',
                featureCode: 'pos.sales',
                name: 'POS Sales',
                description: 'Start sale',
                sortOrder: 1
              }
            ]
          }
        ]
      }
    });

    expect(moduleName).toBe('Core POS');
  });
});
