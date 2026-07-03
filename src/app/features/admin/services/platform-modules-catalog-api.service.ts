import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { SubscriptionPlanCatalogResponse } from '../models/platform-subscription-plan.model';
import { PlatformSubscriptionPlanApiService } from './platform-subscription-plan-api.service';

/**
 * Reads the platform module/feature catalog for the Modules & Features admin page.
 * Current backend source: GET /api/v1/platform/subscription-plans/catalog.
 */
@Injectable({ providedIn: 'root' })
export class PlatformModulesCatalogApiService {
  constructor(private readonly subscriptionPlanApi: PlatformSubscriptionPlanApiService) {}

  getCatalog(): Observable<SubscriptionPlanCatalogResponse> {
    return this.subscriptionPlanApi.getSubscriptionCatalog();
  }
}
