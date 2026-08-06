import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { manualPaymentDetail } from '../../../../testing/manual-payment-test-fixtures';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { PlatformManualPaymentDetailPage } from './platform-manual-payment-detail-page';

describe('PlatformManualPaymentDetailPage', () => {
  let billing: Record<string, ReturnType<typeof vi.fn>>;
  let tenants: Record<string, ReturnType<typeof vi.fn>>;
  let permissions: string[];

  async function create(detail = manualPaymentDetail()): Promise<ComponentFixture<PlatformManualPaymentDetailPage>> {
    billing['getManualPayment'].mockReturnValue(of(detail));
    billing['getManualPaymentHistory'].mockReturnValue(of({ paymentId: 'payment-1', items: detail.history }));
    await TestBed.configureTestingModule({ imports: [PlatformManualPaymentDetailPage], providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ paymentId: 'payment-1' }) } } },
      { provide: PlatformBillingApiService, useValue: billing }, { provide: PlatformTenantApiService, useValue: tenants },
      { provide: AccessControlService, useValue: { hasPermission: (permission: string) => permissions.includes(permission) } },
      { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Review failed safely' } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(PlatformManualPaymentDetailPage); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); return fixture;
  }

  beforeEach(() => {
    permissions = [platformPermissions.billingView, platformPermissions.billingManage, platformPermissions.auditView];
    billing = { getManualPayment: vi.fn(), getManualPaymentHistory: vi.fn(), reviewManualPayment: vi.fn(),
      getManualPaymentProof: vi.fn(), resendManualPaymentNotification: vi.fn() };
    tenants = { activateTenant: vi.fn(), resendTenantAdminInvitation: vi.fn() };
  });

  it('renders expected-versus-submitted data, clean evidence, and immutable history', async () => {
    const fixture = await create(); const text = fixture.nativeElement.textContent;
    expect(text).toContain('Expected versus submitted'); expect(text).toContain('Amounts match');
    expect(text).toContain('proof.pdf'); expect(text).toContain('Evidence clean'); expect(text).toContain('Submit');
  });

  it('hides review commands without billing-manage permission', async () => {
    permissions = [platformPermissions.billingView]; const fixture = await create();
    expect(fixture.nativeElement.textContent).toContain('Read only');
    expect(fixture.nativeElement.textContent).not.toContain('Request information');
    expect(fixture.nativeElement.textContent).not.toContain('Approve');
  });

  it('blocks approval when evidence is not clean', async () => {
    const pending = manualPaymentDetail({ evidence: [{ ...manualPaymentDetail().evidence[0], scanStatus: 'PENDING' }] });
    const fixture = await create(pending); const approve = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Approve');
    expect(approve?.disabled).toBe(true); expect(fixture.nativeElement.textContent).toContain('Approval blocked until evidence is clean');
  });

  it('submits an approved review with the latest version', async () => {
    billing['reviewManualPayment'].mockReturnValue(of({ paymentId: 'payment-1', invoiceId: 'invoice-1', tenantId: 'tenant-1',
      paymentStatus: 'PAID', invoiceStatus: 'PAID', tenantStatus: 'PENDING_ACTIVATION', version: 4, reviewId: 'review-1',
      result: 'APPROVE', activationEligible: true, idempotentReplay: false }));
    const fixture = await create(); const component = fixture.componentInstance;
    component.openReview('APPROVE'); component.reviewConfirmed.set(true); component.submitReview();
    expect(billing['reviewManualPayment']).toHaveBeenCalledWith('payment-1', expect.objectContaining({ action: 'APPROVE', expectedVersion: 2 }), expect.any(String));
  });

  it('does not retry a stale review and exposes reload recovery', async () => {
    billing['reviewManualPayment'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = await create(); const component = fixture.componentInstance;
    component.openReview('REJECT'); component.reviewConfirmed.set(true); component.reviewReason.set('INVALID_PROOF');
    component.reviewNote.set('The submitted receipt cannot be verified.'); component.submitReview(); fixture.detectChanges();
    expect(component.conflict()).toBe(true); expect(component.actionError()).toContain('updated by another reviewer');
    expect(billing['reviewManualPayment']).toHaveBeenCalledTimes(1);
  });

  it('creates and revokes object URL on proof preview, clear, and component destroy', async () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/mock-blob-1');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const mockBlob = new Blob(['sample-proof'], { type: 'application/pdf' });
    billing['getManualPaymentProof'].mockReturnValue(of({ body: mockBlob }));

    const fixture = await create();
    const component = fixture.componentInstance;
    const evidence = component.detail()!.evidence[0];

    component.previewProof(evidence);
    expect(billing['getManualPaymentProof']).toHaveBeenCalledWith('payment-1', evidence.id);
    expect(createSpy).toHaveBeenCalledWith(mockBlob);

    component.clearProof();
    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/mock-blob-1');

    // Test destroy revocation
    component.previewProof(evidence);
    fixture.destroy();
    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/mock-blob-1');
    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });
});
