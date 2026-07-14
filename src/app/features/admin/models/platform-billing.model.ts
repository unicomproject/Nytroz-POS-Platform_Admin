export interface BillingCurrencySummary { currencyCode: string; paidRevenue: number; outstandingAmount: number; overdueAmount: number; invoiceCount: number; }
export interface BillingSummary { currencies: BillingCurrencySummary[]; totalInvoices: number; generatedAt: string; }
export interface BillingInvoice {
  id: string; invoiceNumber: string; tenantId: string; tenantCode: string; tenantName: string;
  subscriptionId: string; subscriptionStatus: string; planId: string; planCode: string; planName: string;
  currencyCode: string; totalAmount: number; paidAmount: number; balanceDue: number; storedStatus: string;
  displayStatus: string; issuedAt: string | null; dueAt: string | null; paidAt: string | null;
  createdAt: string; updatedAt: string; canIssue: boolean; canMarkPaid: boolean;
}
export interface BillingInvoiceList { items: BillingInvoice[]; pageNumber: number; pageSize: number; totalCount: number; totalPages: number; }
export interface BillingLine { id: string; lineNumber: string; description: string; quantity: number; unitPrice: number; discountAmount: number; taxAmount: number; lineTotal: number; }
export interface BillingPayment { id: string; providerName: string; providerTransactionId: string; status: string; currencyCode: string; amount: number; providerFee: number; netAmount: number; paidAt: string | null; createdAt: string; }
export interface BillingInvoiceDetail { invoice: BillingInvoice; invoiceType: string; billingCycle: string | null; billingPeriodStart: string | null; billingPeriodEnd: string | null; subtotalAmount: number; discountAmount: number; taxAmount: number; lines: BillingLine[]; payments: BillingPayment[]; }
export interface BillingTenantOption { id: string; code: string; name: string; }
export interface BillingFilterOptions { tenants: BillingTenantOption[]; statuses: string[]; }
export interface BillingQuery { pageNumber: number; pageSize: number; search?: string; tenantId?: string; status?: string; dateFrom?: string; dateTo?: string; dateField: 'issuedAt' | 'dueAt'; sortBy: string; sortDirection: 'asc' | 'desc'; }
