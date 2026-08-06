export const manualPaymentStatuses = [
  'NOT_REQUIRED',
  'AWAITING_PAYMENT',
  'PAYMENT_SUBMITTED',
  'UNDER_REVIEW',
  'ACTION_REQUIRED',
  'PAID',
  'REJECTED',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'DEFERRED'
] as const;

export type ManualPaymentStatus = (typeof manualPaymentStatuses)[number];
export type ManualPaymentReviewAction = 'APPROVE' | 'REJECT' | 'REQUEST_INFORMATION';
export type ManualPaymentTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export interface ManualPaymentStatusPresentation {
  value: ManualPaymentStatus | null;
  raw: string;
  label: string;
  tone: ManualPaymentTone;
  known: boolean;
}

export interface ManualPaymentEvidence {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  scanStatus: string;
  submissionVersion: number;
  uploadedAt: string;
}

export interface RecipientManualPaymentAccess {
  tenantId: string;
  tenantReference: string;
  tenantName: string;
  tenantStatus: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: string;
  subtotalAmount: number;
  expectedAmount: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode: string;
  dueAt: string | null;
  paymentStatus: string;
  version: number;
  planName: string;
  billingCycle: string | null;
  subscriptionStatus: string;
  subscriptionPeriodStart: string | null;
  subscriptionPeriodEnd: string | null;
  instructions: string;
  invoiceUrl: string;
  paymentStatusUrl: string;
  checkoutUrl: string | null;
  invitationStatus: string;
  paymentMethod: string | null;
  referenceSuffix: string | null;
  submittedAmount: number | null;
  paymentDate: string | null;
  payerNote: string | null;
  evidence: ManualPaymentEvidence[];
  submittedAt: string | null;
  paidAt: string | null;
  updatedAt: string;
}

export interface RecipientManualPaymentSubmissionRequest {
  paymentMethod: string;
  bankOrTransactionReference: string;
  submittedAmount: number;
  currencyCode: string;
  paymentDate: string;
  payerNote?: string;
  expectedVersion?: number;
  proof: File;
}

export interface ManualPaymentSubmission {
  paymentId: string;
  status: string;
  version: number;
  referenceSuffix: string | null;
  expectedAmount: number;
  submittedAmount: number | null;
  currencyCode: string;
  paymentDate: string | null;
  evidence: ManualPaymentEvidence[];
  submittedAt: string | null;
  updatedAt: string;
  nextAction: string;
  idempotentReplay: boolean;
}

export interface ManualPaymentHistoryItem {
  id: string;
  action: string;
  statusBefore: string;
  statusAfter: string;
  reasonCode: string | null;
  note: string | null;
  actorType: string;
  actorId: string | null;
  paymentVersion: number;
  createdAt: string;
}

export interface ManualPaymentHistory {
  paymentId: string;
  items: ManualPaymentHistoryItem[];
}

export interface ManualPaymentQueueQuery {
  pageNumber?: number;
  pageSize?: number;
  status?: string;
  tenantId?: string;
  search?: string;
  planId?: string;
  submittedFrom?: string;
  submittedTo?: string;
  sortBy?: 'submittedAt' | 'amount' | 'status' | 'tenant';
  sortDirection?: 'asc' | 'desc';
}

export interface ManualPaymentQueueItem {
  paymentId: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  tenantStatus: string;
  invoiceId: string;
  invoiceNumber: string;
  subscriptionId: string;
  planId: string;
  planName: string;
  billingCycle: string | null;
  invoiceDueAt: string | null;
  expectedAmount: number;
  submittedAmount: number | null;
  currencyCode: string;
  status: string;
  version: number;
  submittedAt: string | null;
  submittedAgeSeconds: number | null;
  updatedAt: string;
}

export interface ManualPaymentQueue {
  items: ManualPaymentQueueItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ManualPaymentDetail {
  payment: ManualPaymentQueueItem;
  paymentMethod: string | null;
  referenceSuffix: string | null;
  paymentDate: string | null;
  payerNote: string | null;
  evidence: ManualPaymentEvidence[];
  history: ManualPaymentHistoryItem[];
  allowedActions: string[];
  activationEligible: boolean;
  subscriptionStatus: string;
  invoiceStatus: string;
  subtotalAmount: number;
  taxAmount: number;
  invitationStatus: string;
  submittedByType: string | null;
}

export interface ManualPaymentReviewRequest {
  action: ManualPaymentReviewAction;
  expectedVersion: number;
  reviewNote?: string;
  reasonCode?: string;
}

export interface ManualPaymentReviewResult {
  paymentId: string;
  invoiceId: string;
  tenantId: string;
  paymentStatus: string;
  invoiceStatus: string;
  tenantStatus: string;
  version: number;
  reviewId: string;
  result: string;
  activationEligible: boolean;
  idempotentReplay: boolean;
}

export interface ManualPaymentNotificationResult {
  paymentId: string;
  notificationType: string;
  status: string;
  idempotentReplay: boolean;
}

export interface InvitationResendResult {
  tenantId: string;
  invitationStatus: string;
  idempotentReplay: boolean;
}
