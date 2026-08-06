import { HttpErrorResponse } from '@angular/common/http';
import { manualPaymentErrorMessage } from './manual-payment-error.util';

describe('manualPaymentErrorMessage', () => {
  const service = { toApiError: (error: HttpErrorResponse) => error.error, toSafeMessage: () => 'Safe fallback' } as never;
  it('maps stable amount and concurrency codes to actionable copy', () => {
    expect(manualPaymentErrorMessage(apiError('manual_payment.amount_mismatch'), service)).toContain('match the invoice total');
    expect(manualPaymentErrorMessage(apiError('manual_payment.concurrency_conflict'), service)).toContain('Reload');
  });
  it('uses a safe fallback for unknown errors', () => expect(manualPaymentErrorMessage(new Error('raw'), service)).toBe('Safe fallback'));
});

function apiError(errorCode: string): HttpErrorResponse {
  return new HttpErrorResponse({ status: 409, error: { success: false, message: 'raw', errorCode, errors: [] } });
}
