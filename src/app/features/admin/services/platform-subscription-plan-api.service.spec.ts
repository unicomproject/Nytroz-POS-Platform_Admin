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

    service.getPlans({
      pageNumber: 1,
      pageSize: 10,
      search: 'pro',
      status: 'published',
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
    expect(request.request.params.get('status')).toBe('published');

    request.flush({ success: true, message: 'ok', data: createSubscriptionPlanListResponse() });
    expect(planName).toBe('Professional Plus');
  });
});
