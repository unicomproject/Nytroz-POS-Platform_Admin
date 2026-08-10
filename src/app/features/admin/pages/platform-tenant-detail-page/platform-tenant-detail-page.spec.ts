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
    updateTenant: ReturnType<typeof vi.fn>;
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

  function textOf(fixture: ComponentFixture<PlatformTenantDetailPage>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function buttonByText(
    fixture: ComponentFixture<PlatformTenantDetailPage>,
    label: string
  ): HTMLButtonElement | undefined {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((button) =>
      button.textContent?.includes(label)
    );
  }

  beforeEach(() => {
    api = {
      getTenantById: vi.fn(),
      activateTenant: vi.fn(),
      reactivateTenant: vi.fn(),
      suspendTenant: vi.fn(),
      updateTenant: vi.fn(),
      getEntitlementOptions: vi.fn(),
      updateEntitlements: vi.fn(),
      getTenantAuditLogs: vi.fn().mockReturnValue(
        of({
          data: {
            items: [],
            pageNumber: 1,
            pageSize: 10,
            totalCount: 0,
            totalPages: 0
          }
        })
      )
    };
    accessControl = {
      hasPermission: vi.fn((permission: string) =>
        [
          platformPermissions.tenantsActivate,
          platformPermissions.tenantsSuspend,
          platformPermissions.tenantsEntitlementsUpdate,
          platformPermissions.tenantsUpdate,
          platformPermissions.tenantSubscriptionsView,
          platformPermissions.billingView,
          platformPermissions.auditView
        ].includes(permission as never)
      )
    };
  });

  it('shows a loading state while the API request is pending', async () => {
    api.getTenantById.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();

    expect(fixture.nativeElement.querySelector('[aria-label="Loading tenant detail"]')).toBeTruthy();
  });

  it('renders page header with tenant name, breadcrumb, and status badge', async () => {
    api.getTenantById.mockReturnValue(
      of(
        createTenantDetail({
          name: 'Demo Tenant Alpha',
          status: 'active',
          lifecycleStatus: 'active'
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = textOf(fixture);
    expect(text).toContain('Demo Tenant Alpha');
    expect(text).toContain('Tenants');
    const tenantsCrumb = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).find((anchor) =>
      anchor.textContent?.trim() === 'Tenants'
    );
    expect(tenantsCrumb).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-status-badge')?.textContent).toContain('Active');
    expect(text).toContain('demo-alpha');
  });

  it('renders tenant detail returned by the backend response', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = textOf(fixture);
    expect(text).toContain('Demo Tenant Alpha');
    expect(text).toContain('demo-alpha');
    expect(text).toContain('Professional');
    expect(text).toContain('offline_operation_sync');
  });

  it('shows lifecycle buttons based on backend flags and permissions', async () => {
    api.getTenantById.mockReturnValue(
      of(
        createTenantDetail({
          canActivate: true,
          canSuspend: false,
          canUpdate: false,
          status: 'pending_activation',
          lifecycleStatus: 'pending_activation'
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = textOf(fixture);
    expect(text).toContain('Activate Tenant');
    expect(text).toContain('Pending Activation');
    expect(text).not.toContain('Suspend Tenant');
  });

  it('does not offer activation for pending_payment tenants', async () => {
    api.getTenantById.mockReturnValue(
      of(
        createTenantDetail({
          canActivate: true,
          canSuspend: false,
          status: 'pending_payment',
          lifecycleStatus: 'pending_payment'
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = textOf(fixture);
    expect(text).not.toContain('Activate Tenant');
    expect(text).toContain('Pending Payment');
  });

  it('does not offer activation for active or cancelled tenants', async () => {
    api.getTenantById.mockReturnValue(
      of(
        createTenantDetail({
          canActivate: true,
          canSuspend: false,
          status: 'active',
          lifecycleStatus: 'active'
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(textOf(fixture)).not.toContain('Activate Tenant');

    api.getTenantById.mockReturnValue(
      of(
        createTenantDetail({
          canActivate: true,
          canSuspend: false,
          status: 'cancelled',
          lifecycleStatus: 'cancelled'
        })
      )
    );
    fixture.componentInstance.reload();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(textOf(fixture)).not.toContain('Activate Tenant');
  });

  it('refreshes tenant detail after activate action', async () => {
    api.getTenantById.mockReturnValue(
      of(
        createTenantDetail({
          canActivate: true,
          canSuspend: false,
          canUpdate: false,
          status: 'pending_activation',
          lifecycleStatus: 'pending_activation'
        })
      )
    );
    api.activateTenant.mockReturnValue(
      of(
        createTenantDetail({
          canActivate: false,
          canSuspend: true,
          status: 'active',
          lifecycleStatus: 'active'
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    buttonByText(fixture, 'Activate Tenant')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.activateTenant).toHaveBeenCalledWith('tenant-1');
    expect(textOf(fixture)).toContain('Tenant activated successfully.');
    expect(textOf(fixture)).toContain('Active');
  });

  it('shows reactivate for suspended tenants', async () => {
    api.getTenantById.mockReturnValue(
      of(
        createTenantDetail({
          canActivate: false,
          canSuspend: false,
          canUpdate: false,
          status: 'suspended',
          lifecycleStatus: 'suspended'
        })
      )
    );
    api.reactivateTenant.mockReturnValue(
      of(
        createTenantDetail({
          status: 'active',
          lifecycleStatus: 'active',
          canSuspend: true
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(textOf(fixture)).toContain('Reactivate Tenant');
    buttonByText(fixture, 'Reactivate Tenant')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.reactivateTenant).toHaveBeenCalledWith('tenant-1');
    expect(textOf(fixture)).toContain('Tenant reactivated successfully.');
  });

  it('shows a safe error state on API failure', async () => {
    api.getTenantById.mockReturnValue(throwError(() => new Error('network failed')));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = textOf(fixture);
    expect(text).toContain('Tenant detail could not be loaded');
    expect(text).toContain('Tenant detail failed safely');
  });

  it('enters profile edit mode and cancels without calling update API', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail({ canUpdate: true })));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(textOf(fixture)).toContain('Tenant Profile');
    expect(fixture.nativeElement.querySelector('#tenant-name')).toBeNull();

    buttonByText(fixture, 'Edit Profile')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#tenant-name')).toBeTruthy();
    buttonByText(fixture, 'Cancel')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#tenant-name')).toBeNull();
    expect(api.updateTenant).not.toHaveBeenCalled();
  });

  it('validates required tenant name before save', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail({ canUpdate: true })));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    buttonByText(fixture, 'Edit Profile')?.click();
    fixture.detectChanges();

    fixture.componentInstance.updateEditField('name', '   ');
    fixture.componentInstance.saveTenantEdit();
    fixture.detectChanges();

    expect(textOf(fixture)).toContain('Tenant name is required.');
    expect(api.updateTenant).not.toHaveBeenCalled();
  });

  it('saves profile edits through the existing update API', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail({ canUpdate: true, concurrencyVersion: 'v1' })));
    api.updateTenant.mockReturnValue(of(createTenantDetail({ name: 'Renamed Tenant', canUpdate: true })));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    buttonByText(fixture, 'Edit Profile')?.click();
    fixture.detectChanges();

    fixture.componentInstance.updateEditField('name', 'Renamed Tenant');
    fixture.componentInstance.saveTenantEdit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.updateTenant).toHaveBeenCalledTimes(1);
    expect(api.updateTenant).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        name: 'Renamed Tenant',
        concurrencyVersion: 'v1'
      })
    );
    expect(textOf(fixture)).toContain('Tenant updated successfully.');
    expect(textOf(fixture)).toContain('Renamed Tenant');
  });

  it('hides edit entitlements button without platform.tenants.entitlements.update permission', async () => {
    accessControl.hasPermission.mockImplementation(
      (permission: string) => permission !== platformPermissions.tenantsEntitlementsUpdate
    );
    api.getTenantById.mockReturnValue(of(createTenantDetail({ canManageEntitlements: true })));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(textOf(fixture)).not.toContain('Edit Entitlements');
  });

  it('loads entitlement options when the editor opens', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail()));
    api.getEntitlementOptions.mockReturnValue(of(createTenantEntitlementOptions()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    buttonByText(fixture, 'Edit Entitlements')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getEntitlementOptions).toHaveBeenCalledWith('tenant-1');
    expect(textOf(fixture)).toContain('Offline Operation Sync');
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

    expect(api.updateEntitlements).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        subscriptionPlanId: 'plan-1',
        enabledFeatureIds: ['feature-offline', 'feature-online'],
        enabledFeatureCodes: ['offline_operation_sync', 'online_store']
      })
    );
    expect(textOf(fixture)).toContain('Tenant entitlements updated successfully.');
  });

  it('shows entitlement editor loading and error states', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail()));
    api.getEntitlementOptions.mockReturnValueOnce(new Subject().asObservable());

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openEntitlementEditor();
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('Loading entitlement options');

    api.getEntitlementOptions.mockReturnValueOnce(throwError(() => new Error('options failed')));
    fixture.componentInstance.openEntitlementEditor();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(textOf(fixture)).toContain('Entitlement options could not be loaded');
  });

  it('shows suspend confirmation dialog when suspend button is clicked without calling API', async () => {
    api.getTenantById.mockReturnValue(
      of(
        createTenantDetail({
          canActivate: false,
          canSuspend: true,
          status: 'active',
          lifecycleStatus: 'active'
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const suspendButton = buttonByText(fixture, 'Suspend Tenant');
    expect(suspendButton).toBeTruthy();

    suspendButton?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isConfirmDialogOpen()).toBe(true);
    expect(api.suspendTenant).not.toHaveBeenCalled();
    expect(textOf(fixture)).toContain('Are you sure you want to suspend this tenant?');
  });

  it('calls suspend API once on suspend confirmation', async () => {
    api.getTenantById.mockReturnValue(
      of(
        createTenantDetail({
          canActivate: false,
          canSuspend: true,
          status: 'active',
          lifecycleStatus: 'active'
        })
      )
    );
    api.suspendTenant.mockReturnValue(
      of(
        createTenantDetail({
          canActivate: true,
          canSuspend: false,
          status: 'suspended',
          lifecycleStatus: 'suspended'
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.confirmSuspend();
    fixture.detectChanges();
    fixture.componentInstance.onSuspendConfirmed();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.suspendTenant).toHaveBeenCalledTimes(1);
    expect(api.suspendTenant).toHaveBeenCalledWith('tenant-1');
    expect(fixture.componentInstance.isConfirmDialogOpen()).toBe(false);
  });

  it('does not call suspend API on cancel', async () => {
    api.getTenantById.mockReturnValue(
      of(
        createTenantDetail({
          canActivate: false,
          canSuspend: true,
          status: 'active',
          lifecycleStatus: 'active'
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.confirmSuspend();
    fixture.detectChanges();
    fixture.componentInstance.onSuspendCancelled();
    fixture.detectChanges();

    expect(api.suspendTenant).not.toHaveBeenCalled();
    expect(fixture.componentInstance.isConfirmDialogOpen()).toBe(false);
  });

  it('switches to audit tab and loads audit logs', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail()));
    api.getTenantAuditLogs.mockReturnValue(
      of({
        data: {
          items: [
            {
              id: '1',
              occurredAt: '2026-08-10T12:00:00Z',
              actor: { email: 'admin@oneverz.com', platformUserId: null },
              action: 'suspend',
              summary: 'Suspended tenant',
              reason: null
            }
          ],
          pageNumber: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1
        }
      })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.switchTab('audit');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getTenantAuditLogs).toHaveBeenCalledWith('tenant-1', 1, 10);
    const tableText = fixture.nativeElement.querySelector('.data-table')?.textContent;
    expect(tableText).toContain('admin@oneverz.com');
    expect(tableText).toContain('suspend');
  });

  it('shows empty state when audit history has no rows', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail()));
    api.getTenantAuditLogs.mockReturnValue(
      of({
        data: {
          items: [],
          pageNumber: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 0
        }
      })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.switchTab('audit');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(textOf(fixture)).toContain('No audit history');
    expect(fixture.nativeElement.querySelector('.data-table')).toBeNull();
  });

  it('does not reload audit logs when returning to the audit tab', async () => {
    api.getTenantById.mockReturnValue(of(createTenantDetail()));
    api.getTenantAuditLogs.mockReturnValue(
      of({
        data: {
          items: [],
          pageNumber: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 0
        }
      })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.switchTab('audit');
    await fixture.whenStable();
    fixture.componentInstance.activeTab.set('details');
    fixture.componentInstance.switchTab('audit');
    await fixture.whenStable();

    expect(api.getTenantAuditLogs).toHaveBeenCalledTimes(1);
  });
});
