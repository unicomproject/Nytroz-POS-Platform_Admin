import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { PlatformBusinessCapabilityApiService } from './platform-business-capability-api.service';
import { BusinessCapabilityMapResponse } from '../models/business-capability-map.model';

describe('PlatformBusinessCapabilityApiService', () => {
  let service: PlatformBusinessCapabilityApiService;
  let httpTesting: HttpTestingController;

  const mockResponse: BusinessCapabilityMapResponse = {
    release: 'R1',
    catalogVersion: '1.0.0',
    summary: {
      businessModuleCount: 19,
      businessCapabilityCount: 39,
      technicalModuleCount: 23,
      technicalFeatureCount: 16,
      tenantPermissionCount: 118
    },
    businessModules: [
      {
        code: 'BM-01',
        name: 'Authentication & Workspace',
        description: 'Staff/Admin login, OTP, JWT',
        displayOrder: 1,
        releaseCode: 'R1',
        currentR1Status: 'PRODUCTION READY / CLOSED',
        commercialState: 'CORE',
        capabilities: [
          {
            code: 'BM01.STAFF_AUTHENTICATION',
            name: 'Staff Authentication',
            description: 'User login',
            commercialClassification: 'CORE_ENTITLEMENT_INDEPENDENT',
            mappedTechnicalFeatureCodes: ['tenant_profile']
          }
        ],
        technicalModules: [
          {
            code: 'TenantAuth',
            name: 'Tenant Auth',
            scope: 'TENANT',
            features: [
              {
                id: '72000000-0000-0000-0000-000000000001',
                code: 'tenant_profile',
                name: 'Tenant Profile',
                scope: 'TENANT',
                isActive: true,
                commercialClassification: 'CORE_ALWAYS_INCLUDED',
                isPlanEligible: true,
                permissions: [
                  {
                    code: 'tenant.dashboard.view',
                    name: 'View Dashboard',
                    actionType: 'READ',
                    scope: 'TENANT',
                    isActive: true
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlatformBusinessCapabilityApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PlatformBusinessCapabilityApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('fetches business capability map from backend API', () => {
    let result: BusinessCapabilityMapResponse | undefined;

    service.getBusinessCapabilityMap().subscribe((response) => {
      result = response;
    });

    const req = httpTesting.expectOne('/api/v1/platform-admin/business-capability-map');
    expect(req.request.method).toBe('GET');

    req.flush({ success: true, message: 'Loaded', data: mockResponse });

    expect(result).toEqual(mockResponse);
    expect(result?.summary.businessModuleCount).toBe(19);
  });
});
