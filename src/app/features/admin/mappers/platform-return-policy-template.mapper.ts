import {
  ReturnPolicyTemplateDetail,
  ReturnPolicyTemplateDraft,
  ReturnPolicyTemplateListQuery,
  ReturnPolicyTemplateListResponse,
  ReturnPolicyTemplateSummary
} from '../models/platform-return-policy-template.model';

export interface ReturnPolicyTemplateApiDto {
  id: string;
  templateCode: string;
  name: string;
  returnWindowDays: number | null;
  status: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface ReturnPolicyTemplateListResponseApiDto {
  items: ReturnPolicyTemplateApiDto[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

export function mapReturnPolicyTemplateSummary(dto: ReturnPolicyTemplateApiDto): ReturnPolicyTemplateSummary {
  return {
    id: dto.id,
    templateCode: dto.templateCode,
    name: dto.name,
    returnWindowDays: dto.returnWindowDays,
    status: dto.status,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt
  };
}

export function mapReturnPolicyTemplateDetail(dto: ReturnPolicyTemplateApiDto): ReturnPolicyTemplateDetail {
  return mapReturnPolicyTemplateSummary(dto);
}

export function mapReturnPolicyTemplateListResponse(
  dto: ReturnPolicyTemplateListResponseApiDto | null | undefined,
  query: ReturnPolicyTemplateListQuery
): ReturnPolicyTemplateListResponse {
  const data = dto ?? { items: [], pageNumber: query.pageNumber, pageSize: query.pageSize, totalCount: 0 };
  const totalPages = Math.max(1, Math.ceil(data.totalCount / Math.max(1, data.pageSize)));

  return {
    items: (data.items ?? []).map(mapReturnPolicyTemplateSummary),
    pageNumber: data.pageNumber,
    pageSize: data.pageSize,
    totalCount: data.totalCount,
    totalPages
  };
}

export function mapCreateReturnPolicyTemplateRequest(draft: ReturnPolicyTemplateDraft): Record<string, unknown> {
  return mapMutationReturnPolicyTemplateRequest(draft);
}

export function mapUpdateReturnPolicyTemplateRequest(draft: ReturnPolicyTemplateDraft): Record<string, unknown> {
  return mapMutationReturnPolicyTemplateRequest(draft);
}

function mapMutationReturnPolicyTemplateRequest(draft: ReturnPolicyTemplateDraft): Record<string, unknown> {
  return {
    templateCode: draft.templateCode.trim(),
    name: draft.name.trim(),
    returnWindowDays: draft.returnWindowDays,
    status: draft.status
  };
}

export function mapReturnPolicyTemplateListQueryParams(query: ReturnPolicyTemplateListQuery): Record<string, string> {
  const params: Record<string, string> = {
    pageNumber: String(query.pageNumber),
    pageSize: String(query.pageSize)
  };

  if (query.search?.trim()) {
    params['search'] = query.search.trim();
  }

  return params;
}
