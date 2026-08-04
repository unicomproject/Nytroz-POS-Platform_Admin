import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  mapPlatformTenantDetail,
  mapPlatformTenantFilterOptions,
  mapPlatformTenantListQueryParams,
  mapPlatformTenantListResponse,
  mapPlatformTenantSummary,
  PlatformTenantDetailApiDto,
  PlatformTenantFilterOptionsApiDto,
  PlatformTenantListResponseApiDto,
  PlatformTenantSummaryApiDto
} from '../mappers/platform-tenant.mapper';
import { mapCreateOptions, TenantCreateOptionsApiDto } from '../mappers/platform-tenant-create.mapper';
import { CreatePlatformTenantRequest, TenantCreateOptions } from '../models/platform-tenant-create.model';
import {
  mapUpdatePlatformTenantEntitlementsRequest,
  mapPlatformTenantEntitlementOptions,
  PlatformTenantEntitlementOptionsApiDto
} from '../mappers/platform-tenant-entitlements.mapper';
import { UpdatePlatformTenantEntitlementsRequest, PlatformTenantEntitlementOptions } from '../models/platform-tenant-entitlements.model';
import {
  TenantOnboardingDraft,
  TenantOnboardingDraftSummary,
  TenantOnboardingOperation,
  TenantOnboardingPayload,
  TenantOnboardingReceipt
} from '../models/platform-tenant-onboarding.model';
import {
  PlatformTenantDetail,
  PlatformTenantFilterOptions,
  PlatformTenantListQuery,
  PlatformTenantListResponse,
  PlatformTenantSummary,
  UpdatePlatformTenantRequest,
  PlatformTenantAuditLogListResponse
} from '../models/platform-tenant.model';

@Injectable({ providedIn: 'root' })
export class PlatformTenantApiService {
  private readonly onboardingUrl = `${appSettings.apiBaseUrl}/platform-admin/tenant-onboarding`;
  constructor(private readonly http: HttpClient) {}

  getTenants(query: PlatformTenantListQuery): Observable<PlatformTenantListResponse> {
    return this.http
      .get<ApiResponse<PlatformTenantListResponseApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenants}`,
        { params: this.toParams(query) }
      )
      .pipe(map((response) => mapPlatformTenantListResponse(response.data, query)));
  }

  getSummary(): Observable<PlatformTenantSummary> {
    return this.http
      .get<ApiResponse<PlatformTenantSummaryApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenantSummary}`
      )
      .pipe(map((response) => mapPlatformTenantSummary(response.data)));
  }

  getFilterOptions(): Observable<PlatformTenantFilterOptions> {
    return this.http
      .get<ApiResponse<PlatformTenantFilterOptionsApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenantFilterOptions}`
      )
      .pipe(map((response) => mapPlatformTenantFilterOptions(response.data)));
  }

  getCreateOptions(): Observable<TenantCreateOptions> {
    return this.http
      .get<ApiResponse<TenantCreateOptionsApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenantCreateOptions}`
      )
      .pipe(map((response) => mapCreateOptions(response.data)));
  }

  createTenant(request: CreatePlatformTenantRequest): Observable<PlatformTenantDetail> {
    return this.http
      .post<ApiResponse<PlatformTenantDetailApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenants}`,
        request
      )
      .pipe(map((response) => mapPlatformTenantDetail(response.data)));
  }

  createOnboardingDraft(payload: TenantOnboardingPayload, currentStep = 1): Observable<TenantOnboardingDraft> {
    return this.http.post<ApiResponse<TenantOnboardingDraft>>(`${this.onboardingUrl}/drafts`, { payload, currentStep })
      .pipe(map((response) => response.data));
  }

  listOnboardingDrafts(mine = true): Observable<TenantOnboardingDraftSummary[]> {
    return this.http.get<ApiResponse<{ items: TenantOnboardingDraftSummary[] }>>(
      `${this.onboardingUrl}/drafts`, { params: { mine } }
    ).pipe(map((response) => response.data.items));
  }

  getOnboardingDraft(draftId: string): Observable<TenantOnboardingDraft> {
    return this.http.get<ApiResponse<TenantOnboardingDraft>>(`${this.onboardingUrl}/drafts/${draftId}`)
      .pipe(map((response) => response.data));
  }

  saveOnboardingDraft(draftId: string, version: number, payload: TenantOnboardingPayload, currentStep: number): Observable<TenantOnboardingDraft> {
    return this.http.patch<ApiResponse<TenantOnboardingDraft>>(
      `${this.onboardingUrl}/drafts/${draftId}`,
      { payload, currentStep },
      { headers: new HttpHeaders({ 'If-Match': `\"${version}\"` }) }
    ).pipe(map((response) => response.data));
  }

  discardOnboardingDraft(draftId: string, version: number): Observable<void> {
    return this.http.delete<void>(`${this.onboardingUrl}/drafts/${draftId}`, {
      headers: new HttpHeaders({ 'If-Match': `\"${version}\"` })
    });
  }

  finalizeOnboardingDraft(draftId: string, version: number, idempotencyKey: string): Observable<TenantOnboardingReceipt> {
    return this.http.post<ApiResponse<TenantOnboardingReceipt>>(
      `${this.onboardingUrl}/drafts/${draftId}/finalize`,
      { acknowledgedWarningCodes: [], finalReviewConfirmed: true },
      { headers: new HttpHeaders({ 'If-Match': `\"${version}\"`, 'Idempotency-Key': idempotencyKey }) }
    ).pipe(map((response) => response.data));
  }

  getOnboardingOperation(operationId: string): Observable<TenantOnboardingOperation> {
    return this.http.get<ApiResponse<TenantOnboardingOperation>>(`${this.onboardingUrl}/operations/${operationId}`)
      .pipe(map((response) => response.data));
  }

  retryOnboardingOperation(operationId: string): Observable<TenantOnboardingOperation> {
    return this.http.post<ApiResponse<TenantOnboardingOperation>>(
      `${this.onboardingUrl}/operations/${encodeURIComponent(operationId)}/retry`,
      {}
    ).pipe(map((response) => response.data));
  }

  resendTenantAdminInvitation(tenantId: string, idempotencyKey: string): Observable<TenantOnboardingOperation> {
    return this.http.post<ApiResponse<TenantOnboardingOperation>>(
      `${this.onboardingUrl}/tenants/${encodeURIComponent(tenantId)}/invitation/resend`,
      {},
      { headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) }
    ).pipe(map((response) => response.data));
  }

  getTenantById(tenantId: string): Observable<PlatformTenantDetail> {
    return this.http
      .get<ApiResponse<PlatformTenantDetailApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenants}/${tenantId}`
      )
      .pipe(map((response) => mapPlatformTenantDetail(response.data)));
  }

  updateTenant(tenantId: string, request: UpdatePlatformTenantRequest): Observable<PlatformTenantDetail> {
    return this.http
      .put<ApiResponse<PlatformTenantDetailApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenants}/${tenantId}`,
        {
          name: request.name,
          baseCurrency: request.baseCurrency,
          defaultTimezone: request.defaultTimezone,
          defaultLocale: request.defaultLocale,
          operatingMode: request.operatingMode,
          businessType: request.businessType,
          billingStatus: request.billingStatus,
          concurrencyVersion: request.concurrencyVersion
        }
      )
      .pipe(map((response) => mapPlatformTenantDetail(response.data)));
  }

  activateTenant(tenantId: string, idempotencyKey?: string): Observable<PlatformTenantDetail> {
    return this.http
      .post<ApiResponse<PlatformTenantDetailApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenants}/${tenantId}/activate`,
        {},
        idempotencyKey ? { headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) } : {}
      )
      .pipe(map((response) => mapPlatformTenantDetail(response.data)));
  }

  reactivateTenant(tenantId: string): Observable<PlatformTenantDetail> {
    return this.http
      .post<ApiResponse<PlatformTenantDetailApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenants}/${tenantId}/reactivate`,
        {}
      )
      .pipe(map((response) => mapPlatformTenantDetail(response.data)));
  }

  suspendTenant(tenantId: string): Observable<PlatformTenantDetail> {
    return this.http
      .post<ApiResponse<PlatformTenantDetailApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenants}/${tenantId}/suspend`,
        {}
      )
      .pipe(map((response) => mapPlatformTenantDetail(response.data)));
  }

  getTenantAuditLogs(
    tenantId: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<ApiResponse<PlatformTenantAuditLogListResponse>> {
    const params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    return this.http.get<ApiResponse<PlatformTenantAuditLogListResponse>>(
      `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenants}/${tenantId}/audit-logs`,
      { params }
    );
  }

  getEntitlementOptions(tenantId: string): Observable<PlatformTenantEntitlementOptions> {
    return this.http
      .get<ApiResponse<PlatformTenantEntitlementOptionsApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenants}/${tenantId}/entitlement-options`
      )
      .pipe(map((response) => mapPlatformTenantEntitlementOptions(response.data)));
  }

  updateEntitlements(
    tenantId: string,
    request: UpdatePlatformTenantEntitlementsRequest
  ): Observable<PlatformTenantDetail> {
    return this.http
      .put<ApiResponse<PlatformTenantDetailApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenants}/${tenantId}/entitlements`,
        mapUpdatePlatformTenantEntitlementsRequest(request)
      )
      .pipe(map((response) => mapPlatformTenantDetail(response.data)));
  }

  private toParams(query: PlatformTenantListQuery): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(mapPlatformTenantListQueryParams(query))) {
      params = params.set(key, value);
    }

    return params;
  }
}
