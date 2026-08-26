import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorResponse } from '../../../core/models/api-response.model';
import { ValidatePlatformPasswordResetTokenResponse } from '../models/password-reset.model';

export type ResetPasswordViewState =
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'expired'
  | 'used'
  | 'revoked'
  | 'unavailable'
  | 'success'
  | 'failure';

export const RESET_PASSWORD_ERROR_CODES = {
  invalidToken: 'platform_password_reset.invalid_token',
  tokenUsed: 'platform_password_reset.token_used',
  tokenRevoked: 'platform_password_reset.token_revoked',
  tokenExpired: 'platform_password_reset.token_expired',
  passwordMismatch: 'platform_password_reset.password_mismatch',
  passwordPolicy: 'platform_password_reset.password_policy',
  invalidUserState: 'platform_password_reset.invalid_user_state'
} as const;

export function mapValidateTokenResponse(
  response: ValidatePlatformPasswordResetTokenResponse | null | undefined
): ResetPasswordViewState {
  if (!response) {
    return 'invalid';
  }

  if (response.isValid && String(response.status).toUpperCase() === 'PENDING') {
    return 'valid';
  }

  switch (String(response.status).toUpperCase()) {
    case 'EXPIRED':
      return 'expired';
    case 'USED':
      return 'used';
    case 'REVOKED':
      return 'revoked';
    default:
      return 'invalid';
  }
}

export function mapCompleteResetErrorCode(
  errorCode: string | null | undefined
): ResetPasswordViewState | 'password' | 'mismatch' | null {
  switch (errorCode) {
    case RESET_PASSWORD_ERROR_CODES.invalidToken:
      return 'invalid';
    case RESET_PASSWORD_ERROR_CODES.tokenExpired:
      return 'expired';
    case RESET_PASSWORD_ERROR_CODES.tokenUsed:
      return 'used';
    case RESET_PASSWORD_ERROR_CODES.tokenRevoked:
      return 'revoked';
    case RESET_PASSWORD_ERROR_CODES.invalidUserState:
      return 'unavailable';
    case RESET_PASSWORD_ERROR_CODES.passwordMismatch:
      return 'mismatch';
    case RESET_PASSWORD_ERROR_CODES.passwordPolicy:
      return 'password';
    default:
      return null;
  }
}

export function resetPasswordStateMessage(state: ResetPasswordViewState): string {
  switch (state) {
    case 'invalid':
      return 'This password reset link is invalid. Ask a Platform Admin to send a new one.';
    case 'expired':
      return 'This password reset link has expired. Ask a Platform Admin to send a new one.';
    case 'used':
      return 'This password reset link has already been used. Sign in with your new password, or ask a Platform Admin to send a new reset.';
    case 'revoked':
      return 'This password reset link is no longer valid because a newer reset was requested. Use the latest email, or ask a Platform Admin to send a new one.';
    case 'unavailable':
      return 'This account cannot be reset right now. Ask a Platform Admin for help.';
    case 'failure':
      return 'We could not reset your password. Please try again.';
    case 'success':
      return 'Password reset successful';
    default:
      return '';
  }
}

export function extractResetErrorCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') {
    return null;
  }

  const payload = error.error as Partial<ApiErrorResponse> & { code?: string };
  return payload.errorCode ?? payload.code ?? null;
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 429;
}
