export interface CurrentUser {
  id: string;
  displayName: string;
  email: string;
  platformPermissions: string[];
  tenantPermissions: string[];
  featureEntitlements: string[];
}
