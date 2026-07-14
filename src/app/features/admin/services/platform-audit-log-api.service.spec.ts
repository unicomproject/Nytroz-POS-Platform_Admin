import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PlatformAuditLogApiService } from './platform-audit-log-api.service';

describe('PlatformAuditLogApiService', () => {
  let service: PlatformAuditLogApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PlatformAuditLogApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads audit logs from the platform audit API with query params', () => {
    let auditScope = '';

    service
      .getAuditLogs({
        pageNumber: 2,
        pageSize: 10,
        search: 'admin@nytroz.local',
        action: 'platform.login.failed',
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-03T23:59:59.999Z'
      })
      .subscribe((response) => {
        auditScope = response.auditScope;
      });

    const request = httpTesting.expectOne((req) => req.url === '/api/v1/platform-admin/audit-logs');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('pageNumber')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('10');
    expect(request.request.params.get('search')).toBe('admin@nytroz.local');
    expect(request.request.params.get('action')).toBe('platform.login.failed');
    expect(request.request.params.get('from')).toBe('2026-07-01T00:00:00.000Z');
    expect(request.request.params.get('to')).toBe('2026-07-03T23:59:59.999Z');

    request.flush({
      success: true,
      message: 'ok',
      data: {
        auditScope: 'platform_login_security',
        auditScopeDescription: 'Platform login and authentication security events from platform_login_audits.',
        items: [
          {
            id: 'audit-1',
            occurredAt: '2026-07-03T12:00:00.000Z',
            actor: { platformUserId: 'user-1', email: 'admin@nytroz.local' },
            action: 'platform.login.failed',
            area: 'platform_auth',
            entityType: 'platform_user',
            entityId: 'user-1',
            summary: 'Platform login failed.',
            ipAddress: null,
            userAgent: null
          }
        ],
        pageNumber: 2,
        pageSize: 10,
        totalCount: 11,
        totalPages: 2
      }
    });

    expect(auditScope).toBe('platform_login_security');
  });
});
