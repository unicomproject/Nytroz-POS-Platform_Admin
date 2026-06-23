import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformPermissionCatalogApiService } from '../../services/platform-permission-catalog-api.service';
import { PlatformPermissionCatalogPage } from './platform-permission-catalog-page';

describe('PlatformPermissionCatalogPage', () => {
  let api: { getPermissionCatalog: ReturnType<typeof vi.fn> };

  const catalogResponse = {
    modules: [
      {
        id: 'mod-1',
        code: 'tenant_admin',
        name: 'Tenant Admin',
        scope: 'tenant',
        sortOrder: 1,
        isActive: true,
        features: [
          {
            id: 'feat-1',
            code: 'roles',
            name: 'Roles',
            sortOrder: 1,
            isActive: true,
            permissions: [
              {
                id: 'perm-1',
                code: 'roles.permissions.view',
                name: 'View Role Permissions',
                scope: 'tenant',
                sortOrder: 1,
                isActive: true,
                source: 'tenant'
              },
              {
                id: 'perm-2',
                code: 'platform.permissions.view',
                name: 'View Platform Permissions',
                scope: 'platform',
                sortOrder: 2,
                isActive: true,
                source: 'platform'
              }
            ]
          }
        ]
      }
    ]
  };

  async function createComponent(): Promise<ComponentFixture<PlatformPermissionCatalogPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformPermissionCatalogPage],
      providers: [
        { provide: PlatformPermissionCatalogApiService, useValue: api },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Catalog failed safely' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformPermissionCatalogPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    api = { getPermissionCatalog: vi.fn() };
  });

  it('shows loading state while catalog request is pending', async () => {
    api.getPermissionCatalog.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();
    expect(fixture.nativeElement.querySelector('.state-card.loading')).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading permission catalog');
  });

  it('renders permission tree returned by the backend', async () => {
    api.getPermissionCatalog.mockReturnValue(of(catalogResponse));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Roles and Permissions');
    expect(text).toContain('Tenant Admin');
    expect(text).toContain('roles.permissions.view');
  });

  it('shows empty state when filters hide all permissions', async () => {
    api.getPermissionCatalog.mockReturnValue(of(catalogResponse));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.onScopeChange('pos');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No permissions match the current filters');
  });

  it('shows error state when catalog request fails', async () => {
    api.getPermissionCatalog.mockReturnValue(throwError(() => new Error('network')));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Catalog failed safely');
  });
});
