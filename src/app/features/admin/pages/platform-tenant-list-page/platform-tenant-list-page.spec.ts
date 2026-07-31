import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  createTenantFilterOptions,
  createTenantListResponse,
  createTenantSummary
} from '../../../../testing/test-fixtures';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { PlatformTenantListPage } from './platform-tenant-list-page';

describe('PlatformTenantListPage', () => {
  let api: {
    getTenants: ReturnType<typeof vi.fn>;
    getSummary: ReturnType<typeof vi.fn>;
    getFilterOptions: ReturnType<typeof vi.fn>;
  };

  async function createComponent(): Promise<ComponentFixture<PlatformTenantListPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformTenantListPage],
      providers: [
        provideRouter([]),
        { provide: PlatformTenantApiService, useValue: api },
        { provide: AccessControlService, useValue: { hasPermission: () => true } },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Tenant list failed safely' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformTenantListPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    api = {
      getTenants: vi.fn(),
      getSummary: vi.fn(),
      getFilterOptions: vi.fn()
    };
  });

  it('shows a loading state while the API request is pending', async () => {
    api.getSummary.mockReturnValue(new Subject().asObservable());
    api.getFilterOptions.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading tenant data');
  });

  it('renders KPI values returned by the backend response', async () => {
    api.getSummary.mockReturnValue(of(createTenantSummary()));
    api.getFilterOptions.mockReturnValue(of(createTenantFilterOptions()));
    api.getTenants.mockReturnValue(of(createTenantListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Total Tenants');
    expect(text).toContain('Active Tenants');
    expect(text).toContain('Trial Tenants');
    expect(text).toContain('3');
    expect(text).toContain('2');
    expect(text).toContain('1');
  });

  it('renders tenant rows returned by the backend response', async () => {
    api.getSummary.mockReturnValue(of(createTenantSummary()));
    api.getFilterOptions.mockReturnValue(of(createTenantFilterOptions()));
    api.getTenants.mockReturnValue(of(createTenantListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Demo Tenant Alpha');
    expect(text).toContain('demo-alpha');
    expect(text).toContain('Professional');
    expect(text).toContain('View');
    expect(text).not.toContain('No email on record');
    expect(text).not.toContain('Sydney Football Stadium');
  });

  it('shows an empty state when the backend returns no tenants', async () => {
    api.getSummary.mockReturnValue(of(createTenantSummary({ totalTenants: 0, activeTenants: 0, trialTenants: 0 })));
    api.getFilterOptions.mockReturnValue(of(createTenantFilterOptions()));
    api.getTenants.mockReturnValue(of(createTenantListResponse({ items: [], totalCount: 0, totalPages: 0 })));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No tenants match the current filters');
  });

  it('shows a safe error state on API failure', async () => {
    api.getSummary.mockReturnValue(throwError(() => new Error('network failed')));
    api.getFilterOptions.mockReturnValue(of(createTenantFilterOptions()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tenant list could not be loaded');
    expect(text).toContain('Tenant list failed safely');
  });

  it('reloads data when filters change and reset clears filters', async () => {
    api.getSummary.mockReturnValue(of(createTenantSummary()));
    api.getFilterOptions.mockReturnValue(of(createTenantFilterOptions()));
    api.getTenants.mockReturnValue(of(createTenantListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.onStatusChange('Active');
    expect(api.getTenants).toHaveBeenCalledTimes(2);

    component.resetFilters();
    expect(component.statusFilter()).toBe('');
    expect(component.searchTerm()).toBe('');
    expect(api.getTenants).toHaveBeenCalledTimes(3);
  });
});
