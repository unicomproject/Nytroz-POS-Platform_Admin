export const apiEndpoints = {
  auth: {
    login: '/auth/platform-login',
    logout: '/auth/platform-logout',
    refresh: '/auth/platform-refresh',
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
    features: '/features',
    auditLogs: '/platform-admin/audit-logs',
    billing: {
      summary: '/platform-admin/billing/summary',
      invoices: '/platform-admin/billing/invoices',
      invoice: (invoiceId: string) => `/platform-admin/billing/invoices/${invoiceId}`,
      invoicePayments: (invoiceId: string) =>
        `/platform-admin/billing/invoices/${invoiceId}/payments`,
      filterOptions: '/platform-admin/billing/filter-options',
      issueInvoice: (invoiceId: string) => `/platform-admin/billing/invoices/${invoiceId}/issue`,
      markInvoicePaid: (invoiceId: string) =>
        `/platform-admin/billing/invoices/${invoiceId}/mark-paid`,
      manualPayments: '/platform-admin/billing/manual-payments',
      manualPayment: (paymentId: string) => `/platform-admin/billing/manual-payments/${paymentId}`,
      manualPaymentProof: (paymentId: string, evidenceId: string) =>
        `/platform-admin/billing/manual-payments/${paymentId}/proof/${evidenceId}`,
      manualPaymentReview: (paymentId: string) =>
        `/platform-admin/billing/manual-payments/${paymentId}/review`,
      manualPaymentHistory: (paymentId: string) =>
        `/platform-admin/billing/manual-payments/${paymentId}/history`,
      manualPaymentNotificationResend: (paymentId: string) =>
        `/platform-admin/billing/manual-payments/${paymentId}/notification/resend`,
    },
    users: '/platform-admin/users',
    settings: '/platform-admin/settings',
    returnPolicyTemplates: '/platform/return-policy-templates',
    returnPolicyTemplate: (templateId: string) => `/platform/return-policy-templates/${templateId}`,
  },
  tenant: {
    users: '/users',
    roles: '/roles',
    permissions: '/permissions',
    outlets: '/outlets',
    tills: '/tills',
    products: '/products',
    categories: '/categories',
    reports: '/reports',
  },
  paymentAccess: (accessToken: string) =>
    `/tenant-onboarding/payment-access/${encodeURIComponent(accessToken)}`,
} as const;

export const tenantScopedApiSegments = [
  '/users',
  '/roles',
  '/permissions',
  '/outlets',
  '/tills',
  '/products',
  '/categories',
  '/reports',
];
