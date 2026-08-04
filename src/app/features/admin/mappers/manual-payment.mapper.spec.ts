import { mapManualPaymentDetail, mapManualPaymentEvidence, mapManualPaymentQueue, mapRecipientManualPaymentAccess, presentManualPaymentStatus } from './manual-payment.mapper';
import { manualPaymentDetail, manualPaymentQueue, recipientAccess } from '../../../testing/manual-payment-test-fixtures';

describe('manual payment mapper', () => {
  it('maps every canonical status without treating unknown values as success', () => {
    expect(presentManualPaymentStatus('PAID')).toMatchObject({ value: 'PAID', label: 'Paid', tone: 'success', known: true });
    expect(presentManualPaymentStatus('future_state')).toMatchObject({ value: null, label: 'Unknown payment status', known: false });
  });

  it('drops evidence hashes from UI models', () => {
    const evidence = mapManualPaymentEvidence({ id: '1', fileName: 'proof.pdf', contentType: 'application/pdf', fileSize: 10,
      sha256: 'sensitive-internal-hash', scanStatus: 'CLEAN', submissionVersion: 1, uploadedAt: 'now' } as Parameters<typeof mapManualPaymentEvidence>[0] & { sha256: string });
    expect(evidence).not.toHaveProperty('sha256');
  });

  it('normalizes nullable response collections', () => {
    const access = mapRecipientManualPaymentAccess({ ...recipientAccess(), evidence: null });
    const queue = mapManualPaymentQueue({ ...manualPaymentQueue(), items: null });
    const detail = mapManualPaymentDetail({ ...manualPaymentDetail(), evidence: null, history: null, allowedActions: null });
    expect(access.evidence).toEqual([]); expect(queue.items).toEqual([]);
    expect(detail.evidence).toEqual([]); expect(detail.history).toEqual([]); expect(detail.allowedActions).toEqual([]);
  });
});
