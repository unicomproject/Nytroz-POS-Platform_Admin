export interface PlatformModulesCatalogFeature {
  id: string;
  featureCode: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: string;
}

export interface PlatformModulesCatalogModule {
  id: string;
  moduleCode: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: string;
  features: PlatformModulesCatalogFeature[];
}

export interface PlatformModulesCatalogResponse {
  modules: PlatformModulesCatalogModule[];
}
