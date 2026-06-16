export const apiEndpoints = {
  auth: {
    login: '/auth/platform-login',
    logout: '/auth/logout',
    refresh: '/auth/refresh'
  },
  platform: {
    dashboard: '/platform-admin/dashboard',
    tenants: '/tenants',
    subscriptions: '/subscriptions',
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
