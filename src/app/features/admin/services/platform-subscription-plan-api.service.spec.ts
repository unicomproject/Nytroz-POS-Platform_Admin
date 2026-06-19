import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { createSubscriptionPlanListResponse } from '../../../testing/test-fixtures';
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
      billingCycle: 'both',
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

    request.flush({ success: true, message: 'ok', data: createSubscriptionPlanListResponse() });
    expect(planName).toBe('Test Subscription Plan');
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
    expect(request.request.body.currencyCode).toBe('LKR');

    request.flush({
      success: true,
      message: 'ok',
      data: { id: 'plan-1', planName: 'Starter', planCode: 'STARTER', status: 'draft' }
    });

    expect(savedId).toBe('plan-1');
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
      data: { id: 'plan-1', planName: 'Starter', planCode: 'STARTER', status: 'active' }
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
});
