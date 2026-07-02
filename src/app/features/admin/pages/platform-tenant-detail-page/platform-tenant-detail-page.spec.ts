import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { createTenantDetail } from '../../../../testing/test-fixtures';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { PlatformTenantDetailPage } from './platform-tenant-detail-page';

describe('PlatformTenantDetailPage', () => {
  let api: {
    getTenantById: ReturnType<typeof vi.fn>;
    activateTenant: ReturnType<typeof vi.fn>;
    suspendTenant: ReturnType<typeof vi.fn>;
  };
  let accessControl: { hasPermission: ReturnType<typeof vi.fn> };

  async function createComponent(): Promise<ComponentFixture<PlatformTenantDetailPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformTenantDetailPage],
      providers: [
        provideRouter([]),
        { provide: PlatformTenantApiService, useValue: api },
        { provide: AccessControlService, useValue: accessControl },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Tenant detail failed safely' } },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ tenantId: 'tenant-1' })),
            snapshot: { paramMap: convertToParamMap({ tenantId: 'tenant-1' }) }
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformTenantDetailPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    api = {
      getTenantById: vi.fn(),
      activateTenant: vi.fn(),
      suspendTenant: vi.fn()
    };
    accessControl = {
      hasPermission: vi.fn((permission: string) =>
        [platformPermissions.tenantsActivate, platformPermissions.tenantsSuspend].includes(permission as typeof platformPermissions.tenantsActivate)
      )
    };
  });

  it('shows a loading state while the API request is pending', async () => {
    api.getTenantById.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading tenant detail');
  });

  it('renders tenant detail returned by the backend response', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Demo Tenant Alpha');
    expect(text).toContain('demo-alpha');
    expect(text).toContain('Professional');
    expect(text).toContain('Offline Mode');
    expect(text).toContain('Enabled');
  });

  it('shows lifecycle buttons based on backend flags and permissions', async () => {
    api.getTenantById.mockReturnValue(
      of(createTenantDetail({ canActivate: true, canSuspend: false, status: 'draft' }))
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Activate Tenant');
    expect(text).not.toContain('Suspend Tenant');
  });

  it('refreshes tenant detail after activate action', async () => {
    api.getTenantById.mockReturnValue(
      of(createTenantDetail({ canActivate: true, canSuspend: false, status: 'draft' }))
    );
    api.activateTenant.mockReturnValue(
      of(createTenantDetail({ canActivate: false, canSuspend: true, status: 'active' }))
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const activateButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Activate Tenant')
    );
    activateButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.activateTenant).toHaveBeenCalledWith('tenant-1');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Tenant activated successfully.');
  });

  it('shows a safe error state on API failure', async () => {
    api.getTenantById.mockReturnValue(throwError(() => new Error('network failed')));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tenant detail could not be loaded');
    expect(text).toContain('Tenant detail failed safely');
  });
});
