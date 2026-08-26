export type PlatformPasswordResetTokenStatus =
  | 'PENDING'
  | 'USED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'INVALID';

export interface ValidatePlatformPasswordResetTokenRequest {
  token: string;
}

export interface ValidatePlatformPasswordResetTokenResponse {
  isValid: boolean;
  status: PlatformPasswordResetTokenStatus | string;
  expiresAt: string | null;
}

export interface CompletePlatformPasswordResetRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CompletePlatformPasswordResetResponse {
  success: boolean;
  message: string;
}
