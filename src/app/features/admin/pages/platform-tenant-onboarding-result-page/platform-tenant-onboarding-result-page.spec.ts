import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { manualPaymentDetail } from '../../../../testing/manual-payment-test-fixtures';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { PlatformTenantOnboardingResultPage } from './platform-tenant-onboarding-result-page';

describe('PlatformTenantOnboardingResultPage', () => {
  const operation = { id: 'operation-1', draftId: 'draft-1', tenantId: 'tenant-1', status: 'COMPLETED',
    provisioningStatus: 'COMPLETED', paymentStatus: 'AWAITING_PAYMENT', invitationStatus: 'NOT_ELIGIBLE',
    attemptCount: 1, failureCode: null, retryable: false, nextRetryAt: null, version: 1, updatedAt: '2026-08-04T00:00:00Z' };
  let tenantApi: Record<string, ReturnType<typeof vi.fn>>;
  let billingApi: Record<string, ReturnType<typeof vi.fn>>;

  async function create(permissions: string[]): Promise<ComponentFixture<PlatformTenantOnboardingResultPage>> {
    await TestBed.configureTestingModule({ imports: [PlatformTenantOnboardingResultPage], providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ operationId: 'operation-1' }) } } },
      { provide: PlatformTenantApiService, useValue: tenantApi }, { provide: PlatformBillingApiService, useValue: billingApi },
      { provide: AccessControlService, useValue: { hasPermission: (permission: string) => permissions.includes(permission) } },
      { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Operation failed safely' } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(PlatformTenantOnboardingResultPage); fixture.detectChanges();
    fixture.componentInstance.refresh(); await fixture.whenStable(); fixture.detectChanges(); return fixture;
  }

  beforeEach(() => {
    tenantApi = { getOnboardingOperation: vi.fn().mockReturnValue(of(operation)), getTenantById: vi.fn(), activateTenant: vi.fn(),
      retryOnboardingOperation: vi.fn(), resendTenantAdminInvitation: vi.fn() };
    billingApi = { getTenantManualPaymentStatus: vi.fn().mockReturnValue(of(manualPaymentDetail())), resendManualPaymentNotification: vi.fn() };
  });

  it('shows pending payment without claiming activation or invitation success', async () => {
    const fixture = await create([platformPermissions.billingView]); const text = fixture.nativeElement.textContent;
    expect(text).toContain('Tenant created — payment pending'); expect(text).toContain('Awaiting Payment');
    expect(text).toContain('Not Eligible'); expect(text).not.toContain('Account readyConfirmed');
  });

  it('does not fetch billing projection without billing-view permission', async () => {
    const fixture = await create([]);
    expect(billingApi['getTenantManualPaymentStatus']).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Requires billing-view permission');
  });

  it('shows a separate activation action only when eligible and authorized', async () => {
    billingApi['getTenantManualPaymentStatus'].mockReturnValue(of(manualPaymentDetail({
      payment: { ...manualPaymentDetail().payment, status: 'PAID', tenantStatus: 'PENDING_ACTIVATION' }, activationEligible: true
    })));
    tenantApi['getOnboardingOperation'].mockReturnValue(of({ ...operation, paymentStatus: 'PAID', invitationStatus: 'PENDING_ACTIVATION' }));
    const fixture = await create([platformPermissions.billingView, platformPermissions.tenantsActivate]);
    expect(fixture.nativeElement.textContent).toContain('Payment approved — activation pending');
    expect(fixture.nativeElement.textContent).toContain('Activate tenant');
  });
});
