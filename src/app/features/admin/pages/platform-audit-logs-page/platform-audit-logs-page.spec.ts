import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { adminRoutes } from '../../routes/admin.routes';
import { PlatformAuditLogListResponse } from '../../models/platform-audit-log.model';
import { PlatformAuditLogApiService } from '../../services/platform-audit-log-api.service';
import { PlatformAuditLogsPage } from './platform-audit-logs-page';

describe('PlatformAuditLogsPage', () => {
  let api: { getAuditLogs: ReturnType<typeof vi.fn> };

  const auditResponse: PlatformAuditLogListResponse = {
    auditScope: 'platform_login_security',
    auditScopeDescription:
      'Platform login and authentication security events from platform_login_audits. Generic business audit logs are not available in Release 1.',
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
    pageNumber: 1,
    pageSize: 20,
    totalCount: 1,
    totalPages: 1
  };

  async function createComponent(): Promise<ComponentFixture<PlatformAuditLogsPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformAuditLogsPage],
      providers: [
        { provide: PlatformAuditLogApiService, useValue: api },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Audit logs failed safely' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformAuditLogsPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    api = { getAuditLogs: vi.fn() };
  });

  it('shows a loading state while the audit request is pending', async () => {
    api.getAuditLogs.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading platform login audit logs');
  });

  it('loads audit logs and renders the scope notice and table rows', async () => {
    api.getAuditLogs.mockReturnValue(of(auditResponse));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(api.getAuditLogs).toHaveBeenCalled();
    expect(text).toContain('Release 1 scope');
    expect(text).toContain('Generic business audit logs are not available in Release 1');
    expect(text).toContain('admin@nytroz.local');
    expect(text).toContain('platform.login.failed');
    expect(text).toContain('Platform login failed.');
  });

  it('passes filter query params to the API when filters change', async () => {
    api.getAuditLogs.mockReturnValue(of(auditResponse));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.onActionChange('platform.login.failed');
    await fixture.whenStable();
    fixture.detectChanges();

    const lastCall = api.getAuditLogs.mock.calls.at(-1)?.[0];
    expect(lastCall.action).toBe('platform.login.failed');

    fixture.componentInstance.onFromDateChange('2026-07-01');
    fixture.componentInstance.onToDateChange('2026-07-03');
    await fixture.whenStable();

    const filteredCall = api.getAuditLogs.mock.calls.at(-1)?.[0];
    expect(filteredCall.from).toBeTruthy();
    expect(filteredCall.to).toBeTruthy();
  });

  it('requests the next page when pagination is used', async () => {
    api.getAuditLogs.mockReturnValue(
      of({
        ...auditResponse,
        pageNumber: 1,
        totalPages: 2,
        totalCount: 21
      })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.goToPage(2);
    await fixture.whenStable();

    const lastCall = api.getAuditLogs.mock.calls.at(-1)?.[0];
    expect(lastCall.pageNumber).toBe(2);
  });

  it('shows an empty state when the backend returns no audit rows', async () => {
    api.getAuditLogs.mockReturnValue(
      of({
        ...auditResponse,
        items: [],
        totalCount: 0,
        totalPages: 0
      })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No login audit records found');
  });

  it('shows an error state with retry when the API request fails', async () => {
    api.getAuditLogs.mockReturnValue(throwError(() => new Error('network failed')));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Platform login audit logs could not be loaded');
    expect(text).toContain('Audit logs failed safely');
    expect(text).toContain('Try again');
  });

  it('retries loading when Try again is clicked', async () => {
    api.getAuditLogs
      .mockReturnValueOnce(throwError(() => new Error('network failed')))
      .mockReturnValueOnce(of(auditResponse));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const retryButton = (fixture.nativeElement as HTMLElement).querySelector('button.btn.primary');
    retryButton?.dispatchEvent(new Event('click'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getAuditLogs).toHaveBeenCalledTimes(2);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('admin@nytroz.local');
  });

  it('requires platform.audit.view on the audit logs route', () => {
    const route = adminRoutes.find((entry) => entry.path === 'audit-logs');

    expect(route?.data?.['requiredPermission']).toBe(platformPermissions.auditView);
  });
});
