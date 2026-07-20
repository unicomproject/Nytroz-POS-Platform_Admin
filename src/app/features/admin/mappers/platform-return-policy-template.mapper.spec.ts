import { describe, expect, it } from 'vitest';

import {
  mapCreateReturnPolicyTemplateRequest,
  mapReturnPolicyTemplateListResponse,
  mapReturnPolicyTemplateSummary,
  mapUpdateReturnPolicyTemplateRequest
} from './platform-return-policy-template.mapper';

describe('platform-return-policy-template.mapper', () => {
  it('maps list response and summary rows', () => {
    const mapped = mapReturnPolicyTemplateListResponse(
      {
        items: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            templateCode: '7DAYS',
            name: '7 Day Returns',
            returnWindowDays: 7,
            status: 'ACTIVE',
            createdAt: '2026-07-20T00:00:00Z',
            updatedAt: '2026-07-20T01:00:00Z'
          }
        ],
        pageNumber: 1,
        pageSize: 20,
        totalCount: 1
      },
      { pageNumber: 1, pageSize: 20 }
    );

    expect(mapped.totalPages).toBe(1);
    expect(mapped.items[0].templateCode).toBe('7DAYS');
  });

  it('maps create and update requests without inventing fields', () => {
    const draft = {
      templateCode: ' custom ',
      name: ' Custom ',
      returnWindowDays: 14,
      status: 'INACTIVE' as const
    };

    expect(mapCreateReturnPolicyTemplateRequest(draft)).toEqual({
      templateCode: 'custom',
      name: 'Custom',
      returnWindowDays: 14,
      status: 'INACTIVE'
    });
    expect(mapUpdateReturnPolicyTemplateRequest(draft)).toEqual(mapCreateReturnPolicyTemplateRequest(draft));
  });

  it('maps summary dto directly', () => {
    expect(
      mapReturnPolicyTemplateSummary({
        id: 'abc',
        templateCode: 'NO_RETURN',
        name: 'No Return',
        returnWindowDays: null,
        status: 'ACTIVE',
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: null
      }).returnWindowDays
    ).toBeNull();
  });
});
