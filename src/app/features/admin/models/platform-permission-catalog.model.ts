export interface PermissionCatalogTreeResponse {
  modules: PermissionCatalogModule[];
}

export interface PermissionCatalogModule {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  scope: string;
  sortOrder: number;
  isActive: boolean;
  features: PermissionCatalogFeature[];
}

export interface PermissionCatalogFeature {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  entitlementKey?: string | null;
  sortOrder: number;
  isActive: boolean;
  permissions: PermissionCatalogPermission[];
}

export interface PermissionCatalogPermission {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  action?: string | null;
  scope: string;
  sortOrder: number;
  isActive: boolean;
  source: string;
}

export type PermissionCatalogScopeFilter = '' | 'platform' | 'tenant' | 'pos';
