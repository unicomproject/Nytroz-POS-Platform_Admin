export interface PlatformAuditLogActor {
  platformUserId: string | null;
  email: string | null;
}

export interface PlatformAuditLogItem {
  id: string;
  occurredAt: string;
  actor: PlatformAuditLogActor;
  action: string;
  area: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface PlatformAuditLogListResponse {
  auditScope: string;
  auditScopeDescription: string;
  items: PlatformAuditLogItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PlatformAuditLogListQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  from?: string;
  to?: string;
}
