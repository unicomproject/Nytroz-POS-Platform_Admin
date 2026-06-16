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
      { label: 'Dashboard', path: '/admin/dashboard', requiresTenant: false, icon: 'dashboard' },
      { label: 'Tenants', path: '/admin/tenants', requiresTenant: false, icon: 'tenants', hasSubmenu: true },
      {
        label: 'Subscriptions',
        path: '/admin/subscriptions',
        requiresTenant: false,
        icon: 'subscriptions',
        hasSubmenu: true
      },
      { label: 'Outlets', path: '/admin/outlets', requiresTenant: false, icon: 'outlets' },
      { label: 'Tills & Devices', path: '/admin/tills-devices', requiresTenant: false, icon: 'tills' },
      { label: 'Users', path: '/admin/platform-users', requiresTenant: false, icon: 'users', hasSubmenu: true },
      { label: 'Roles & Permissions', path: '/admin/roles-permissions', requiresTenant: false, icon: 'roles' },
      { label: 'Products', path: '/admin/products', requiresTenant: false, icon: 'products' },
      { label: 'Billing', path: '/admin/billing', requiresTenant: false, icon: 'billing', hasSubmenu: true },
      { label: 'Reports', path: '/admin/reports', requiresTenant: false, icon: 'reports', hasSubmenu: true },
      { label: 'Audit Logs', path: '/admin/audit-logs', requiresTenant: false, icon: 'audit' },
      { label: 'Alerts Center', path: '/admin/alerts', requiresTenant: false, icon: 'alerts' },
      {
        label: 'System Settings',
        path: '/admin/settings/system',
        requiresTenant: false,
        icon: 'settings',
        hasSubmenu: true
      }
    ]
  }
];
