import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { manualPaymentDetail } from '../../../../testing/manual-payment-test-fixtures';
import { TenantOnboardingOperation } from '../../models/platform-tenant-onboarding.model';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { LONG_RUNNING_MS, POLL_INTERVAL_MS, PlatformTenantOnboardingResultPage } from './platform-tenant-onboarding-result-page';
import { buildStatusPresentation } from './onboarding-operation-lifecycle';

describe('PlatformTenantOnboardingResultPage', () => {
  const baseOperation: TenantOnboardingOperation = {
    id: 'operation-1',
    draftId: 'draft-1',
    tenantId: 'tenant-1',
    status: 'SUCCEEDED',
    provisioningStatus: 'SUCCEEDED',
    paymentStatus: 'AWAITING_PAYMENT',
    invitationStatus: 'NOT_ELIGIBLE',
    attemptCount: 1,
    failureCode: null,
    retryable: false,
    nextRetryAt: null,
    version: 1,
    updatedAt: '2026-08-11T00:00:00Z'
  };

  let tenantApi: Record<string, ReturnType<typeof vi.fn>>;
  let billingApi: Record<string, ReturnType<typeof vi.fn>>;

  async function create(
    permissions: string[],
    operationId = 'operation-1',
    options?: { skipRefresh?: boolean }
  ): Promise<ComponentFixture<PlatformTenantOnboardingResultPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformTenantOnboardingResultPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ operationId }) } }
        },
        { provide: PlatformTenantApiService, useValue: tenantApi },
        { provide: PlatformBillingApiService, useValue: billingApi },
        {
          provide: AccessControlService,
          useValue: { hasPermission: (permission: string) => permissions.includes(permission) }
        },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Operation failed safely' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformTenantOnboardingResultPage);
    fixture.detectChanges();
    if (!options?.skipRefresh && operationId) {
      fixture.componentInstance.refresh();
      await fixture.whenStable();
    } else {
      await fixture.whenStable();
    }
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    tenantApi = {
      getOnboardingOperation: vi.fn().mockReturnValue(of(baseOperation)),
      getTenantById: vi.fn().mockReturnValue(of({ id: 'tenant-1', name: 'Colombo Arena Retail', code: 'TEN-00248', status: 'PENDING_PAYMENT' })),
      activateTenant: vi.fn(),
      retryOnboardingOperation: vi.fn(),
      resendTenantAdminInvitation: vi.fn()
    };
    billingApi = {
      getTenantManualPaymentStatus: vi.fn().mockReturnValue(of(manualPaymentDetail())),
      resendManualPaymentNotification: vi.fn()
    };
  });

  it('renders payment pending without claiming activation or invitation success', async () => {
    const fixture = await create([platformPermissions.billingView, platformPermissions.tenantsView]);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Tenant created — payment setup pending');
    expect(text).toContain('Awaiting payment');
    expect(text).toContain('Not eligible');
    expect(text).not.toContain('Tenant setup complete');
    expect(text).not.toContain('Prototype State Preview');
  });

  it('does not fetch billing projection without billing-view permission', async () => {
    const fixture = await create([platformPermissions.tenantsView]);
    expect(billingApi['getTenantManualPaymentStatus']).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Billing details require billing-view permission');
  });

  it('shows activation action only when eligible and authorized', async () => {
    billingApi['getTenantManualPaymentStatus'].mockReturnValue(of(manualPaymentDetail({
      payment: { ...manualPaymentDetail().payment, status: 'PAID', tenantStatus: 'PENDING_ACTIVATION' },
      activationEligible: true
    })));
    tenantApi['getOnboardingOperation'].mockReturnValue(of({
      ...baseOperation,
      paymentStatus: 'PAID',
      invitationStatus: 'NOT_ELIGIBLE'
    }));

    const fixture = await create([
      platformPermissions.billingView,
      platformPermissions.tenantsView,
      platformPermissions.tenantsActivate
    ]);

    expect(fixture.nativeElement.textContent).toContain('Payment approved — activation pending');
    expect(fixture.nativeElement.textContent).toContain('Activate tenant');
  });

  it('shows retry only when retryable and billing permission exists', async () => {
    tenantApi['getOnboardingOperation'].mockReturnValue(of({
      ...baseOperation,
      status: 'FAILED_RETRYABLE',
      retryable: true,
      paymentStatus: 'PAID',
      invitationStatus: 'FAILED',
      failureCode: 'delivery_outbox_failed'
    }));

    const fixture = await create([platformPermissions.billingView, platformPermissions.billingManage, platformPermissions.tenantsView]);
    expect(fixture.nativeElement.textContent).toContain('Retry Processing');
  });

  it('hides retry when operation is not retryable', async () => {
    tenantApi['getOnboardingOperation'].mockReturnValue(of({
      ...baseOperation,
      status: 'FAILED_FINAL',
      retryable: false,
      failureCode: 'terminal_failure'
    }));

    const fixture = await create([platformPermissions.billingManage, platformPermissions.tenantsView]);
    expect(fixture.nativeElement.textContent).not.toContain('Retry Processing');
  });

  it('issues exactly one retry request and never finalize/create', async () => {
    const retryResponse = { ...baseOperation, status: 'FAILED_RETRYABLE', retryable: true };
    tenantApi['getOnboardingOperation'].mockReturnValue(of(retryResponse));
    tenantApi['retryOnboardingOperation'] = vi.fn().mockReturnValue(of(retryResponse));

    const fixture = await create([platformPermissions.billingManage, platformPermissions.tenantsView]);
    fixture.detectChanges();

    const retryButton = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Retry Processing'));
    expect(retryButton).toBeTruthy();
    retryButton!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(tenantApi['retryOnboardingOperation']).toHaveBeenCalledTimes(1);
  });

  it('distinguishes poll errors from operation failure when last known state exists', async () => {
    const fixture = await create([platformPermissions.tenantsView]);
    tenantApi['getOnboardingOperation'].mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));

    fixture.componentInstance.refresh();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain("We couldn't refresh the latest status");
    expect(text).toContain('Tenant created — payment setup pending');
    expect(text).not.toContain('Tenant provisioning could not fully complete');
  });

  it('shows not found state for missing operations', async () => {
    tenantApi['getOnboardingOperation'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = await create([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Operation not found');
  });

  it('shows permission denied state for forbidden operations', async () => {
    tenantApi['getOnboardingOperation'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    const fixture = await create([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("don't have permission");
  });

  it('does not expose cancel operation controls', async () => {
    const fixture = await create([platformPermissions.billingView, platformPermissions.tenantsView]);
    expect(fixture.nativeElement.textContent).not.toMatch(/Cancel Operation|Abort|Stop Provisioning/i);
  });

  it('does not expose numeric or fake progress', async () => {
    const fixture = await create([platformPermissions.billingView, platformPermissions.tenantsView]);
    expect(fixture.nativeElement.textContent).not.toMatch(/\d+%|Almost done|Step 1 of 7/i);
  });

  it('uses a 5000ms polling interval contract', () => {
    expect(POLL_INTERVAL_MS).toBe(5000);
  });

  it('polls again after the configured interval while processing', async () => {
    vi.useFakeTimers();
    const processingOperation = { ...baseOperation, status: 'PROCESSING', provisioningStatus: 'PROCESSING' };
    tenantApi['getOnboardingOperation'] = vi.fn()
      .mockReturnValueOnce(of(processingOperation))
      .mockReturnValueOnce(of(processingOperation));

    await TestBed.configureTestingModule({
      imports: [PlatformTenantOnboardingResultPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ operationId: 'operation-1' }) } } },
        { provide: PlatformTenantApiService, useValue: tenantApi },
        { provide: PlatformBillingApiService, useValue: billingApi },
        { provide: AccessControlService, useValue: { hasPermission: () => true } },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'safe' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformTenantOnboardingResultPage);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    expect(tenantApi['getOnboardingOperation']).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(tenantApi['getOnboardingOperation']).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('stops polling when operation reaches terminal success', async () => {
    vi.useFakeTimers();
    tenantApi['getOnboardingOperation'] = vi.fn()
      .mockReturnValueOnce(of({ ...baseOperation, status: 'PROCESSING' }))
      .mockReturnValue(of(baseOperation));

    await TestBed.configureTestingModule({
      imports: [PlatformTenantOnboardingResultPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ operationId: 'operation-1' }) } } },
        { provide: PlatformTenantApiService, useValue: tenantApi },
        { provide: PlatformBillingApiService, useValue: billingApi },
        { provide: AccessControlService, useValue: { hasPermission: () => true } },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'safe' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformTenantOnboardingResultPage);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    expect(tenantApi['getOnboardingOperation']).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('manual refresh performs one additional request', async () => {
    const fixture = await create([platformPermissions.tenantsView]);
    const initialCalls = tenantApi['getOnboardingOperation'].mock.calls.length;

    fixture.componentInstance.refresh();
    await fixture.whenStable();

    expect(tenantApi['getOnboardingOperation']).toHaveBeenCalledTimes(initialCalls + 1);
  });

  it('renders lifecycle labels with textual states for accessibility', async () => {
    const fixture = await create([platformPermissions.tenantsView]);
    expect(fixture.nativeElement.textContent).toContain('Tenant created — Completed');
    expect(fixture.nativeElement.textContent).toContain('Payment setup — Awaiting payment');
  });

  it('maps long-running presentation from lifecycle context', () => {
    const presentation = buildStatusPresentation(
      { ...baseOperation, status: 'PROCESSING', provisioningStatus: 'PROCESSING' },
      { tenantStatus: 'PROVISIONING', isActiveTenant: false, isLongRunning: true }
    );

    expect(presentation.headline).toContain('taking longer than usual');
  });
});
