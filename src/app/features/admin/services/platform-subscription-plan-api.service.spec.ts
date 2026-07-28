import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  createSubscriptionPlanListItemApiDto,
  createSubscriptionPlanListResponseApiDto
} from '../../../testing/test-fixtures';
import { PlatformSubscriptionPlanApiService } from './platform-subscription-plan-api.service';

describe('PlatformSubscriptionPlanApiService', () => {
  let service: PlatformSubscriptionPlanApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PlatformSubscriptionPlanApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('calls GET /api/v1/platform/subscription-plans with query params and maps response data', () => {
    let planName = '';

    service.getSubscriptionPlans({
      pageNumber: 1,
      pageSize: 10,
      search: 'pro',
      status: 'active',
      planType: 'paid',
      billingCycle: 'monthly',
      currencyCode: 'LKR',
      sortBy: 'updatedAt',
      sortDirection: 'desc'
    }).subscribe((response) => {
      planName = response.items[0]?.planName ?? '';
    });

    const request = httpTesting.expectOne((req) => req.url === '/api/v1/platform/subscription-plans');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('pageNumber')).toBe('1');
    expect(request.request.params.get('search')).toBe('pro');
    expect(request.request.params.get('status')).toBe('active');
    expect(request.request.params.get('billingCycle')).toBe('monthly');

    request.flush({ success: true, message: 'ok', data: createSubscriptionPlanListResponseApiDto() });
    expect(planName).toBe('Test Subscription Plan');
  });

  it('omits billingCycle when filter is Both/All and maps annual to yearly', () => {
    service.getSubscriptionPlans({ billingCycle: 'both' }).subscribe();
    const bothRequest = httpTesting.expectOne((req) => req.url === '/api/v1/platform/subscription-plans');
    expect(bothRequest.request.params.has('billingCycle')).toBe(false);
    bothRequest.flush({ success: true, message: 'ok', data: createSubscriptionPlanListResponseApiDto() });

    service.getSubscriptionPlans({ billingCycle: 'annual' }).subscribe();
    const annualRequest = httpTesting.expectOne((req) => req.url === '/api/v1/platform/subscription-plans');
    expect(annualRequest.request.params.get('billingCycle')).toBe('yearly');
    annualRequest.flush({ success: true, message: 'ok', data: createSubscriptionPlanListResponseApiDto() });

    service.getSubscriptionPlans({ billingCycle: 'yearly' }).subscribe();
    const yearlyRequest = httpTesting.expectOne((req) => req.url === '/api/v1/platform/subscription-plans');
    expect(yearlyRequest.request.params.get('billingCycle')).toBe('yearly');
    yearlyRequest.flush({ success: true, message: 'ok', data: createSubscriptionPlanListResponseApiDto() });
  });

  it('calls POST /api/v1/platform/subscription-plans for saveDraft', () => {
    let savedId = '';

    service.saveDraft({
      planName: 'Starter',
      planCode: 'STARTER',
      description: '',
      billingCycle: 'monthly',
      baseCurrency: 'LKR',
      basePrice: 1000,
      maxOutlets: 1,
      maxTills: 2,
      maxUsers: 5,
      moduleAvailability: {},
      featureAvailability: {}
    }).subscribe((response) => {
      savedId = response.id;
    });

    const request = httpTesting.expectOne('/api/v1/platform/subscription-plans');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.planCode).toBe('STARTER');
    expect(request.request.body.billingCycle).toBe('monthly');
    expect(request.request.body.baseCurrency).toBe('LKR');
    expect(request.request.body.name).toBe('Starter');

    request.flush({
      success: true,
      message: 'ok',
      data: { id: 'plan-1', name: 'Starter', planCode: 'STARTER', status: 'draft' }
    });

    expect(savedId).toBe('plan-1');
  });

  it('loads and maps the dedicated plan detail contract', () => {
    let featureName = '';

    service.getSubscriptionPlanDetail('plan-1').subscribe((detail) => {
      featureName = detail.modules[0]?.features[0]?.name ?? '';
    });

    const request = httpTesting.expectOne('/api/v1/platform/subscription-plans/plan-1');
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      message: 'ok',
      data: {
        id: 'plan-1', planCode: 'PRO', name: 'Professional', description: null,
        status: 'active', billingCycle: 'monthly', baseCurrency: 'LKR', basePrice: 1000,
        pricingModel: 'fixed', trialDays: 0, maxOutlets: 2, maxUsers: 5, maxTills: 3,
        featureCount: 1, activeTenantCount: 2, canEdit: false, canDuplicate: true,
        canArchive: true, canDelete: false, canReactivate: false,
        createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-02T00:00:00Z',
        limits: [{ id: 'limit-1', code: 'MAX_OUTLETS', name: 'Maximum outlets', value: 2, isUnlimited: false }],
        modules: [{ id: 'module-1', code: 'CORE', name: 'Core', features: [{ id: 'feature-1', code: 'SALES', name: 'Sales' }] }]
      }
    });

    expect(featureName).toBe('Sales');
  });

  it('calls POST publish endpoint only after successful save response', () => {
    let publishedStatus = '';

    service.publish('plan-1').subscribe((response) => {
      publishedStatus = response.status;
    });

    const request = httpTesting.expectOne('/api/v1/platform/subscription-plans/plan-1/publish');
    expect(request.request.method).toBe('POST');

    request.flush({
      success: true,
      message: 'ok',
      data: { id: 'plan-1', name: 'Starter', planCode: 'STARTER', status: 'active' }
    });

    expect(publishedStatus).toBe('active');
  });

  it('calls PATCH /api/v1/platform/subscription-plans/{id}/limits for limits update', () => {
    let maxOutlets = 0;

    service.updateSubscriptionPlanLimits('plan-1', {
      maxOutlets: 5,
      maxTills: 10,
      maxUsers: 25
    }).subscribe((response) => {
      maxOutlets = response.maxOutlets ?? 0;
    });

    const request = httpTesting.expectOne('/api/v1/platform/subscription-plans/plan-1/limits');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body.maxOutlets).toBe(5);

    request.flush({
      success: true,
      message: 'ok',
      data: { id: 'plan-1', maxOutlets: 5, maxTills: 10, maxUsers: 25, status: 'draft' }
    });

    expect(maxOutlets).toBe(5);
  });

  it('calls PATCH /api/v1/platform/subscription-plans/{id}/pricing for pricing update', () => {
    let basePrice = 0;

    service.updateSubscriptionPlanPricing('plan-1', { basePrice: 12900 }).subscribe((response) => {
      basePrice = response.basePrice;
    });

    const request = httpTesting.expectOne('/api/v1/platform/subscription-plans/plan-1/pricing');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body.basePrice).toBe(12900);

    request.flush({
      success: true,
      message: 'ok',
      data: { id: 'plan-1', basePrice: 12900, status: 'draft' }
    });

    expect(basePrice).toBe(12900);
  });

  it('maps commercial modules from subscription catalog', () => {
    let modules: { name: string; isLocked: boolean }[] = [];

    service.getModules().subscribe((items) => {
      modules = items.map((module) => ({ name: module.name, isLocked: module.isLocked }));
    });

    const request = httpTesting.expectOne('/api/v1/platform/subscription-plans/catalog');
    expect(request.request.method).toBe('GET');

    request.flush({ success: true, message: 'ok', data: subscriptionCatalogFixture() });

    expect(modules).toEqual([
      { name: 'Core POS', isLocked: false },
      { name: 'Inventory', isLocked: false }
    ]);
  });

  it('maps features from commercial subscription modules', () => {
    let featureKeys: string[] = [];

    service.getFeatures().subscribe((features) => {
      featureKeys = features.map((feature) => feature.featureKey);
    });

    const request = httpTesting.expectOne('/api/v1/platform/subscription-plans/catalog');
    request.flush({ success: true, message: 'ok', data: subscriptionCatalogFixture() });

    expect(featureKeys).toEqual(['pos.sales', 'inventory_management']);
  });

  it('calls PATCH /api/v1/platform/subscription-plans/{id}/features for feature update', () => {
    let includedFeatureIds: string[] = [];

    service.updateSubscriptionPlanFeatures('plan-1', {
      featureAvailability: {
        'feature-1': 'included',
        'feature-2': 'not_available'
      }
    }).subscribe((response) => {
      includedFeatureIds = response.includedFeatureIds;
    });

    const request = httpTesting.expectOne('/api/v1/platform/subscription-plans/plan-1/features');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      featureIds: ['feature-1']
    });

    request.flush({
      success: true,
      message: 'ok',
      data: createSubscriptionPlanListItemApiDto({ id: 'plan-1', status: 'draft' })
    });

    expect(includedFeatureIds).toEqual(['feature-1']);
  });
});

function subscriptionCatalogFixture() {
  return {
    modules: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        moduleCode: 'core_pos',
        name: 'Core POS',
        description: null,
        sortOrder: 10,
        features: [
          {
            id: '22222222-2222-2222-2222-222222222222',
            featureCode: 'pos.sales',
            name: 'POS Sales',
            description: 'Start sale',
            sortOrder: 1
          }
        ]
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        moduleCode: 'inventory',
        name: 'Inventory',
        description: null,
        sortOrder: 30,
        features: [
          {
            id: '44444444-4444-4444-4444-444444444444',
            featureCode: 'inventory_management',
            name: 'Inventory Management',
            description: 'Manage inventory',
            sortOrder: 1
          }
        ]
      }
    ]
  };
}
