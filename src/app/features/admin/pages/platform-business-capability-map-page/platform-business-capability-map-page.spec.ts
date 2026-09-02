import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PlatformBusinessCapabilityMapPage } from './platform-business-capability-map-page';
import { PlatformBusinessCapabilityApiService } from '../../services/platform-business-capability-api.service';
import { BusinessCapabilityMapResponse } from '../../models/business-capability-map.model';

describe('PlatformBusinessCapabilityMapPage', () => {
  let apiService: {
    getBusinessCapabilityMap: ReturnType<typeof vi.fn>;
  };

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
      },
      {
        code: 'BM-08',
        name: 'Inventory & Stock Management',
        description: 'Stock view, receiving, adjustments',
        displayOrder: 8,
        releaseCode: 'R1',
        currentR1Status: 'PARTIAL',
        commercialState: 'SELECTABLE',
        capabilities: [
          {
            code: 'BM08.STOCK_VIEW',
            name: 'Stock View',
            description: 'Real-time stock level lookup',
            commercialClassification: 'PLAN_SELECTABLE',
            mappedTechnicalFeatureCodes: ['inventory_tracking']
          }
        ],
        technicalModules: [
          {
            code: 'Inventory',
            name: 'Inventory & Stock Control',
            scope: 'TENANT',
            features: [
              {
                id: '72000000-0000-0000-0000-000000000008',
                code: 'inventory_tracking',
                name: 'Inventory Tracking',
                scope: 'TENANT',
                isActive: true,
                commercialClassification: 'PLAN_SELECTABLE',
                isPlanEligible: true,
                permissions: [
                  {
                    code: 'inventory.stock.view',
                    name: 'View Stock',
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
    apiService = {
      getBusinessCapabilityMap: vi.fn().mockReturnValue(of(mockResponse))
    };
  });

  async function createComponent(): Promise<ComponentFixture<PlatformBusinessCapabilityMapPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformBusinessCapabilityMapPage],
      providers: [
        provideRouter([]),
        { provide: PlatformBusinessCapabilityApiService, useValue: apiService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformBusinessCapabilityMapPage);
    fixture.detectChanges();
    return fixture;
  }

  it('creates component and loads business capability map', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
    expect(apiService.getBusinessCapabilityMap).toHaveBeenCalled();
    expect(component.loading()).toBe(false);
    expect(component.filteredModules().length).toBe(2);
  });

  it('filters modules by search query', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance;

    component.searchQuery.set('Inventory');
    expect(component.filteredModules().length).toBe(1);
    expect(component.filteredModules()[0].code).toBe('BM-08');
  });

  it('filters modules by status', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance;

    component.statusFilter.set('PARTIAL');
    expect(component.filteredModules().length).toBe(1);
    expect(component.filteredModules()[0].code).toBe('BM-08');
  });

  it('filters modules by commercial state', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance;

    component.commercialFilter.set('CORE');
    expect(component.filteredModules().length).toBe(1);
    expect(component.filteredModules()[0].code).toBe('BM-01');
  });

  it('toggles module accordion expansion', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance;

    expect(component.isExpanded('BM-01')).toBe(false);
    component.toggleExpanded('BM-01');
    expect(component.isExpanded('BM-01')).toBe(true);
    component.toggleExpanded('BM-01');
    expect(component.isExpanded('BM-01')).toBe(false);
  });

  it('handles API error state safely', async () => {
    apiService.getBusinessCapabilityMap.mockReturnValue(throwError(() => new Error('API Failure')));
    const fixture = await createComponent();
    const component = fixture.componentInstance;

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('API Failure');
  });
});
