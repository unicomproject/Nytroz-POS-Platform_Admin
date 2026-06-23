export const apiEndpoints = {
  auth: {
    login: '/auth/platform-login',
    logout: '/auth/logout',
    refresh: '/auth/refresh'
  },
  platform: {
    dashboard: '/platform-admin/dashboard',
    permissionCatalog: '/platform-admin/permission-catalog',
    permissionCatalogFlat: '/platform-admin/permission-catalog/flat',
    roles: '/platform-admin/roles',
    tenants: '/platform-admin/tenants',
    tenantSummary: '/platform-admin/tenants/summary',
    tenantFilterOptions: '/platform-admin/tenants/filter-options',
    subscriptionPlans: '/platform/subscription-plans',
    features: '/features',
    auditLogs: '/platform/audit-logs',
    users: '/platform/users',
    settings: '/platform/settings'
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
