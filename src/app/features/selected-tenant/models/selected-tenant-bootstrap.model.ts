export type BootstrapModuleKey =
  | 'outlets'
  | 'tills'
  | 'roles'
  | 'users'
  | 'products'
  | 'online_store';

export type BootstrapModuleStatus =
  | 'NOT_STARTED'
  | 'CONFIGURED'
  | 'BLOCKED'
  | 'NOT_ENTITLED'
  | string;

export interface BootstrapTenantSummary {
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  lifecycleStatus: string;
  planName: string | null;
}

export interface BootstrapModuleStatusItem {
  moduleKey: BootstrapModuleKey | string;
  status: BootstrapModuleStatus;
  count: number;
  entitled: boolean;
  canConfigure: boolean;
  dependencyNotice: string | null;
}

export interface BootstrapSummary {
  tenant: BootstrapTenantSummary;
  modules: BootstrapModuleStatusItem[];
}

export interface KnownOutletOption {
  outletId: string;
  outletName: string;
  outletCode?: string;
}

export interface KnownRoleOption {
  roleId: string;
  roleName: string;
  roleCode?: string;
}

export interface BootstrapOutletCreateRequest {
  outletName: string;
  outletType: 'STORE' | 'WAREHOUSE';
  timezone: string;
  phone?: string;
  email?: string;
  status: 'ACTIVE';
  address: {
    addressLine1: string;
    city: string;
    countryCode: string;
    postalCode?: string;
    stateOrProvince?: string;
  };
}

export interface BootstrapOutletResponse {
  outletId: string;
  outletName: string;
  outletCode: string;
  outletType: string;
  status: string;
  timezone: string;
}

export interface BootstrapTillCreateRequest {
  outletId: string;
  tillName: string;
  tillCode: string;
}

export interface BootstrapTillResponse {
  tillId: string;
  tillName: string;
  tillCode: string;
  outletId: string;
  status: string;
  deviceBindingStatus: string;
}

export interface BootstrapRoleCreateRequest {
  roleName: string;
  description?: string;
  permissionCodes: string[];
}

export interface BootstrapRoleResponse {
  roleId: string;
  roleName: string;
  roleCode: string;
  permissionCodes: string[];
}

export interface BootstrapUserCreateRequest {
  displayName: string;
  email: string;
  phone?: string;
  roleId: string;
  outletIds?: string[];
}

export interface BootstrapUserResponse {
  userId: string;
  displayName: string;
  email: string;
  status: string;
  inviteStatus: string;
}

export interface BootstrapProductCreateRequest {
  productName: string;
  sku: string;
  sellingPrice: number;
  categoryId?: string;
  barcode?: string;
  trackInventory?: boolean;
  openingStockQuantity?: number;
  outletId?: string;
  status?: string;
}

export interface BootstrapProductResponse {
  productId: string;
  productName: string;
  sku: string;
  status: string;
}

export interface BootstrapProductImportPreviewInvalidRow {
  rowNumber: number;
  errorCode: string;
  errorDetail: string;
}

export interface BootstrapProductImportValidateResponse {
  importId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  previewInvalidRows: BootstrapProductImportPreviewInvalidRow[];
}

export interface BootstrapProductImportCommitResponse {
  importId: string;
  committedRows: number;
  skippedRows: number;
}

export type OnlineStoreStatus = 'DRAFT' | 'ACTIVE';
export type OnlineStoreTaxDisplayMode = 'MATCH_TENANT';

export interface BootstrapOnlineStoreUpsertRequest {
  storeStatus: OnlineStoreStatus;
  taxDisplayMode?: OnlineStoreTaxDisplayMode;
}

export interface BootstrapOnlineStoreResponse {
  entitled: boolean;
  storeStatus: string;
  taxDisplayMode: string;
  clickCollectEntitled: boolean;
  clickCollectConfigured: boolean;
  dependencyNotice: string | null;
}

/** Raw API DTO — backend record uses Id/Name/Code; docs may use tenantId naming. */
export interface BootstrapSummaryApiDto {
  tenant: {
    tenantId?: string;
    id?: string;
    tenantName?: string;
    name?: string;
    tenantCode?: string;
    code?: string;
    lifecycleStatus: string;
    planName?: string | null;
  };
  modules: Array<{
    moduleKey: string;
    status: string;
    count: number;
    entitled: boolean;
    canConfigure: boolean;
    dependencyNotice?: string | null;
  }>;
}

export function mapBootstrapSummary(dto: BootstrapSummaryApiDto): BootstrapSummary {
  const t = dto.tenant;
  return {
    tenant: {
      tenantId: t.tenantId ?? t.id ?? '',
      tenantName: t.tenantName ?? t.name ?? '',
      tenantCode: t.tenantCode ?? t.code ?? '',
      lifecycleStatus: t.lifecycleStatus,
      planName: t.planName ?? null
    },
    modules: (dto.modules ?? []).map((module) => ({
      moduleKey: module.moduleKey,
      status: module.status,
      count: module.count,
      entitled: module.entitled,
      canConfigure: module.canConfigure,
      dependencyNotice: module.dependencyNotice ?? null
    }))
  };
}
