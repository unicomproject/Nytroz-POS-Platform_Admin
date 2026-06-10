import { catalogPermissions, platformPermissions, reportPermissions, tenantPermissions } from './permission-keys';
import { featureKeys } from './feature-keys';

export interface MenuItemConfig {
  label: string;
  path: string;
  requiresTenant: boolean;
  requiredPermission?: string;
  requiredFeature?: string;
}

export interface MenuSectionConfig {
  label: string;
  items: MenuItemConfig[];
}

export const platformMenuConfig: MenuSectionConfig[] = [
  {
    label: 'Platform',
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', requiresTenant: false },
      { label: 'Tenants', path: '/admin/tenants', requiresTenant: false, requiredPermission: platformPermissions.tenantUpdate },
      {
        label: 'Subscription Plans',
        path: '/admin/subscriptions',
        requiresTenant: false,
        requiredPermission: platformPermissions.subscriptionManage
      },
      {
        label: 'Modules and Features',
        path: '/admin/modules',
        requiresTenant: false,
        requiredPermission: platformPermissions.featureEntitle
      },
      {
        label: 'Platform Users',
        path: '/admin/platform-users',
        requiresTenant: false,
        requiredPermission: platformPermissions.tenantUpdate
      },
      {
        label: 'System Settings',
        path: '/admin/settings/system',
        requiresTenant: false,
        requiredPermission: platformPermissions.tenantUpdate
      },
      { label: 'Audit Logs', path: '/admin/audit-logs', requiresTenant: false, requiredPermission: platformPermissions.auditView }
    ]
  }
];

export const tenantMenuConfig: MenuSectionConfig[] = [
  {
    label: 'Selected Tenant',
    items: [
      { label: 'Tenant Users', path: '/admin/tenant/:tenantId/users', requiresTenant: true, requiredPermission: tenantPermissions.userManage },
      {
        label: 'Roles and Permissions',
        path: '/admin/tenant/:tenantId/roles-permissions',
        requiresTenant: true,
        requiredPermission: tenantPermissions.roleManage
      },
      { label: 'Outlets', path: '/admin/tenant/:tenantId/outlets', requiresTenant: true, requiredPermission: tenantPermissions.outletManage },
      { label: 'Tills', path: '/admin/tenant/:tenantId/tills', requiresTenant: true, requiredPermission: tenantPermissions.tillManage },
      {
        label: 'Products',
        path: '/admin/tenant/:tenantId/products',
        requiresTenant: true,
        requiredPermission: catalogPermissions.productView,
        requiredFeature: featureKeys.productCatalog
      },
      {
        label: 'Categories',
        path: '/admin/tenant/:tenantId/categories',
        requiresTenant: true,
        requiredPermission: catalogPermissions.categoryView,
        requiredFeature: featureKeys.categories
      },
      {
        label: 'Reports',
        path: '/admin/tenant/:tenantId/reports',
        requiresTenant: true,
        requiredPermission: reportPermissions.reportView,
        requiredFeature: featureKeys.reports
      },
      { label: 'Tenant Settings', path: '/admin/tenant/:tenantId/settings', requiresTenant: true, requiredPermission: tenantPermissions.userManage }
    ]
  }
];
