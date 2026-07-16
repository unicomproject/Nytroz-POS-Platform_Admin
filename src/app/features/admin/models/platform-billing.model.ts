export type PlatformBillingDateField = 'issuedAt' | 'dueAt';

export type PlatformBillingSortDirection = 'asc' | 'desc';

export type PlatformBillingSortField =
  | 'createdAt'
  | 'invoiceNumber'
  | 'tenant'
  | 'amount'
  | 'status'
  | 'issuedAt'
  | 'dueAt';

export type PlatformBillingStoredStatus = 'DRAFT' | 'PENDING' | 'PAID';
export type PlatformBillingDisplayStatus = PlatformBillingStoredStatus | 'OVERDUE';

export interface PlatformBillingQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  tenantId?: string;
  status?: PlatformBillingDisplayStatus;
  dateFrom?: string;
  dateTo?: string;
  dateField?: PlatformBillingDateField;
  sortBy?: PlatformBillingSortField;
  sortDirection?: PlatformBillingSortDirection;
}

export interface PlatformBillingCurrencySummary {
  currencyCode: string;
  paidRevenue: number;
  outstandingAmount: number;
  overdueAmount: number;
  invoiceCount: number;
}

export interface PlatformBillingSummary {
  currencies: PlatformBillingCurrencySummary[];
  totalInvoices: number;
  generatedAt: string;
}

export interface PlatformBillingInvoiceListItem {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  subscriptionId: string;
  subscriptionStatus: string;
  planId: string;
  planCode: string;
  planName: string;
  currencyCode: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  storedStatus: PlatformBillingStoredStatus;
  displayStatus: PlatformBillingDisplayStatus;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  canIssue: boolean;
  canMarkPaid: boolean;
}

export interface PlatformBillingInvoiceList {
  items: PlatformBillingInvoiceListItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PlatformBillingInvoiceLine {
  id: string;
  lineNumber: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface PlatformBillingPaymentTransaction {
  id: string;
  providerName: string;
  providerTransactionId: string;
  status: string;
  currencyCode: string;
  amount: number;
  providerFee: number;
  netAmount: number;
  paidAt: string | null;
  createdAt: string;
}

export interface PlatformBillingInvoiceDetail {
  invoice: PlatformBillingInvoiceListItem;
  invoiceType: string;
  billingCycle: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  lines: PlatformBillingInvoiceLine[];
  payments: PlatformBillingPaymentTransaction[];
}

export interface PlatformBillingTenantFilterOption {
  id: string;
  code: string;
  name: string;
}

export type PlatformBillingStatusFilterOption = PlatformBillingDisplayStatus;

export interface PlatformBillingFilterOptions {
  tenants: PlatformBillingTenantFilterOption[];
  statuses: PlatformBillingStatusFilterOption[];
}

export interface PlatformBillingIssueRequest {
  expectedUpdatedAt: string;
}

export interface PlatformBillingMarkPaidRequest {
  expectedUpdatedAt: string;
  paidAt?: string;
}

export type PlatformBillingMutationResponse = PlatformBillingInvoiceListItem;
