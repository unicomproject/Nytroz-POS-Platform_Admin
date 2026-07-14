export const apiEndpoints = {
  auth: {
    login: '/auth/platform-login',
    logout: '/auth/platform-logout',
    refresh: '/auth/platform-refresh'
  },
  platform: {
    dashboard: '/platform-admin/dashboard',
    permissionCatalog: '/platform-admin/permission-catalog',
    permissionCatalogFlat: '/platform-admin/permission-catalog/flat',
    roles: '/platform-admin/roles',
    tenants: '/platform-admin/tenants',
    tenantCreateOptions: '/platform-admin/tenants/create-options',
    tenantSummary: '/platform-admin/tenants/summary',
    tenantFilterOptions: '/platform-admin/tenants/filter-options',
    modulesCatalog: '/platform-admin/catalog/modules',
    subscriptionPlans: '/platform/subscription-plans',
    users: '/platform-admin/users'
    features: '/features',
    auditLogs: '/platform-admin/audit-logs',
    users: '/platform-admin/users',
    settings: '/platform-admin/settings'
  },
  tenant: {
    users: '/users',
    roles: '/roles',
    permissions: '/permissions',
    outlets: '/outlets',
    tills: '/tills',
    products: '/products',
    categories: '/categories',
    reports: '/reports'
  }
} as const;

export const tenantScopedApiSegments = [
  '/users',
  '/roles',
  '/permissions',
  '/outlets',
  '/tills',
  '/products',
  '/categories',
  '/reports'
];
