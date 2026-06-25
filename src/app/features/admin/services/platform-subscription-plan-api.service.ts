import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  PlatformFeatureOption,
  PlatformModuleOption,
  SubscriptionPlanCatalogModule,
  SubscriptionPlanCatalogResponse,
  SubscriptionPlanDraft,
  SubscriptionPlanFeaturesMutationResponse,
  SubscriptionPlanFeaturesUpdateRequest,
  SubscriptionPlanLimitsMutationResponse,
  SubscriptionPlanLimitsUpdateRequest,
  SubscriptionPlanListQuery,
  SubscriptionPlanListResponse,
  SubscriptionPlanMutationResponse,
  SubscriptionPlanPricingMutationResponse,
  SubscriptionPlanPricingUpdateRequest
} from '../models/platform-subscription-plan.model';

@Injectable({ providedIn: 'root' })
export class PlatformSubscriptionPlanApiService {
  constructor(private readonly http: HttpClient) {}

  getSubscriptionPlans(query: SubscriptionPlanListQuery): Observable<SubscriptionPlanListResponse> {
    return this.getPlans(query);
  }

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

  getModules(): Observable<PlatformModuleOption[]> {
    return this.getSubscriptionCatalog().pipe(
      map((catalog) => catalog.modules.map(toPlatformModuleOption))
    );
  }

  getFeatures(): Observable<PlatformFeatureOption[]> {
    return this.getSubscriptionCatalog().pipe(
      map((catalog) =>
        catalog.modules
          .flatMap((module) => module.features.map((feature) => toPlatformFeatureOption(module, feature)))
      )
    );
  }

  getSubscriptionCatalog(): Observable<SubscriptionPlanCatalogResponse> {
    return this.http
      .get<ApiResponse<SubscriptionPlanCatalogResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}/catalog`
      )
      .pipe(
        map((response) => response.data ?? { modules: [] })
      );
  }

  saveDraft(draft: SubscriptionPlanDraft): Observable<SubscriptionPlanMutationResponse> {
    return this.createSubscriptionPlanDraft(draft);
  }

  createSubscriptionPlanDraft(draft: SubscriptionPlanDraft): Observable<SubscriptionPlanMutationResponse> {
    return this.http
      .post<ApiResponse<SubscriptionPlanMutationResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}`,
        this.toCreateRequest(draft)
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data?.id) {
            throw new Error(response.message || 'Subscription plan could not be saved.');
          }

          return response.data;
        })
      );
  }

  publish(planId: string): Observable<SubscriptionPlanMutationResponse> {
    return this.publishSubscriptionPlan(planId);
  }

  publishSubscriptionPlan(planId: string): Observable<SubscriptionPlanMutationResponse> {
    return this.http
      .post<ApiResponse<SubscriptionPlanMutationResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}/${planId}/publish`,
        {}
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data?.id) {
            throw new Error(response.message || 'Subscription plan could not be published.');
          }

          return response.data;
        })
      );
  }

  updateSubscriptionPlanPricing(
    planId: string,
    request: SubscriptionPlanPricingUpdateRequest
  ): Observable<SubscriptionPlanPricingMutationResponse> {
    return this.http
      .patch<ApiResponse<SubscriptionPlanPricingMutationResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}/${planId}/pricing`,
        { basePrice: request.basePrice }
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data?.id) {
            throw new Error(response.message || 'Subscription plan pricing could not be saved.');
          }

          return response.data;
        })
      );
  }

  updateSubscriptionPlanLimits(
    planId: string,
    request: SubscriptionPlanLimitsUpdateRequest
  ): Observable<SubscriptionPlanLimitsMutationResponse> {
    return this.http
      .patch<ApiResponse<SubscriptionPlanLimitsMutationResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}/${planId}/limits`,
        {
          maxOutlets: request.maxOutlets,
          maxTills: request.maxTills,
          maxUsers: request.maxUsers
        }
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data?.id) {
            throw new Error(response.message || 'Subscription plan limits could not be saved.');
          }

          return response.data;
        })
      );
  }

  updateSubscriptionPlanFeatures(
    planId: string,
    request: SubscriptionPlanFeaturesUpdateRequest
  ): Observable<SubscriptionPlanFeaturesMutationResponse> {
    return this.http
      .patch<ApiResponse<SubscriptionPlanFeaturesMutationResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}/${planId}/features`,
        { featureAvailability: request.featureAvailability }
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data?.id) {
            throw new Error(response.message || 'Subscription plan features could not be saved.');
          }

          return response.data;
        })
      );
  }

  private toCreateRequest(draft: SubscriptionPlanDraft) {
    const request: Record<string, unknown> = {
      planName: draft.planName,
      planCode: draft.planCode,
      description: draft.description,
      billingCycle: draft.billingCycle,
      currencyCode: draft.baseCurrency
    };

    if (draft.basePrice != null && draft.basePrice >= 0) {
      request['basePrice'] = draft.basePrice;
    }

    if (draft.maxOutlets != null) {
      request['outletLimit'] = draft.maxOutlets;
    }

    if (draft.maxTills != null) {
      request['tillLimit'] = draft.maxTills;
    }

    if (draft.maxUsers != null) {
      request['userLimit'] = draft.maxUsers;
    }

    return request;
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

function toPlatformModuleOption(module: SubscriptionPlanCatalogModule): PlatformModuleOption {
  return {
    id: module.id,
    moduleKey: module.code,
    name: module.name,
    description: module.description ?? null,
    sortOrder: module.sortOrder,
    isCore: module.isCore,
    isLocked: module.isLocked,
    defaultAvailability: module.defaultAvailability
  };
}

function toPlatformFeatureOption(
  module: SubscriptionPlanCatalogModule,
  feature: SubscriptionPlanCatalogModule['features'][number]
): PlatformFeatureOption {
  return {
    id: feature.id,
    moduleId: module.id,
    moduleName: module.name,
    featureKey: feature.code,
    name: feature.name,
    description: feature.description ?? null,
    entitlementKey: feature.entitlementKey ?? null,
    sortOrder: feature.sortOrder,
    isCore: feature.isCore,
    isLocked: feature.isLocked,
    defaultAvailability: feature.defaultAvailability
  };
}
