import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PlatformReturnPolicyTemplateApiService } from './platform-return-policy-template-api.service';

describe('PlatformReturnPolicyTemplateApiService', () => {
  let service: PlatformReturnPolicyTemplateApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PlatformReturnPolicyTemplateApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads templates from the platform return policy API', () => {
    let totalCount = 0;

    service.getTemplates({ pageNumber: 1, pageSize: 20, search: '7DAYS' }).subscribe((response) => {
      totalCount = response.totalCount;
    });

    const request = httpTesting.expectOne((req) => req.url === '/api/v1/platform/return-policy-templates');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('search')).toBe('7DAYS');

    request.flush({
      success: true,
      message: 'ok',
      data: {
        items: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            templateCode: '7DAYS',
            name: '7 Day Returns',
            returnWindowDays: 7,
            status: 'ACTIVE',
            createdAt: '2026-07-20T00:00:00Z',
            updatedAt: null
          }
        ],
        pageNumber: 1,
        pageSize: 20,
        totalCount: 1
      }
    });

    expect(totalCount).toBe(1);
  });

  it('creates and updates templates with mapped payloads', () => {
    const draft = {
      templateCode: 'TEST',
      name: 'Test Template',
      returnWindowDays: 3,
      status: 'ACTIVE' as const
    };

    service.createTemplate(draft).subscribe();
    const create = httpTesting.expectOne('/api/v1/platform/return-policy-templates');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      templateCode: 'TEST',
      name: 'Test Template',
      returnWindowDays: 3,
      status: 'ACTIVE'
    });
    create.flush({
      success: true,
      message: 'ok',
      data: {
        id: '22222222-2222-4222-8222-222222222222',
        templateCode: 'TEST',
        name: 'Test Template',
        returnWindowDays: 3,
        status: 'ACTIVE',
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: null
      }
    });

    service.updateTemplate('22222222-2222-4222-8222-222222222222', draft).subscribe();
    const update = httpTesting.expectOne('/api/v1/platform/return-policy-templates/22222222-2222-4222-8222-222222222222');
    expect(update.request.method).toBe('PUT');
    update.flush({
      success: true,
      message: 'ok',
      data: {
        id: '22222222-2222-4222-8222-222222222222',
        templateCode: 'TEST',
        name: 'Test Template',
        returnWindowDays: 3,
        status: 'ACTIVE',
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T01:00:00Z'
      }
    });
  });
});
