export interface PermissionMapItem {
  code: string;
  name: string;
  actionType: string;
  scope: string;
  isActive: boolean;
}

export interface TechnicalFeatureMapItem {
  id: string;
  code: string;
  name: string;
  scope: string;
  isActive: boolean;
  commercialClassification: string;
  isPlanEligible: boolean;
  permissions: PermissionMapItem[];
}

export interface TechnicalModuleMapItem {
  code: string;
  name: string;
  scope: string;
  features: TechnicalFeatureMapItem[];
}

export interface BusinessCapabilityMapItem {
  code: string;
  name: string;
  description: string;
  commercialClassification: string;
  mappedTechnicalFeatureCodes: string[];
}

export interface BusinessModuleMapItem {
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  releaseCode: string;
  currentR1Status: string;
  commercialState: string;
  capabilities: BusinessCapabilityMapItem[];
  technicalModules: TechnicalModuleMapItem[];
}

export interface BusinessCapabilityMapSummary {
  businessModuleCount: number;
  businessCapabilityCount: number;
  technicalModuleCount: number;
  technicalFeatureCount: number;
  tenantPermissionCount: number;
}

export interface BusinessCapabilityMapResponse {
  release: string;
  catalogVersion: string;
  summary: BusinessCapabilityMapSummary;
  businessModules: BusinessModuleMapItem[];
}
