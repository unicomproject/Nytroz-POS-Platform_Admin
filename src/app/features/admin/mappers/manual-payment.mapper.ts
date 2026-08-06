import {
  ManualPaymentDetail,
  ManualPaymentEvidence,
  ManualPaymentHistory,
  ManualPaymentQueue,
  ManualPaymentStatus,
  ManualPaymentStatusPresentation,
  RecipientManualPaymentAccess,
  manualPaymentStatuses
} from '../models/manual-payment.model';

export interface ManualPaymentEvidenceApiDto extends ManualPaymentEvidence {
}

export interface RecipientManualPaymentAccessApiDto extends Omit<RecipientManualPaymentAccess, 'evidence'> {
  evidence: ManualPaymentEvidenceApiDto[] | null;
}

export interface ManualPaymentQueueApiDto extends Omit<ManualPaymentQueue, 'items'> {
  items: ManualPaymentQueue['items'] | null;
}

export interface ManualPaymentDetailApiDto extends Omit<ManualPaymentDetail, 'evidence' | 'history' | 'allowedActions'> {
  evidence: ManualPaymentEvidenceApiDto[] | null;
  history: ManualPaymentDetail['history'] | null;
  allowedActions: string[] | null;
}

export interface ManualPaymentHistoryApiDto extends Omit<ManualPaymentHistory, 'items'> {
  items: ManualPaymentHistory['items'] | null;
}

export function mapManualPaymentEvidence(dto: ManualPaymentEvidenceApiDto): ManualPaymentEvidence {
  return {
    id: dto.id,
    fileName: dto.fileName,
    contentType: dto.contentType,
    fileSize: dto.fileSize,
    scanStatus: dto.scanStatus,
    submissionVersion: dto.submissionVersion,
    uploadedAt: dto.uploadedAt
  };
}

export function mapRecipientManualPaymentAccess(dto: RecipientManualPaymentAccessApiDto): RecipientManualPaymentAccess {
  return { ...dto, evidence: (dto.evidence ?? []).map(mapManualPaymentEvidence) };
}

export function mapManualPaymentQueue(dto: ManualPaymentQueueApiDto): ManualPaymentQueue {
  return { ...dto, items: [...(dto.items ?? [])] };
}

export function mapManualPaymentDetail(dto: ManualPaymentDetailApiDto): ManualPaymentDetail {
  return {
    ...dto,
    evidence: (dto.evidence ?? []).map(mapManualPaymentEvidence),
    history: [...(dto.history ?? [])],
    allowedActions: [...(dto.allowedActions ?? [])]
  };
}

export function mapManualPaymentHistory(dto: ManualPaymentHistoryApiDto): ManualPaymentHistory {
  return { ...dto, items: [...(dto.items ?? [])] };
}

export function presentManualPaymentStatus(status: string | null | undefined): ManualPaymentStatusPresentation {
  const raw = status?.trim().toUpperCase() ?? '';
  const known = (manualPaymentStatuses as readonly string[]).includes(raw);
  const value = known ? (raw as ManualPaymentStatus) : null;
  const label = known ? titleCase(raw) : 'Unknown payment status';
  const tone = value === 'PAID' || value === 'NOT_REQUIRED'
    ? 'success'
    : value === 'REJECTED' || value === 'FAILED' || value === 'EXPIRED' || value === 'CANCELLED'
      ? 'danger'
      : value === 'ACTION_REQUIRED' || value === 'DEFERRED'
        ? 'warning'
        : value === 'PAYMENT_SUBMITTED' || value === 'UNDER_REVIEW'
          ? 'info'
          : 'neutral';

  return { value, raw, label, tone, known };
}

export function titleCase(value: string | null | undefined): string {
  if (!value?.trim()) return 'Not available';
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
