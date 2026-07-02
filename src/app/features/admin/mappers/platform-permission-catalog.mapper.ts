import {
  PermissionCatalogFeature,
  PermissionCatalogModule,
  PermissionCatalogPermission,
  PermissionCatalogTreeResponse
} from '../models/platform-permission-catalog.model';

export interface PlatformPermissionCatalogApiDto {
  modules: PlatformPermissionCatalogModuleApiDto[];
}

export interface PlatformPermissionCatalogModuleApiDto {
  key: string;
  name: string;
  description?: string | null;
  features: PlatformPermissionCatalogFeatureApiDto[];
}

export interface PlatformPermissionCatalogFeatureApiDto {
  key: string;
  name: string;
  description?: string | null;
  permissions: PlatformPermissionCatalogPermissionApiDto[];
}

export interface PlatformPermissionCatalogPermissionApiDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: string;
  isSystem: boolean;
  isBootstrap: boolean;
}

export function mapPermissionCatalogTree(
  dto: PlatformPermissionCatalogApiDto | null | undefined
): PermissionCatalogTreeResponse {
  const modules = (dto?.modules ?? []).map((module, moduleIndex) => mapPermissionCatalogModule(module, moduleIndex));

  return { modules };
}

function mapPermissionCatalogModule(
  dto: PlatformPermissionCatalogModuleApiDto,
  moduleIndex: number
): PermissionCatalogModule {
  return {
    id: dto.key,
    code: dto.key,
    name: dto.name,
    description: dto.description ?? null,
    scope: 'platform',
    sortOrder: moduleIndex + 1,
    isActive: true,
    features: (dto.features ?? []).map((feature, featureIndex) =>
      mapPermissionCatalogFeature(dto.key, feature, featureIndex)
    )
  };
}

function mapPermissionCatalogFeature(
  moduleKey: string,
  dto: PlatformPermissionCatalogFeatureApiDto,
  featureIndex: number
): PermissionCatalogFeature {
  return {
    id: `${moduleKey}:${dto.key}`,
    code: dto.key,
    name: dto.name,
    description: dto.description ?? null,
    entitlementKey: null,
    sortOrder: featureIndex + 1,
    isActive: true,
    permissions: (dto.permissions ?? []).map((permission, permissionIndex) =>
      mapPermissionCatalogPermission(permission, permissionIndex)
    )
  };
}

function mapPermissionCatalogPermission(
  dto: PlatformPermissionCatalogPermissionApiDto,
  permissionIndex: number
): PermissionCatalogPermission {
  const action = derivePermissionAction(dto.code);

  return {
    id: String(dto.id),
    code: dto.code,
    name: dto.name,
    description: dto.description ?? null,
    action,
    scope: 'platform',
    sortOrder: permissionIndex + 1,
    isActive: !isInactiveStatus(dto.status),
    source: dto.isSystem ? 'system' : 'custom'
  };
}

function derivePermissionAction(code: string): string {
  const parts = code.split('.');
  return parts[parts.length - 1] ?? code;
}

function isInactiveStatus(status: string): boolean {
  return status.trim().toLowerCase() === 'inactive';
}
