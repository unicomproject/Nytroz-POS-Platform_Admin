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
    userPasswordReset: (userId: string) => `/platform-admin/users/${userId}/password-reset`,
    settings: '/platform-admin/settings',
    returnPolicyTemplates: '/platform/return-policy-templates',
    returnPolicyTemplate: (templateId: string) => `/platform/return-policy-templates/${templateId}`,
    bootstrap: {
      summary: (tenantId: string) => `/platform-admin/tenants/${tenantId}/bootstrap/summary`,
      outletOptions: (tenantId: string) =>
        `/platform-admin/tenants/${tenantId}/bootstrap/options/outlets`,
      roleOptions: (tenantId: string) =>
        `/platform-admin/tenants/${tenantId}/bootstrap/options/roles`,
      permissionOptions: (tenantId: string) =>
        `/platform-admin/tenants/${tenantId}/bootstrap/options/permissions`,
      outlets: (tenantId: string) => `/platform-admin/tenants/${tenantId}/bootstrap/outlets`,
      tills: (tenantId: string) => `/platform-admin/tenants/${tenantId}/bootstrap/tills`,
      roles: (tenantId: string) => `/platform-admin/tenants/${tenantId}/bootstrap/roles`,
      users: (tenantId: string) => `/platform-admin/tenants/${tenantId}/bootstrap/users`,
      products: (tenantId: string) => `/platform-admin/tenants/${tenantId}/bootstrap/products`,
      importTemplate: (tenantId: string) =>
        `/platform-admin/tenants/${tenantId}/bootstrap/products/import/template`,
      importValidate: (tenantId: string) =>
        `/platform-admin/tenants/${tenantId}/bootstrap/products/import/validate`,
      importCommit: (tenantId: string, importId: string) =>
        `/platform-admin/tenants/${tenantId}/bootstrap/products/import/${importId}/commit`,
      importErrors: (tenantId: string, importId: string) =>
        `/platform-admin/tenants/${tenantId}/bootstrap/products/import/${importId}/errors.csv`,
      onlineStore: (tenantId: string) => `/platform-admin/tenants/${tenantId}/bootstrap/online-store`
    }
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
