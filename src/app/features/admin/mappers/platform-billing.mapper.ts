import {
  PlatformBillingCurrencySummary,
  PlatformBillingDisplayStatus,
  PlatformBillingFilterOptions,
  PlatformBillingInvoiceDetail,
  PlatformBillingInvoiceLine,
  PlatformBillingInvoiceList,
  PlatformBillingInvoiceListItem,
  PlatformBillingIssueRequest,
  PlatformBillingMarkPaidRequest,
  PlatformBillingMutationResponse,
  PlatformBillingPaymentTransaction,
  PlatformBillingQuery,
  PlatformBillingStoredStatus,
  PlatformBillingSummary,
  PlatformBillingTenantFilterOption,
} from '../models/platform-billing.model';

export interface PlatformBillingCurrencySummaryApiDto {
  currencyCode: string;
  paidRevenue: number;
  outstandingAmount: number;
  overdueAmount: number;
  invoiceCount: number;
}

export interface PlatformBillingSummaryApiDto {
  currencies: PlatformBillingCurrencySummaryApiDto[] | null;
  totalInvoices: number;
  generatedAt: string;
}

export interface PlatformBillingInvoiceApiDto {
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

export interface PlatformBillingInvoiceListApiDto {
  items: PlatformBillingInvoiceApiDto[] | null;
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PlatformBillingInvoiceLineApiDto {
  id: string;
  lineNumber: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface PlatformBillingPaymentApiDto {
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

export interface PlatformBillingInvoiceDetailApiDto {
  invoice: PlatformBillingInvoiceApiDto;
  invoiceType: string;
  billingCycle: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  lines: PlatformBillingInvoiceLineApiDto[] | null;
  payments: PlatformBillingPaymentApiDto[] | null;
}

export interface PlatformBillingTenantOptionApiDto {
  id: string;
  code: string;
  name: string;
}

export interface PlatformBillingFilterOptionsApiDto {
  tenants: PlatformBillingTenantOptionApiDto[] | null;
  statuses: PlatformBillingDisplayStatus[] | null;
}

export interface PlatformBillingIssueRequestApiDto {
  expectedUpdatedAt: string;
}

export interface PlatformBillingMarkPaidRequestApiDto {
  expectedUpdatedAt: string;
  paidAt?: string;
}

export function mapPlatformBillingSummary(
  dto: PlatformBillingSummaryApiDto,
): PlatformBillingSummary {
  return {
    currencies: (dto.currencies ?? []).map(mapPlatformBillingCurrencySummary),
    totalInvoices: dto.totalInvoices,
    generatedAt: dto.generatedAt,
  };
}

export function mapPlatformBillingCurrencySummary(
  dto: PlatformBillingCurrencySummaryApiDto,
): PlatformBillingCurrencySummary {
  return { ...dto };
}

export function mapPlatformBillingInvoice(
  dto: PlatformBillingInvoiceApiDto,
): PlatformBillingInvoiceListItem {
  return { ...dto };
}

export function mapPlatformBillingInvoiceList(
  dto: PlatformBillingInvoiceListApiDto,
): PlatformBillingInvoiceList {
  return {
    items: (dto.items ?? []).map(mapPlatformBillingInvoice),
    pageNumber: dto.pageNumber,
    pageSize: dto.pageSize,
    totalCount: dto.totalCount,
    totalPages: dto.totalPages,
  };
}

export function mapPlatformBillingInvoiceLine(
  dto: PlatformBillingInvoiceLineApiDto,
): PlatformBillingInvoiceLine {
  return { ...dto };
}

export function mapPlatformBillingPayment(
  dto: PlatformBillingPaymentApiDto,
): PlatformBillingPaymentTransaction {
  return { ...dto };
}

export function mapPlatformBillingPayments(
  dtos: PlatformBillingPaymentApiDto[] | null | undefined,
): PlatformBillingPaymentTransaction[] {
  return (dtos ?? []).map(mapPlatformBillingPayment);
}

export function mapPlatformBillingInvoiceDetail(
  dto: PlatformBillingInvoiceDetailApiDto,
): PlatformBillingInvoiceDetail {
  return {
    invoice: mapPlatformBillingInvoice(dto.invoice),
    invoiceType: dto.invoiceType,
    billingCycle: dto.billingCycle,
    billingPeriodStart: dto.billingPeriodStart,
    billingPeriodEnd: dto.billingPeriodEnd,
    subtotalAmount: dto.subtotalAmount,
    discountAmount: dto.discountAmount,
    taxAmount: dto.taxAmount,
    lines: (dto.lines ?? []).map(mapPlatformBillingInvoiceLine),
    payments: mapPlatformBillingPayments(dto.payments),
  };
}

export function mapPlatformBillingTenantOption(
  dto: PlatformBillingTenantOptionApiDto,
): PlatformBillingTenantFilterOption {
  return { ...dto };
}

export function mapPlatformBillingFilterOptions(
  dto: PlatformBillingFilterOptionsApiDto,
): PlatformBillingFilterOptions {
  return {
    tenants: (dto.tenants ?? []).map(mapPlatformBillingTenantOption),
    statuses: [...(dto.statuses ?? [])],
  };
}

export function mapPlatformBillingQueryParams(query: PlatformBillingQuery): Record<string, string> {
  const params: Record<string, string> = {};

  setNumber(params, 'pageNumber', query.pageNumber);
  setNumber(params, 'pageSize', query.pageSize);
  setText(params, 'search', query.search);
  setText(params, 'tenantId', query.tenantId);
  setText(params, 'status', query.status);
  setText(params, 'dateFrom', query.dateFrom);
  setText(params, 'dateTo', query.dateTo);
  setText(params, 'dateField', query.dateField);
  setText(params, 'sortBy', query.sortBy);
  setText(params, 'sortDirection', query.sortDirection);

  return params;
}

export function mapPlatformBillingIssueRequest(
  request: PlatformBillingIssueRequest,
): PlatformBillingIssueRequestApiDto {
  return { expectedUpdatedAt: request.expectedUpdatedAt };
}

export function mapPlatformBillingMarkPaidRequest(
  request: PlatformBillingMarkPaidRequest,
): PlatformBillingMarkPaidRequestApiDto {
  return request.paidAt
    ? { expectedUpdatedAt: request.expectedUpdatedAt, paidAt: request.paidAt }
    : { expectedUpdatedAt: request.expectedUpdatedAt };
}

export function mapPlatformBillingMutationResponse(
  dto: PlatformBillingInvoiceApiDto,
): PlatformBillingMutationResponse {
  return mapPlatformBillingInvoice(dto);
}

function setText(params: Record<string, string>, key: string, value: string | undefined): void {
  if (value?.trim()) {
    params[key] = value.trim();
  }
}

function setNumber(params: Record<string, string>, key: string, value: number | undefined): void {
  if (value !== undefined) {
    params[key] = String(value);
  }
}
