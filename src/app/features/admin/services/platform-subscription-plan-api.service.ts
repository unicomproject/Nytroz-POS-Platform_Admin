import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  mapCreateSubscriptionPlanRequest,
  mapSubscriptionPlanCatalog,
  mapSubscriptionPlanFeaturesMutationResponse,
  mapSubscriptionPlanFeaturesRequest,
  mapSubscriptionPlanLimitsMutationResponse,
  mapSubscriptionPlanListQueryParams,
  mapSubscriptionPlanListResponse,
  mapSubscriptionPlanMutationResponse,
  mapSubscriptionPlanPricingMutationResponse,
  SubscriptionPlanCatalogResponseApiDto,
  SubscriptionPlanListResponseApiDto,
  SubscriptionPlanMutationResponseApiDto
} from '../mappers/platform-subscription-plan.mapper';
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
      .get<ApiResponse<SubscriptionPlanListResponseApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}`,
        { params: this.toParams(query) }
      )
      .pipe(map((response) => mapSubscriptionPlanListResponse(response.data, query)));
  }

  getModules(): Observable<PlatformModuleOption[]> {
    return this.getSubscriptionCatalog().pipe(
      map((catalog) => catalog.modules.map(toPlatformModuleOption))
    );
  }

  getFeatures(): Observable<PlatformFeatureOption[]> {
    return this.getSubscriptionCatalog().pipe(
      map((catalog) =>
        catalog.modules.flatMap((module) =>
          module.features.map((feature) => toPlatformFeatureOption(module, feature))
        )
      )
    );
  }

  getSubscriptionCatalog(): Observable<SubscriptionPlanCatalogResponse> {
    return this.http
      .get<ApiResponse<SubscriptionPlanCatalogResponseApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}/catalog`
      )
      .pipe(map((response) => mapSubscriptionPlanCatalog(response.data)));
  }

  saveDraft(draft: SubscriptionPlanDraft): Observable<SubscriptionPlanMutationResponse> {
    return this.createSubscriptionPlanDraft(draft);
  }

  createSubscriptionPlanDraft(draft: SubscriptionPlanDraft): Observable<SubscriptionPlanMutationResponse> {
    return this.http
      .post<ApiResponse<SubscriptionPlanMutationResponseApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}`,
        mapCreateSubscriptionPlanRequest(draft)
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data?.id) {
            throw new Error(response.message || 'Subscription plan could not be saved.');
          }

          return mapSubscriptionPlanMutationResponse(response.data);
        })
      );
  }

  publish(planId: string): Observable<SubscriptionPlanMutationResponse> {
    return this.publishSubscriptionPlan(planId);
  }

  publishSubscriptionPlan(planId: string): Observable<SubscriptionPlanMutationResponse> {
    return this.http
      .post<ApiResponse<SubscriptionPlanMutationResponseApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}/${planId}/publish`,
        {}
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data?.id) {
            throw new Error(response.message || 'Subscription plan could not be published.');
          }

          return mapSubscriptionPlanMutationResponse(response.data);
        })
      );
  }

  updateSubscriptionPlanPricing(
    planId: string,
    request: SubscriptionPlanPricingUpdateRequest
  ): Observable<SubscriptionPlanPricingMutationResponse> {
    return this.http
      .patch<ApiResponse<SubscriptionPlanMutationResponseApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}/${planId}/pricing`,
        { basePrice: request.basePrice }
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data?.id) {
            throw new Error(response.message || 'Subscription plan pricing could not be saved.');
          }

          return mapSubscriptionPlanPricingMutationResponse(response.data);
        })
      );
  }

  updateSubscriptionPlanLimits(
    planId: string,
    request: SubscriptionPlanLimitsUpdateRequest
  ): Observable<SubscriptionPlanLimitsMutationResponse> {
    return this.http
      .patch<ApiResponse<SubscriptionPlanMutationResponseApiDto>>(
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

          return mapSubscriptionPlanLimitsMutationResponse(response.data);
        })
      );
  }

  updateSubscriptionPlanFeatures(
    planId: string,
    request: SubscriptionPlanFeaturesUpdateRequest
  ): Observable<SubscriptionPlanFeaturesMutationResponse> {
    const payload = mapSubscriptionPlanFeaturesRequest(request);
    const requestedFeatureIds = (payload['featureIds'] as string[]) ?? [];

    return this.http
      .patch<ApiResponse<SubscriptionPlanMutationResponseApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.subscriptionPlans}/${planId}/features`,
        payload
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data?.id) {
            throw new Error(response.message || 'Subscription plan features could not be saved.');
          }

          return mapSubscriptionPlanFeaturesMutationResponse(response.data, requestedFeatureIds);
        })
      );
  }

  private toParams(query: SubscriptionPlanListQuery): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(mapSubscriptionPlanListQueryParams(query))) {
      params = params.set(key, value);
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
