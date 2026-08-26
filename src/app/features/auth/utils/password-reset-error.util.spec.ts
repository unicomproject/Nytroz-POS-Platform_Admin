import { HttpErrorResponse } from '@angular/common/http';

import {
  extractResetErrorCode,
  isRateLimited,
  mapCompleteResetErrorCode,
  mapValidateTokenResponse,
  RESET_PASSWORD_ERROR_CODES,
  resetPasswordStateMessage
} from './password-reset-error.util';

describe('password-reset-error.util', () => {
  it('maps a valid pending token to the form state', () => {
    expect(mapValidateTokenResponse({ isValid: true, status: 'PENDING', expiresAt: '2026-08-14T12:00:00Z' })).toBe(
      'valid'
    );
  });

  it('maps invalid, expired, used, and revoked validate statuses', () => {
    expect(mapValidateTokenResponse({ isValid: false, status: 'INVALID', expiresAt: null })).toBe('invalid');
    expect(mapValidateTokenResponse({ isValid: false, status: 'EXPIRED', expiresAt: '2026-08-14T12:00:00Z' })).toBe(
      'expired'
    );
    expect(mapValidateTokenResponse({ isValid: false, status: 'USED', expiresAt: '2026-08-14T12:00:00Z' })).toBe('used');
    expect(mapValidateTokenResponse({ isValid: false, status: 'REVOKED', expiresAt: '2026-08-14T12:00:00Z' })).toBe(
      'revoked'
    );
  });

  it('maps complete error codes without using message strings', () => {
    expect(mapCompleteResetErrorCode(RESET_PASSWORD_ERROR_CODES.invalidToken)).toBe('invalid');
    expect(mapCompleteResetErrorCode(RESET_PASSWORD_ERROR_CODES.tokenExpired)).toBe('expired');
    expect(mapCompleteResetErrorCode(RESET_PASSWORD_ERROR_CODES.tokenUsed)).toBe('used');
    expect(mapCompleteResetErrorCode(RESET_PASSWORD_ERROR_CODES.tokenRevoked)).toBe('revoked');
    expect(mapCompleteResetErrorCode(RESET_PASSWORD_ERROR_CODES.invalidUserState)).toBe('unavailable');
    expect(mapCompleteResetErrorCode(RESET_PASSWORD_ERROR_CODES.passwordMismatch)).toBe('mismatch');
    expect(mapCompleteResetErrorCode(RESET_PASSWORD_ERROR_CODES.passwordPolicy)).toBe('password');
    expect(mapCompleteResetErrorCode('email.provider_failed')).toBeNull();
  });

  it('reads errorCode from the legacy envelope and code from the canonical envelope', () => {
    expect(
      extractResetErrorCode(
        new HttpErrorResponse({
          status: 400,
          error: { success: false, errorCode: RESET_PASSWORD_ERROR_CODES.tokenExpired, message: 'expired' }
        })
      )
    ).toBe(RESET_PASSWORD_ERROR_CODES.tokenExpired);

    expect(
      extractResetErrorCode(
        new HttpErrorResponse({
          status: 400,
          error: { code: RESET_PASSWORD_ERROR_CODES.tokenUsed, message: 'used' }
        })
      )
    ).toBe(RESET_PASSWORD_ERROR_CODES.tokenUsed);
  });

  it('detects rate limiting and keeps user copy non-technical', () => {
    expect(isRateLimited(new HttpErrorResponse({ status: 429 }))).toBe(true);
    expect(resetPasswordStateMessage('invalid')).not.toMatch(/token/i);
    expect(resetPasswordStateMessage('expired')).toContain('expired');
  });
});
