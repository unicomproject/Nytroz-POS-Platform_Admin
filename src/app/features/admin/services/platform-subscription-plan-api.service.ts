import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  PlatformFeatureOption,
  PlatformModuleOption,
  SubscriptionPlanDraft,
  SubscriptionPlanListQuery,
  SubscriptionPlanListResponse
} from '../models/platform-subscription-plan.model';

@Injectable({ providedIn: 'root' })
export class PlatformSubscriptionPlanApiService {
  constructor(private readonly http: HttpClient) {}

  getPlans(query: SubscriptionPlanListQuery): Observable<SubscriptionPlanListResponse> {
    return this.http
      .get<ApiResponse<SubscriptionPlanListResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}`,
        { params: this.toParams(query) }
      )
      .pipe(
        map((response) => response.data ?? {
          items: [],
          pageNumber: query.pageNumber ?? 1,
          pageSize: query.pageSize ?? 10,
          totalItems: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
          statusCounts: { all: 0, draft: 0, published: 0, archived: 0 }
        })
      );
  }

  /** TODO: Wire when GET /api/v1/platform/subscription-plans/modules is available. */
  getModules(): Observable<PlatformModuleOption[]> {
    return of([]);
  }

  /** TODO: Wire when GET /api/v1/platform/subscription-plans/features is available. */
  getFeatures(): Observable<PlatformFeatureOption[]> {
    return of([]);
  }

  /** TODO: Wire when POST /api/v1/platform/subscription-plans draft endpoint is available. */
  saveDraft(_draft: SubscriptionPlanDraft): Observable<{ id: string }> {
    return of({ id: '' });
  }

  /** TODO: Wire when POST /api/v1/platform/subscription-plans/{id}/publish is available. */
  publish(_planId: string): Observable<void> {
    return of(undefined);
  }

  private toParams(query: SubscriptionPlanListQuery): HttpParams {
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

    if (query.planType?.trim()) {
      params = params.set('planType', query.planType.trim());
    }

    if (query.status?.trim()) {
      params = params.set('status', query.status.trim());
    }

    if (query.billingCycle?.trim()) {
      params = params.set('billingCycle', query.billingCycle.trim());
    }

    if (query.currencyCode?.trim()) {
      params = params.set('currencyCode', query.currencyCode.trim());
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
