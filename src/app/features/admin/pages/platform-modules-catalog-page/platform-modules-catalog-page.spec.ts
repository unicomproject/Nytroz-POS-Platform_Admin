import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformModulesCatalogModule } from '../../models/platform-modules-catalog.model';
import { PlatformModulesCatalogApiService } from '../../services/platform-modules-catalog-api.service';
import { PlatformModulesCatalogPage } from './platform-modules-catalog-page';

describe('PlatformModulesCatalogPage', () => {
  let api: { getCatalog: ReturnType<typeof vi.fn> };
  let accessControl: { hasPermission: ReturnType<typeof vi.fn> };

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
          permissions: []
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
          permissions: []
        }
      ]
    }
  ];


  async function createComponent(): Promise<ComponentFixture<PlatformModulesCatalogPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformModulesCatalogPage],
      providers: [
        { provide: PlatformModulesCatalogApiService, useValue: api },
        { provide: AccessControlService, useValue: accessControl },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Catalog failed safely' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformModulesCatalogPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    api = { getCatalog: vi.fn() };
    accessControl = {
      hasPermission: vi.fn((permission: string) =>
        [platformPermissions.modulesView, platformPermissions.featuresView].includes(
          permission as typeof platformPermissions.modulesView
        )
      )
    };
  });

  it('shows a loading state while the catalog request is pending', async () => {
    api.getCatalog.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading modules and features');
  });

  it('loads modules and features from the API and renders grouped display', async () => {
    api.getCatalog.mockReturnValue(of({ modules: catalogModules }));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(api.getCatalog).toHaveBeenCalled();
    expect(text).toContain('Core POS');
    expect(text).toContain('POS Checkout');
    expect(text).toContain('pos_checkout');
    expect(text).toContain('Inventory Tracking');
  });

  it('filters modules and features by search term', async () => {
    api.getCatalog.mockReturnValue(of({ modules: catalogModules }));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.searchTerm.set('inventory_tracking');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Inventory Tracking');
    expect(text).not.toContain('POS Checkout');
  });

  it('shows an empty state when the backend returns no modules', async () => {
    api.getCatalog.mockReturnValue(of({ modules: [] }));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No modules found');
  });

  it('shows an error state when the API request fails', async () => {
    api.getCatalog.mockReturnValue(throwError(() => new Error('network failed')));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Modules and features could not be loaded');
    expect(text).toContain('Catalog failed safely');
  });

  it('hides feature details without platform.features.view permission', async () => {
    accessControl.hasPermission.mockImplementation(
      (permission: string) => permission === platformPermissions.modulesView
    );
    api.getCatalog.mockReturnValue(of({ modules: catalogModules }));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Core POS');
    expect(text).toContain('platform.features.view');
    expect(text).not.toContain('pos_checkout');
  });
});
