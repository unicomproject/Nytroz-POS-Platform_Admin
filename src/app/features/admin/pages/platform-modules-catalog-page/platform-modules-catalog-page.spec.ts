import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { SubscriptionPlanCatalogModule } from '../../models/platform-subscription-plan.model';
import { PlatformModulesCatalogApiService } from '../../services/platform-modules-catalog-api.service';
import { PlatformModulesCatalogPage } from './platform-modules-catalog-page';

describe('PlatformModulesCatalogPage', () => {
  let api: { getCatalog: ReturnType<typeof vi.fn> };
  let accessControl: { hasPermission: ReturnType<typeof vi.fn> };

  const catalogModules: SubscriptionPlanCatalogModule[] = [
    {
      id: 'module-1',
      code: 'core_pos',
      name: 'Core POS',
      description: 'Core point of sale module',
      sortOrder: 1,
      isCore: false,
      isLocked: false,
      defaultAvailability: 'not_available',
      features: [
        {
          id: 'feature-1',
          code: 'pos.sales',
          name: 'POS Sales',
          description: 'Start sale',
          entitlementKey: 'pos.sales',
          sortOrder: 1,
          isCore: false,
          isLocked: false,
          defaultAvailability: 'not_available'
        }
      ]
    },
    {
      id: 'module-2',
      code: 'inventory',
      name: 'Inventory',
      description: null,
      sortOrder: 2,
      isCore: false,
      isLocked: false,
      defaultAvailability: 'not_available',
      features: [
        {
          id: 'feature-2',
          code: 'inventory_management',
          name: 'Inventory Management',
          description: 'Manage stock',
          entitlementKey: 'inventory_management',
          sortOrder: 1,
          isCore: false,
          isLocked: false,
          defaultAvailability: 'not_available'
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
    expect(text).toContain('POS Sales');
    expect(text).toContain('pos.sales');
    expect(text).toContain('Inventory Management');
  });

  it('filters modules and features by search term', async () => {
    api.getCatalog.mockReturnValue(of({ modules: catalogModules }));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.searchTerm.set('inventory_management');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Inventory Management');
    expect(text).not.toContain('POS Sales');
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
    expect(text).not.toContain('pos.sales');
  });
});
