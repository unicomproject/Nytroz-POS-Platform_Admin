import {
  PlatformModulesCatalogFeature,
  PlatformModulesCatalogModule,
  PlatformModulesCatalogResponse
} from '../models/platform-modules-catalog.model';

export interface PlatformModulesCatalogFeatureApiDto {
  id: string;
  featureCode: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  status: string;
}

export interface PlatformModulesCatalogModuleApiDto {
  id: string;
  moduleCode: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  status: string;
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
    status: dto.status
  };
}
