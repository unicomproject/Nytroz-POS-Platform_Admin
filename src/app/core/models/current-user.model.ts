export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  status: string;
  platformPermissions?: string[];
  tenantPermissions?: string[];
  featureEntitlements?: string[];
}
