import { HttpClient, HttpParams } from '@angular/common/http';
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
  PlatformTenantDetail,
  PlatformTenantFilterOptions,
  PlatformTenantListQuery,
  PlatformTenantListResponse,
  PlatformTenantSummary,
  UpdatePlatformTenantRequest
} from '../models/platform-tenant.model';

@Injectable({ providedIn: 'root' })
export class PlatformTenantApiService {
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
          billingStatus: request.billingStatus
        }
      )
      .pipe(map((response) => mapPlatformTenantDetail(response.data)));
  }

  activateTenant(tenantId: string): Observable<PlatformTenantDetail> {
    return this.http
      .post<ApiResponse<PlatformTenantDetailApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenants}/${tenantId}/activate`,
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
