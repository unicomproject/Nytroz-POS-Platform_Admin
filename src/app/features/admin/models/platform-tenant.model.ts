export interface PlatformTenantListItem {
  id: string;
  name: string;
  email: string | null;
  ownerName: string | null;
  planName: string | null;
  region: string | null;
  status: string;
  userCount: number;
  outletCount: number;
  createdOn: string;
  lastActivityAt: string | null;
}

export interface PlatformTenantListResponse {
  items: PlatformTenantListItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PlatformTenantSummary {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  inactiveTenants: number;
  trialTenants: number;
}

export interface PlatformTenantFilterOptions {
  plans: string[];
  regions: string[];
  statuses: string[];
}

export interface PlatformTenantListQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  plan?: string;
  region?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}
