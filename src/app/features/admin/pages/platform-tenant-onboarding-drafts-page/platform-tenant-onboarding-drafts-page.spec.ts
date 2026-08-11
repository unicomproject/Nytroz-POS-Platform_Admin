import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { TenantOnboardingDraftSummary } from '../../models/platform-tenant-onboarding.model';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { PlatformTenantOnboardingDraftsPage } from './platform-tenant-onboarding-drafts-page';

describe('PlatformTenantOnboardingDraftsPage', () => {
  let api: {
    listOnboardingDrafts: ReturnType<typeof vi.fn>;
    discardOnboardingDraft: ReturnType<typeof vi.fn>;
  };
  let access: { hasPermission: ReturnType<typeof vi.fn> };

  const draft: TenantOnboardingDraftSummary = {
    id: 'draft-1',
    displayName: 'Acme Retail',
    tenantCode: 'ACME01',
    status: 'in_progress',
    currentStep: 4,
    progressPercent: 57,
    ownerPlatformUserId: 'user-1',
    updatedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    expiresAt: '2026-09-09T00:00:00Z',
    version: 3
  };

  beforeEach(async () => {
    api = {
      listOnboardingDrafts: vi.fn().mockReturnValue(of([draft])),
      discardOnboardingDraft: vi.fn().mockReturnValue(of(void 0))
    };
    access = {
      hasPermission: vi.fn(
        (permission?: string) =>
          permission === platformPermissions.tenantsCreate ||
          permission === platformPermissions.tenantsUpdate
      )
    };

    await TestBed.configureTestingModule({
      imports: [PlatformTenantOnboardingDraftsPage],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: PlatformTenantApiService, useValue: api },
        { provide: AccessControlService, useValue: access },
        {
          provide: ApiErrorService,
          useValue: {
            toSafeMessage: (error: unknown) =>
              (error as { error?: { message?: string } })?.error?.message ?? 'Safe failure'
          }
        }
      ]
    }).compileComponents();
  });

  function createFixture(): ComponentFixture<PlatformTenantOnboardingDraftsPage> {
    const fixture = TestBed.createComponent(PlatformTenantOnboardingDraftsPage);
    fixture.detectChanges();
    return fixture;
  }

  it('renders PageHeader, Create Tenant CTA, context band, and loads drafts once', () => {
    const fixture = createFixture();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Onboarding Drafts');
    expect(text).toContain('Resume or manage saved tenant onboarding work.');
    expect(text).toContain('Resume unfinished tenant onboarding');
    expect(text).toContain('Create Tenant');
    expect(text).toContain('Acme Retail');
    expect(text).toContain('ACME01');
    expect(text).toContain('Step 4 of 7');
    expect(text).toContain('Billing / Payment Setup');
    expect(text).toContain('In progress');
    expect(text).toContain('Resume Setup');
    expect(api.listOnboardingDrafts).toHaveBeenCalledTimes(1);
    expect(api.listOnboardingDrafts).toHaveBeenCalledWith(true);
    expect(text).not.toMatch(/Search tenants|type=\"search\"|Rows per page|Page 1 of/i);
  });

  it('shows empty state with Create Tenant', () => {
    api.listOnboardingDrafts.mockReturnValue(of([]));
    const fixture = createFixture();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No drafts of yours yet');
    expect(text).toContain('Create Tenant');
  });

  it('shows error state with retry', () => {
    api.listOnboardingDrafts.mockReturnValue(throwError(() => ({ error: { message: 'List failed' } })));
    const fixture = createFixture();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Unable to load onboarding drafts');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('List failed');

    api.listOnboardingDrafts.mockReturnValue(of([draft]));
    fixture.componentInstance.reload();
    fixture.detectChanges();
    expect(api.listOnboardingDrafts).toHaveBeenCalledTimes(2);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Acme Retail');
  });

  it('supports My Drafts and All Drafts scope with one request each', () => {
    const fixture = createFixture();
    expect(api.listOnboardingDrafts).toHaveBeenCalledWith(true);

    fixture.componentInstance.setMineScope(false);
    fixture.detectChanges();
    expect(api.listOnboardingDrafts).toHaveBeenCalledTimes(2);
    expect(api.listOnboardingDrafts).toHaveBeenLastCalledWith(false);

    fixture.componentInstance.setMineScope(false);
    expect(api.listOnboardingDrafts).toHaveBeenCalledTimes(2);
  });

  it('hides All Drafts when tenants.update is unavailable', () => {
    access.hasPermission.mockImplementation(
      (permission?: string) => permission === platformPermissions.tenantsCreate
    );
    const fixture = createFixture();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Create Tenant');
    expect(text).not.toContain('All Drafts');
    expect(text).not.toContain('My Drafts');
  });

  it('wires Resume Setup to the UI-3A draft route', () => {
    const fixture = createFixture();
    const route = fixture.componentInstance.resumeRoute(draft);
    expect(route).toEqual(['/admin/tenants/onboarding', 'draft-1']);

    const resumeHosts = fixture.debugElement.queryAll(By.directive(RouterLink));
    const resume = resumeHosts.find((node) =>
      ((node.nativeElement as HTMLElement).textContent ?? '').includes('Resume Setup')
    );
    expect(resume).toBeTruthy();
  });

  it('wires Create Tenant CTA to the UI-3A create route', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.createTenantRoute).toBe('/admin/tenants/create');

    const createHosts = fixture.debugElement.queryAll(By.directive(RouterLink));
    const create = createHosts.find((node) =>
      ((node.nativeElement as HTMLElement).textContent ?? '').includes('Create Tenant')
    );
    expect(create).toBeTruthy();
  });

  it('opens discard confirmation and cancels with zero mutations', () => {
    const fixture = createFixture();
    fixture.componentInstance.openDiscard(draft);
    fixture.detectChanges();
    expect(fixture.componentInstance.discardOpen()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Discard onboarding draft?');

    fixture.componentInstance.cancelDiscard();
    fixture.detectChanges();
    expect(fixture.componentInstance.discardOpen()).toBe(false);
    expect(api.discardOnboardingDraft).not.toHaveBeenCalled();
  });

  it('confirms discard with one mutation and reloads the list', () => {
    const fixture = createFixture();
    fixture.componentInstance.openDiscard(draft);
    fixture.detectChanges();
    fixture.componentInstance.confirmDiscard();
    fixture.detectChanges();

    expect(api.discardOnboardingDraft).toHaveBeenCalledTimes(1);
    expect(api.discardOnboardingDraft).toHaveBeenCalledWith('draft-1', 3);
    expect(api.listOnboardingDrafts).toHaveBeenCalledTimes(2);
  });

  it('shows concurrency conflict guidance on discard failure', () => {
    api.discardOnboardingDraft.mockReturnValue(
      throwError(() => ({
        error: {
          errorCode: 'platform_tenant_onboarding.concurrency_conflict',
          message: 'Draft changed'
        }
      }))
    );
    const fixture = createFixture();
    fixture.componentInstance.openDiscard(draft);
    fixture.componentInstance.confirmDiscard();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'This draft changed since the list was loaded. Refresh the list and try again.'
    );
  });

  it('does not allow resume or discard for finalizing drafts', () => {
    api.listOnboardingDrafts.mockReturnValue(of([{ ...draft, status: 'finalizing', id: 'draft-2' }]));
    const fixture = createFixture();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Finalizing');
    expect(text).not.toContain('Resume Setup');
    expect(text).not.toMatch(/\bDiscard\b/);
  });

  it('shows loading skeleton before drafts resolve', () => {
    const pending = new Subject<TenantOnboardingDraftSummary[]>();
    api.listOnboardingDrafts.mockReturnValue(pending.asObservable());
    const fixture = TestBed.createComponent(PlatformTenantOnboardingDraftsPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-loading-skeleton')).toBeTruthy();
    pending.next([draft]);
    pending.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Acme Retail');
  });

  it('renders expiry and updated context without search or pagination controls', () => {
    const fixture = createFixture();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toMatch(/Expires/);
    expect(text).toMatch(/min ago|Just now|hour|day/);
    expect((fixture.nativeElement as HTMLElement).querySelector('input[type="search"]')).toBeNull();
    expect(text).not.toMatch(/Page \d+|Rows per page|Sort by/i);
  });
});
