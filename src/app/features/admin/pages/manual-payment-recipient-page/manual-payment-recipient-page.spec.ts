import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { recipientAccess } from '../../../../testing/manual-payment-test-fixtures';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';
import { ManualPaymentRecipientPage } from './manual-payment-recipient-page';

describe('ManualPaymentRecipientPage', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  async function create(access = recipientAccess()): Promise<ComponentFixture<ManualPaymentRecipientPage>> {
    api['getRecipientPaymentAccess'].mockReturnValue(of(access));
    await TestBed.configureTestingModule({
      imports: [ManualPaymentRecipientPage],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ accessToken: 'test-token' }) } } },
        { provide: PlatformBillingApiService, useValue: api },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Safe payment error', toApiError: () => null } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(ManualPaymentRecipientPage); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); return fixture;
  }

  beforeEach(() => {
    api = {
      getRecipientPaymentAccess: vi.fn(), getRecipientHistory: vi.fn().mockReturnValue(of({ paymentId: 'payment-1', items: [] })),
      getRecipientInvoice: vi.fn(), submitRecipientEvidence: vi.fn(), updateRecipientSubmission: vi.fn()
    };
  });

  it('renders awaiting-payment details and never renders a gateway checkout action', async () => {
    const fixture = await create(); const text = fixture.nativeElement.textContent;
    expect(text).toContain('Alpha Retail'); expect(text).toContain('Submit Payment Details');
    expect(text).toContain('INV-001'); expect(text).not.toContain('Pay online'); expect(text).not.toContain('test-token');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
  });

  it('shows submitted state and hides duplicate submission form', async () => {
    const fixture = await create(recipientAccess({ paymentStatus: 'PAYMENT_SUBMITTED', submittedAt: '2026-08-04T00:00:00Z',
      submittedAmount: 110, paymentDate: '2026-08-03T00:00:00Z', referenceSuffix: '***1234' }));
    expect(fixture.nativeElement.textContent).toContain('Submission received');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('shows reviewer guidance and correction form for action required', async () => {
    api['getRecipientHistory'].mockReturnValue(of({ paymentId: 'payment-1', items: [{ id: 'h1', action: 'REQUEST_INFORMATION',
      statusBefore: 'UNDER_REVIEW', statusAfter: 'ACTION_REQUIRED', reasonCode: 'INFO', note: 'Upload a clearer receipt.',
      actorType: 'PLATFORM_ADMIN', actorId: null, paymentVersion: 3, createdAt: '2026-08-04T00:00:00Z' }] }));
    const fixture = await create(recipientAccess({ paymentStatus: 'ACTION_REQUIRED', version: 3 }));
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Upload a clearer receipt.');
    expect(fixture.nativeElement.textContent).toContain('Update Payment Details');
  });

  it('validates file type and submits exact recipient form through the service', async () => {
    api['submitRecipientEvidence'].mockReturnValue(of(new HttpResponse({ body: { success: true, message: 'ok', data: {
      paymentId: 'payment-1', status: 'PAYMENT_SUBMITTED', version: 2, referenceSuffix: '***1234', expectedAmount: 110,
      submittedAmount: 110, currencyCode: 'LKR', paymentDate: 'now', evidence: [], submittedAt: 'now', updatedAt: 'now',
      nextAction: 'WAIT_FOR_REVIEW', idempotentReplay: false } } })));
    const fixture = await create(); const component = fixture.componentInstance;
    component.chooseFile({ target: { files: [new File(['bad'], 'proof.exe')] } } as unknown as Event);
    expect(component.fileError()).toContain('Only PDF');
    component.chooseFile({ target: { files: [new File(['pdf'], 'proof.pdf', { type: 'application/pdf' })] } } as unknown as Event);
    component.form.patchValue({ bankOrTransactionReference: 'BANK-1', submittedAmount: 110, paymentDate: '2026-08-03' });
    component.submit(); expect(api['submitRecipientEvidence']).toHaveBeenCalledOnce();
  });

  it('shows a privacy-safe invalid or expired state', async () => {
    api['getRecipientPaymentAccess'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    await TestBed.configureTestingModule({ imports: [ManualPaymentRecipientPage], providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ accessToken: 'expired-secret' }) } } },
      { provide: PlatformBillingApiService, useValue: api },
      { provide: ApiErrorService, useValue: { toSafeMessage: () => 'unsafe details', toApiError: () => null } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(ManualPaymentRecipientPage); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('invalid or expired');
    expect(fixture.nativeElement.textContent).not.toContain('expired-secret'); expect(fixture.nativeElement.textContent).not.toContain('unsafe details');
  });
});
