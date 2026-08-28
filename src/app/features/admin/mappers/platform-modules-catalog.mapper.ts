import {
  PlatformModulesCatalogFeature,
  PlatformModulesCatalogModule,
  PlatformModulesCatalogPermission,
  PlatformModulesCatalogResponse
} from '../models/platform-modules-catalog.model';

export interface PlatformModulesCatalogPermissionApiDto {
  id: string;
  permissionCode: string;
  name: string;
  description?: string | null;
  actionType: string;
  scope?: string | null;
  isActive?: boolean | null;
}

export interface PlatformModulesCatalogFeatureApiDto {
  id: string;
  featureCode: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  status: string;
  scope?: string | null;
  permissions?: PlatformModulesCatalogPermissionApiDto[] | null;
}

export interface PlatformModulesCatalogModuleApiDto {
  id: string;
  moduleCode: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  status: string;
  scope?: string | null;
  features: PlatformModulesCatalogFeatureApiDto[];
}

export interface PlatformModulesCatalogResponseApiDto {
  modules: PlatformModulesCatalogModuleApiDto[];
}

export function mapPlatformModulesCatalogResponse(
  dto: PlatformModulesCatalogResponseApiDto | null | undefined
): PlatformModulesCatalogResponse {
  return {
    modules: (dto?.modules ?? []).map(mapPlatformModulesCatalogModule)
  };
}

export function mapPlatformModulesCatalogModule(
  dto: PlatformModulesCatalogModuleApiDto
): PlatformModulesCatalogModule {
  return {
    id: String(dto.id),
    moduleCode: dto.moduleCode,
    name: dto.name,
    description: dto.description ?? null,
    sortOrder: dto.sortOrder,
    status: dto.status,
    scope: dto.scope ?? 'TENANT',
    features: (dto.features ?? []).map(mapPlatformModulesCatalogFeature)
  };
}

export function mapPlatformModulesCatalogFeature(
  dto: PlatformModulesCatalogFeatureApiDto
): PlatformModulesCatalogFeature {
  return {
    id: String(dto.id),
    featureCode: dto.featureCode,
    name: dto.name,
    description: dto.description ?? null,
    sortOrder: dto.sortOrder,
    status: dto.status,
    scope: dto.scope ?? 'TENANT',
    permissions: (dto.permissions ?? []).map(mapPlatformModulesCatalogPermission)
  };
}

export function mapPlatformModulesCatalogPermission(
  dto: PlatformModulesCatalogPermissionApiDto
): PlatformModulesCatalogPermission {
  return {
    id: String(dto.id),
    permissionCode: dto.permissionCode,
    name: dto.name,
    description: dto.description ?? null,
    actionType: dto.actionType,
    scope: dto.scope ?? 'TENANT',
    isActive: dto.isActive ?? true
  };
}

