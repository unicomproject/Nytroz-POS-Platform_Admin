import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorService } from '../../../core/services/api-error.service';

const messages: Record<string, string> = {
  access_invalid_or_expired: 'This payment link is invalid or expired. Request a new link from the billing team.',
  access_invalid: 'This payment link is invalid. Request a new link from the billing team.',
  access_expired: 'This payment link has expired. Request a new link from the billing team.',
  access_revoked: 'This payment link is no longer active. Request a new link from the billing team.',
  access_wrong_purpose: 'This link cannot be used for payment access.',
  validation_failed: 'Review the highlighted payment details and try again.',
  invalid_transition: 'This action is no longer allowed for the current payment status.',
  amount_mismatch: 'The submitted amount must match the invoice total.',
  currency_mismatch: 'The submitted currency must match the invoice currency.',
  proof_required: 'Select a payment proof before submitting.',
  proof_access_denied: 'This evidence is unavailable or you do not have access.',
  proof_not_clean: 'Approval is blocked until evidence passes malware scanning.',
  concurrency_conflict: 'This payment was updated elsewhere. Reload the latest status before continuing.',
  idempotency_conflict: 'This command key was already used for different payment details. Reload before trying again.',
  review_note_required: 'Enter a clear review note for this action.',
  not_found: 'The requested payment could not be found.',
  access_denied: 'You do not have permission to perform this payment action.',
  rate_limited: 'Too many attempts were made. Wait before trying again.',
  storage_unavailable: 'Private evidence storage is temporarily unavailable. Try again later.',
  scanner_unavailable: 'Evidence scanning is temporarily unavailable. The payment was not approved.'
};

export function manualPaymentErrorMessage(error: unknown, apiError: ApiErrorService): string {
  const code = apiError.toApiError(error)?.errorCode?.split('.').pop()?.toLowerCase();
  if (code && messages[code]) return messages[code];
  if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 410)) return messages['access_invalid_or_expired'];
  return apiError.toSafeMessage(error);
}
