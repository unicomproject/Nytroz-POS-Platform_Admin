export interface TenantOnboardingAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  stateOrProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
}

export interface TenantOnboardingContact {
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface TenantOnboardingPayload {
  basicDetails: Record<string, unknown> | null;
  businessContact: Record<string, unknown> | null;
  plan: Record<string, unknown> | null;
  billing: Record<string, unknown> | null;
  entitlements: Record<string, unknown> | null;
  tenantAdmin: Record<string, unknown> | null;
  reviewConfirmed?: boolean;
}

export interface TenantOnboardingDraft {
  id: string;
  ownerPlatformUserId: string;
  status: string;
  currentStep: number;
  completedSteps: number[];
  progressPercent: number;
  payload: TenantOnboardingPayload;
  schemaVersion: number;
  version: number;
  createdAt: string;
  updatedAt: string | null;
  expiresAt: string;
  createdTenantId: string | null;
  warnings: string[];
}

export interface TenantOnboardingDraftSummary {
  id: string;
  displayName: string | null;
  tenantCode: string | null;
  status: string;
  currentStep: number;
  progressPercent: number;
  ownerPlatformUserId: string;
  updatedAt: string | null;
  expiresAt: string;
  version: number;
}

export interface TenantOnboardingReceipt {
  tenantId: string;
  draftId: string;
  operationId: string;
  tenantStatus: string;
  provisioningStatus: string;
  paymentStatus: string;
  invitationStatus: string;
  createdAt: string;
  idempotentReplay: boolean;
}

export interface TenantOnboardingOperation {
  id: string;
  draftId: string;
  tenantId: string;
  status: string;
  provisioningStatus: string;
  paymentStatus: string;
  invitationStatus: string;
  attemptCount: number;
  failureCode: string | null;
  retryable: boolean;
  nextRetryAt: string | null;
  version: number;
  updatedAt: string | null;
}
