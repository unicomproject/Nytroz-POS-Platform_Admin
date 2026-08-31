export interface PlatformModulesCatalogPermission {
  id: string;
  permissionCode: string;
  name: string;
  description: string | null;
  actionType: string;
  scope: string;
  isActive: boolean;
}

export interface PlatformModulesCatalogFeature {
  id: string;
  featureCode: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: string;
  scope: string;
  permissions: PlatformModulesCatalogPermission[];
}

export interface PlatformModulesCatalogModule {
  id: string;
  moduleCode: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: string;
  scope: string;
  features: PlatformModulesCatalogFeature[];
}

export interface PlatformModulesCatalogResponse {
  modules: PlatformModulesCatalogModule[];
}

