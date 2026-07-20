export type ReturnPolicyTemplateStatus = 'ACTIVE' | 'INACTIVE';

export interface ReturnPolicyTemplateSummary {
  id: string;
  templateCode: string;
  name: string;
  returnWindowDays: number | null;
  status: ReturnPolicyTemplateStatus | string;
  createdAt: string;
  updatedAt: string | null;
}

export interface ReturnPolicyTemplateDetail extends ReturnPolicyTemplateSummary {}

export interface ReturnPolicyTemplateListQuery {
  pageNumber: number;
  pageSize: number;
  search?: string;
}

export interface ReturnPolicyTemplateListResponse {
  items: ReturnPolicyTemplateSummary[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ReturnPolicyTemplateDraft {
  templateCode: string;
  name: string;
  returnWindowDays: number | null;
  status: ReturnPolicyTemplateStatus;
}

export const returnPolicyTemplateStatusOptions: { value: ReturnPolicyTemplateStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' }
];
