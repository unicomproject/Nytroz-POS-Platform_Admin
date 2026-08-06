import { ManualPaymentDetail, ManualPaymentQueue, RecipientManualPaymentAccess } from '../features/admin/models/manual-payment.model';

export function recipientAccess(overrides: Partial<RecipientManualPaymentAccess> = {}): RecipientManualPaymentAccess {
  return {
    tenantId: 'tenant-1', tenantReference: 'TEN-001', tenantName: 'Alpha Retail', tenantStatus: 'PENDING_PAYMENT',
    paymentId: 'payment-1', invoiceId: 'invoice-1', invoiceNumber: 'INV-001', invoiceStatus: 'PENDING',
    subtotalAmount: 100, expectedAmount: 110, taxAmount: 10, totalAmount: 110, currencyCode: 'LKR',
    dueAt: '2026-08-10T00:00:00Z', paymentStatus: 'AWAITING_PAYMENT', version: 1, planName: 'Professional',
    billingCycle: 'MONTHLY', subscriptionStatus: 'PENDING', subscriptionPeriodStart: '2026-08-01T00:00:00Z',
    subscriptionPeriodEnd: '2026-08-31T00:00:00Z', instructions: 'Transfer the invoice total and submit proof.',
    invoiceUrl: '/private/invoice', paymentStatusUrl: '/private/status', checkoutUrl: null, invitationStatus: 'NOT_ELIGIBLE',
    paymentMethod: null, referenceSuffix: null, submittedAmount: null, paymentDate: null, payerNote: null, evidence: [],
    submittedAt: null, paidAt: null, updatedAt: '2026-08-04T00:00:00Z', ...overrides
  };
}

export function manualPaymentDetail(overrides: Partial<ManualPaymentDetail> = {}): ManualPaymentDetail {
  return {
    payment: {
      paymentId: 'payment-1', tenantId: 'tenant-1', tenantCode: 'TEN-001', tenantName: 'Alpha Retail',
      tenantStatus: 'PENDING_PAYMENT', invoiceId: 'invoice-1', invoiceNumber: 'INV-001', subscriptionId: 'subscription-1',
      planId: 'plan-1', planName: 'Professional', billingCycle: 'MONTHLY', invoiceDueAt: '2026-08-10T00:00:00Z',
      expectedAmount: 110, submittedAmount: 110, currencyCode: 'LKR', status: 'PAYMENT_SUBMITTED', version: 2,
      submittedAt: '2026-08-04T00:00:00Z', submittedAgeSeconds: 60, updatedAt: '2026-08-04T00:00:00Z'
    },
    paymentMethod: 'BANK_TRANSFER', referenceSuffix: '***1234', paymentDate: '2026-08-03T00:00:00Z', payerNote: 'Paid',
    evidence: [{ id: 'evidence-1', fileName: 'proof.pdf', contentType: 'application/pdf', fileSize: 1024,
      scanStatus: 'CLEAN', submissionVersion: 1, uploadedAt: '2026-08-04T00:00:00Z' }],
    history: [{ id: 'history-1', action: 'SUBMIT', statusBefore: 'AWAITING_PAYMENT', statusAfter: 'PAYMENT_SUBMITTED',
      reasonCode: null, note: null, actorType: 'PAYMENT_RECIPIENT', actorId: null, paymentVersion: 2,
      createdAt: '2026-08-04T00:00:00Z' }],
    allowedActions: ['APPROVE', 'REJECT', 'REQUEST_INFORMATION'], activationEligible: false,
    subscriptionStatus: 'PENDING', invoiceStatus: 'PENDING', subtotalAmount: 100, taxAmount: 10,
    invitationStatus: 'NOT_ELIGIBLE', submittedByType: 'PAYMENT_RECIPIENT', ...overrides
  };
}

export function manualPaymentQueue(): ManualPaymentQueue {
  const detail = manualPaymentDetail();
  return { items: [detail.payment], pageNumber: 1, pageSize: 20, totalCount: 1, totalPages: 1 };
}
