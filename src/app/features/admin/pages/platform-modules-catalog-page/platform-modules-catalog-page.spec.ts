import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformModulesCatalogModule } from '../../models/platform-modules-catalog.model';
import { PlatformModulesCatalogApiService } from '../../services/platform-modules-catalog-api.service';
import { PlatformModulesCatalogPage } from './platform-modules-catalog-page';

describe('PlatformModulesCatalogPage', () => {
  let component: PlatformModulesCatalogPage;
  let fixture: ComponentFixture<PlatformModulesCatalogPage>;
  let api: { getCatalog: ReturnType<typeof vi.fn> };
  let accessControl: { hasPermission: ReturnType<typeof vi.fn> };
  let apiError: { toSafeMessage: ReturnType<typeof vi.fn> };

  const catalogModules: PlatformModulesCatalogModule[] = [
    {
      id: 'module-1',
      moduleCode: 'core_pos',
      name: 'Core POS',
      description: 'Core point of sale module',
      sortOrder: 1,
      status: 'ACTIVE',
      scope: 'TENANT',
      features: [
        {
          id: 'feature-1',
          featureCode: 'pos_checkout',
          name: 'POS Checkout',
          description: 'Canonical POS checkout entitlement',
          sortOrder: 1,
          status: 'ACTIVE',
          scope: 'TENANT',
          permissions: [
            {
              id: 'perm-1',
              permissionCode: 'pos.sales.checkout',
              name: 'Checkout',
              description: 'Process checkout',
              actionType: 'create',
              scope: 'TENANT',
              isActive: true
            }
          ]
        }
      ]
    },
    {
      id: 'module-2',
      moduleCode: 'inventory',
      name: 'Inventory',
      description: null,
      sortOrder: 2,
      status: 'ACTIVE',
      scope: 'TENANT',
      features: [
        {
          id: 'feature-2',
          featureCode: 'inventory_tracking',
          name: 'Inventory Tracking',
          description: 'Manage stock',
          sortOrder: 1,
          status: 'ACTIVE',
          scope: 'TENANT',
          permissions: [
            {
              id: 'perm-2',
              permissionCode: 'inventory.stock.view',
              name: 'View Stock',
              description: 'View current inventory',
              actionType: 'view',
              scope: 'TENANT',
              isActive: true
            }
          ]
        }
      ]
    }
  ];

  beforeEach(() => {
    api = { getCatalog: vi.fn().mockReturnValue(of({ modules: catalogModules })) };
    accessControl = {
      hasPermission: vi.fn((permission: string) =>
        [platformPermissions.modulesView, platformPermissions.featuresView].includes(
          permission as typeof platformPermissions.modulesView
        )
      )
    };
    apiError = { toSafeMessage: vi.fn(() => 'Catalog failed safely') };

    TestBed.configureTestingModule({
      imports: [PlatformModulesCatalogPage],
      providers: [
        { provide: PlatformModulesCatalogApiService, useValue: api },
        { provide: AccessControlService, useValue: accessControl },
        { provide: ApiErrorService, useValue: apiError }
      ]
    });

    fixture = TestBed.createComponent(PlatformModulesCatalogPage);
    component = fixture.componentInstance;
  });

  it('shows loading state while the catalog request is pending', () => {
    api.getCatalog.mockReturnValue(new Subject().asObservable());

    component.loadCatalog();

    expect(component.isLoading()).toBe(true);
    expect(component.errorMessage()).toBeNull();
  });

  it('loads modules and features from API and computes feature/permission counts', () => {
    api.getCatalog.mockReturnValue(of({ modules: catalogModules }));

    component.loadCatalog();

    expect(component.isLoading()).toBe(false);
    expect(component.filteredModules().length).toBe(2);
    expect(component.filteredFeatureCount()).toBe(2);
    expect(component.filteredPermissionCount()).toBe(2);
  });

  it('supports progressive disclosure module accordion toggles', () => {
    api.getCatalog.mockReturnValue(of({ modules: catalogModules }));
    component.loadCatalog();

    // Default: first module expanded
    expect(component.isModuleExpanded('module-1', 0)).toBe(true);
    expect(component.isModuleExpanded('module-2', 1)).toBe(false);

    // Expand All
    component.expandAll();
    expect(component.isModuleExpanded('module-1', 0)).toBe(true);
    expect(component.isModuleExpanded('module-2', 1)).toBe(true);

    // Collapse All
    component.collapseAll();
    expect(component.isModuleExpanded('module-1', 0)).toBe(false);
    expect(component.isModuleExpanded('module-2', 1)).toBe(false);

    // Toggle single module
    component.toggleModule('module-2');
    expect(component.isModuleExpanded('module-2', 1)).toBe(true);
  });

  it('filters modules and features by search term and auto-expands matching modules', () => {
    api.getCatalog.mockReturnValue(of({ modules: catalogModules }));
    component.loadCatalog();

    component.searchTerm.set('inventory_tracking');

    expect(component.searchActive()).toBe(true);
    expect(component.filteredModules().length).toBe(1);
    expect(component.filteredModules()[0].name).toBe('Inventory');

    // Auto-expands matching modules during search
    expect(component.isModuleExpanded('module-2', 0)).toBe(true);

    // Clear search
    component.clearSearch();
    expect(component.searchTerm()).toBe('');
    expect(component.searchActive()).toBe(false);
  });

  it('shows an empty state when backend returns no modules', () => {
    api.getCatalog.mockReturnValue(of({ modules: [] }));
    component.loadCatalog();

    expect(component.filteredModules().length).toBe(0);
    expect(component.filteredFeatureCount()).toBe(0);
  });

  it('shows an error state when API fails safely', () => {
    api.getCatalog.mockReturnValue(throwError(() => new Error('network failure')));

    component.loadCatalog();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('Catalog failed safely');
  });

  it('returns appropriate color micro-badge classes for permission action types', () => {
    expect(component.getActionClass('view')).toBe('action-view');
    expect(component.getActionClass('create')).toBe('action-create');
    expect(component.getActionClass('manage')).toBe('action-manage');
    expect(component.getActionClass('delete')).toBe('action-delete');
    expect(component.getActionClass('unknown')).toBe('action-default');
  });
});
