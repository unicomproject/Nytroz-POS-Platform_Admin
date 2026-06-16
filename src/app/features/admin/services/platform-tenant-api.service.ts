import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  PlatformTenantFilterOptions,
  PlatformTenantListQuery,
  PlatformTenantListResponse,
  PlatformTenantSummary
} from '../models/platform-tenant.model';

@Injectable({ providedIn: 'root' })
export class PlatformTenantApiService {
  constructor(private readonly http: HttpClient) {}

  getTenants(query: PlatformTenantListQuery): Observable<PlatformTenantListResponse> {
    return this.http
      .get<ApiResponse<PlatformTenantListResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenants}`,
        { params: this.toParams(query) }
      )
      .pipe(map((response) => response.data ?? {
        items: [],
        pageNumber: query.pageNumber ?? 1,
        pageSize: query.pageSize ?? 10,
        totalCount: 0,
        totalPages: 0
      }));
  }

  getSummary(): Observable<PlatformTenantSummary> {
    return this.http
      .get<ApiResponse<PlatformTenantSummary>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenantSummary}`
      )
      .pipe(map((response) => response.data ?? {
        totalTenants: 0,
        activeTenants: 0,
        suspendedTenants: 0,
        inactiveTenants: 0,
        trialTenants: 0
      }));
  }

  getFilterOptions(): Observable<PlatformTenantFilterOptions> {
    return this.http
      .get<ApiResponse<PlatformTenantFilterOptions>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.tenantFilterOptions}`
      )
      .pipe(map((response) => response.data ?? { plans: [], regions: [], statuses: [] }));
  }

  private toParams(query: PlatformTenantListQuery): HttpParams {
    let params = new HttpParams();

    if (query.pageNumber) {
      params = params.set('pageNumber', String(query.pageNumber));
    }

    if (query.pageSize) {
      params = params.set('pageSize', String(query.pageSize));
    }

    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }

    if (query.status?.trim()) {
      params = params.set('status', query.status.trim());
    }

    if (query.plan?.trim()) {
      params = params.set('plan', query.plan.trim());
    }

    if (query.region?.trim()) {
      params = params.set('region', query.region.trim());
    }

    if (query.createdFrom) {
      params = params.set('createdFrom', query.createdFrom);
    }

    if (query.createdTo) {
      params = params.set('createdTo', query.createdTo);
    }

    if (query.sortBy?.trim()) {
      params = params.set('sortBy', query.sortBy.trim());
    }

    if (query.sortDirection) {
      params = params.set('sortDirection', query.sortDirection);
    }

    return params;
  }
}
