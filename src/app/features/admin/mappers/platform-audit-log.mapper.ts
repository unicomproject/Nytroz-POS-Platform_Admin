import {
  PlatformAuditLogItem,
  PlatformAuditLogListQuery,
  PlatformAuditLogListResponse
} from '../models/platform-audit-log.model';

export interface PlatformAuditLogActorApiDto {
  platformUserId?: string | null;
  email?: string | null;
}

export interface PlatformAuditLogItemApiDto {
  id: string;
  occurredAt: string;
  actor: PlatformAuditLogActorApiDto;
  action: string;
  area: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface PlatformAuditLogListResponseApiDto {
  auditScope: string;
  auditScopeDescription: string;
  items: PlatformAuditLogItemApiDto[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function mapPlatformAuditLogListResponse(
  dto: PlatformAuditLogListResponseApiDto | null | undefined,
  fallbackQuery?: PlatformAuditLogListQuery
): PlatformAuditLogListResponse {
  if (!dto) {
    return {
      auditScope: 'platform_login_security',
      auditScopeDescription: '',
      items: [],
      pageNumber: fallbackQuery?.pageNumber ?? 1,
      pageSize: fallbackQuery?.pageSize ?? 20,
      totalCount: 0,
      totalPages: 0
    };
  }

  return {
    auditScope: dto.auditScope,
    auditScopeDescription: dto.auditScopeDescription,
    items: (dto.items ?? []).map(mapPlatformAuditLogItem),
    pageNumber: dto.pageNumber,
    pageSize: dto.pageSize,
    totalCount: dto.totalCount,
    totalPages: dto.totalPages
  };
}

export function mapPlatformAuditLogItem(dto: PlatformAuditLogItemApiDto): PlatformAuditLogItem {
  return {
    id: String(dto.id),
    occurredAt: dto.occurredAt,
    actor: {
      platformUserId: dto.actor?.platformUserId ?? null,
      email: dto.actor?.email ?? null
    },
    action: dto.action,
    area: dto.area,
    entityType: dto.entityType,
    entityId: dto.entityId ?? null,
    summary: dto.summary,
    ipAddress: dto.ipAddress ?? null,
    userAgent: dto.userAgent ?? null
  };
}

export function mapPlatformAuditLogListQueryParams(query: PlatformAuditLogListQuery): Record<string, string> {
  const params: Record<string, string> = {};

  if (query.pageNumber) {
    params['pageNumber'] = String(query.pageNumber);
  }

  if (query.pageSize) {
    params['pageSize'] = String(query.pageSize);
  }

  if (query.search?.trim()) {
    params['search'] = query.search.trim();
  }

  if (query.action?.trim()) {
    params['action'] = query.action.trim();
  }

  if (query.from?.trim()) {
    params['from'] = query.from.trim();
  }

  if (query.to?.trim()) {
    params['to'] = query.to.trim();
  }

  return params;
}
