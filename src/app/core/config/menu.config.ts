import { platformPermissions } from './permission-keys';

export interface MenuItemConfig {
  label: string;
  path: string;
  requiresTenant: boolean;
  requiredPermission?: string;
  requiredFeature?: string;
  icon: PlatformMenuIcon;
  hasSubmenu?: boolean;
}

export interface MenuSectionConfig {
  label: string;
  items: MenuItemConfig[];
}

export type PlatformMenuIcon =
  | 'dashboard'
  | 'tenants'
  | 'subscriptions'
  | 'outlets'
  | 'tills'
  | 'users'
  | 'roles'
  | 'products'
  | 'billing'
  | 'reports'
  | 'audit'
  | 'alerts'
  | 'settings';

export const platformMenuConfig: MenuSectionConfig[] = [
  {
    label: 'Platform',
    items: [
      {
        label: 'Dashboard',
        path: '/admin/dashboard',
        requiresTenant: false,
        icon: 'dashboard',
        requiredPermission: platformPermissions.dashboardView
      },
      {
        label: 'Tenants',
        path: '/admin/tenants',
        requiresTenant: false,
        icon: 'tenants',
        hasSubmenu: true,
        requiredPermission: platformPermissions.tenantsView
      },
      {
        label: 'Subscriptions',
        path: '/admin/subscriptions',
        requiresTenant: false,
        icon: 'subscriptions',
        hasSubmenu: true,
        requiredPermission: platformPermissions.subscriptionPlansView
      },
      {
        label: 'Modules & Features',
        path: '/admin/modules',
        requiresTenant: false,
        icon: 'roles',
        requiredPermission: platformPermissions.modulesView
      },
      {
        label: 'Users',
        path: '/admin/platform-users',
        requiresTenant: false,
        icon: 'users',
        hasSubmenu: true,
        requiredPermission: platformPermissions.usersView
      },
      {
        label: 'Roles & Permissions',
        path: '/admin/roles-permissions',
        requiresTenant: false,
        icon: 'roles',
        requiredPermission: platformPermissions.permissionsView
      },
      {
        label: 'Billing',
        path: '/admin/billing',
        requiresTenant: false,
        icon: 'billing',
        hasSubmenu: true,
        requiredPermission: platformPermissions.billingView
      },
      {
        label: 'Platform Login Audit',
        path: '/admin/audit-logs',
        requiresTenant: false,
        icon: 'audit',
        requiredPermission: platformPermissions.auditView
      },
      {
        label: 'System Settings',
        path: '/admin/settings/system',
        requiresTenant: false,
        icon: 'settings',
        hasSubmenu: true,
        requiredPermission: platformPermissions.settingsView
      }
    ]
  }
];
