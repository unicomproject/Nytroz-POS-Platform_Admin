import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { createTenantDetail, createTenantEntitlementOptions } from '../../../../testing/test-fixtures';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { PlatformTenantDetailPage } from './platform-tenant-detail-page';

describe('PlatformTenantDetailPage', () => {
  let api: {
    getTenantById: ReturnType<typeof vi.fn>;
    activateTenant: ReturnType<typeof vi.fn>;
    reactivateTenant: ReturnType<typeof vi.fn>;
    suspendTenant: ReturnType<typeof vi.fn>;
    getEntitlementOptions: ReturnType<typeof vi.fn>;
    updateEntitlements: ReturnType<typeof vi.fn>;
    getTenantAuditLogs: ReturnType<typeof vi.fn>;
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
      reactivateTenant: vi.fn(),
      suspendTenant: vi.fn(),
      getEntitlementOptions: vi.fn(),
      updateEntitlements: vi.fn(),
      getTenantAuditLogs: vi.fn().mockReturnValue(of({ items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 0 }))
    };
    accessControl = {
      hasPermission: vi.fn((permission: string) =>
        [
          platformPermissions.tenantsActivate,
          platformPermissions.tenantsSuspend,
          platformPermissions.tenantsEntitlementsUpdate,
          platformPermissions.tenantSubscriptionsView,
          platformPermissions.billingView,
          platformPermissions.auditView
        ].includes(permission as any)
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
    expect(text).toContain('offline_operation_sync');
  });

  it('shows lifecycle buttons based on backend flags and permissions', async () => {
    api.getTenantById.mockReturnValue(
      of(createTenantDetail({
        canActivate: true,
        canSuspend: false,
        status: 'pending_activation',
        lifecycleStatus: 'pending_activation'
      }))
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Activate Tenant');
    expect(text).toContain('Pending Activation');
    expect(text).not.toContain('Suspend Tenant');
  });

  it('does not offer activation for pending_payment tenants', async () => {
    api.getTenantById.mockReturnValue(
      of(createTenantDetail({
        canActivate: true,
        canSuspend: false,
        status: 'pending_payment',
        lifecycleStatus: 'pending_payment'
      }))
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Activate Tenant');
    expect(text).toContain('Pending Payment');
  });

  it('does not offer activation for active or cancelled tenants', async () => {
    api.getTenantById.mockReturnValue(
      of(createTenantDetail({
        canActivate: true,
        canSuspend: false,
        status: 'active',
        lifecycleStatus: 'active'
      }))
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Activate Tenant');

    api.getTenantById.mockReturnValue(
      of(createTenantDetail({
        canActivate: true,
        canSuspend: false,
        status: 'cancelled',
        lifecycleStatus: 'cancelled'
      }))
    );
    fixture.componentInstance.reload();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Activate Tenant');
  });

  it('refreshes tenant detail after activate action', async () => {
    api.getTenantById.mockReturnValue(
      of(createTenantDetail({
        canActivate: true,
        canSuspend: false,
        status: 'pending_activation',
        lifecycleStatus: 'pending_activation'
      }))
    );
    api.activateTenant.mockReturnValue(
      of(createTenantDetail({
        canActivate: false,
        canSuspend: true,
        status: 'active',
        lifecycleStatus: 'active'
      }))
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
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Active');
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

  it('hides edit entitlements button without platform.tenants.entitlements.update permission', async () => {
    accessControl.hasPermission.mockImplementation((permission: string) =>
      permission !== platformPermissions.tenantsEntitlementsUpdate
    );
    api.getTenantById.mockReturnValue(of(createTenantDetail({ canManageEntitlements: true })));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Edit Entitlements');
  });

  it('loads entitlement options when the editor opens', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail()));
    api.getEntitlementOptions.mockReturnValue(of(createTenantEntitlementOptions()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const editButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Edit Entitlements')
    );
    editButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getEntitlementOptions).toHaveBeenCalledWith('tenant-1');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Offline Operation Sync');
  });

  it('preselects current enabled features in the editor', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail()));
    api.getEntitlementOptions.mockReturnValue(of(createTenantEntitlementOptions()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openEntitlementEditor();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedFeatureIds()).toEqual(['feature-offline']);
    expect(fixture.componentInstance.selectedPlanId()).toBe('plan-1');
  });

  it('constrains available features when the selected plan changes', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail()));
    api.getEntitlementOptions.mockReturnValue(
      of(
        createTenantEntitlementOptions({
          enabledFeatureIds: ['feature-offline', 'feature-online'],
          enabledFeatureCodes: ['offline_operation_sync', 'online_store']
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openEntitlementEditor();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.onPlanChange('plan-2');
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedFeatureIds()).toEqual(['feature-offline']);
    const onlineCheckbox = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('input[type="checkbox"]')
    ).find((input) => input.closest('li')?.textContent?.includes('Online Store')) as HTMLInputElement | undefined;
    expect(onlineCheckbox?.disabled).toBe(true);
  });

  it('calls PUT entitlements with subscriptionPlanId and enabled feature arrays', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail()));
    api.getEntitlementOptions.mockReturnValue(of(createTenantEntitlementOptions()));
    api.updateEntitlements.mockReturnValue(
      of(
        createTenantDetail({
          enabledFeatureIds: ['feature-offline', 'feature-online'],
          enabledFeatureCodes: ['offline_operation_sync', 'online_store']
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openEntitlementEditor();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.selectedFeatureIds.set(['feature-offline', 'feature-online']);
    fixture.componentInstance.saveEntitlements();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.updateEntitlements).toHaveBeenCalledWith('tenant-1', {
      subscriptionPlanId: 'plan-1',
      enabledFeatureIds: ['feature-offline', 'feature-online'],
      enabledFeatureCodes: ['offline_operation_sync', 'online_store']
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Tenant entitlements updated successfully.');
  });

  it('shows entitlement editor loading and error states', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail()));
    api.getEntitlementOptions.mockReturnValueOnce(new Subject().asObservable());

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openEntitlementEditor();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading entitlement options');

    api.getEntitlementOptions.mockReturnValueOnce(throwError(() => new Error('options failed')));
    fixture.componentInstance.openEntitlementEditor();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Entitlement options could not be loaded');
  });
});
