export type PlatformPasswordResetStatus = 'PENDING' | 'USED' | 'EXPIRED' | 'REVOKED' | 'INVALID';

export interface PlatformPasswordResetValidation {
  isValid: boolean;
  status: PlatformPasswordResetStatus;
  expiresAt: string | null;
}

export interface CompletePlatformPasswordResetRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}
