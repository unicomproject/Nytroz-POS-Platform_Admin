import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { createSubscriptionPlanListResponse } from '../../../../testing/test-fixtures';
import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';
import { PlatformSubscriptionPlansPage } from './platform-subscription-plans-page';

describe('PlatformSubscriptionPlansPage', () => {
  let api: {
    getSubscriptionPlans: ReturnType<typeof vi.fn>;
    archiveSubscriptionPlan: ReturnType<typeof vi.fn>;
  };

  async function createComponent(): Promise<ComponentFixture<PlatformSubscriptionPlansPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformSubscriptionPlansPage],
      providers: [
        provideRouter([]),
        { provide: PlatformSubscriptionPlanApiService, useValue: api },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Plans failed safely' } },
        {
          provide: AccessControlService,
          useValue: { hasPermission: () => true }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformSubscriptionPlansPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    api = {
      getSubscriptionPlans: vi.fn(),
      archiveSubscriptionPlan: vi.fn()
    };
  });

  it('shows skeleton rows while loading', async () => {
    api.getSubscriptionPlans.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();
    expect(fixture.nativeElement.querySelector('.skeleton-row')).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('—');
  });

  it('renders plan rows returned by the backend response with mapped status label', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Subscription Plans');
    expect(text).toContain('Test Subscription Plan');
    expect(text).toContain('TEST-PLAN');
    expect(text).toContain('Published');
    expect(text).not.toContain('published');
  });

  it('sends active status filter when Published tab is selected', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.onTabChange('published');
    await fixture.whenStable();

    expect(api.getSubscriptionPlans).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'active' })
    );
  });

  it('sends retired status filter when Archived tab is selected', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.onTabChange('archived');
    await fixture.whenStable();

    expect(api.getSubscriptionPlans).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'retired' })
    );
  });

  it('maps backend status values to UI labels', async () => {
    api.getSubscriptionPlans.mockReturnValue(
      of(createSubscriptionPlanListResponse({
        items: [
          { ...createSubscriptionPlanListResponse().items[0], id: 'draft-plan', status: 'draft' },
          { ...createSubscriptionPlanListResponse().items[0], id: 'active-plan', status: 'active' },
          { ...createSubscriptionPlanListResponse().items[0], id: 'retired-plan', status: 'retired' }
        ],
        totalItems: 3
      }))
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Draft');
    expect(text).toContain('Published');
    expect(text).toContain('Archived');
  });

  it('shows empty state when no plans are returned', async () => {
    api.getSubscriptionPlans.mockReturnValue(
      of(createSubscriptionPlanListResponse({ items: [], totalItems: 0, statusCounts: { all: 0, draft: 0, published: 0, archived: 0 } }))
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No subscription plans found');
  });

  it('shows error state with retry when API fails', async () => {
    api.getSubscriptionPlans.mockReturnValue(throwError(() => new Error('network')));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Subscription plans could not be loaded');
    expect(text).toContain('Try again');
  });

  it('renders the supported row action controls', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[aria-label="View plan"]')).toBeTruthy();
    expect(root.querySelector('[aria-label="Edit plan"]')).toBeTruthy();
    expect(root.querySelector('[aria-label="Duplicate plan"]')).toBeTruthy();
    expect(root.querySelector('[aria-label="More actions"]')).toBeTruthy();
    expect(root.querySelector('.action-menu')).toBeNull();
  });

  it('links Create Plan to /admin/subscriptions/create', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const createLink = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')]
      .find((link) => link.textContent?.includes('Create Plan'));

    expect(createLink?.getAttribute('href')).toBe('/admin/subscriptions/create');
  });

  it('links a plan name to its dedicated detail route', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const planLink = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')]
      .find((link) => link.textContent?.includes('Test Subscription Plan'));

    expect(planLink?.getAttribute('href')).toContain('/admin/subscriptions/');
  });

  it('opens, closes, and switches the row action menu by plan id', async () => {
    const firstPlan = {
      ...createSubscriptionPlanListResponse().items[0],
      id: 'plan-1'
    };
    const secondPlan = { ...firstPlan, id: 'plan-2', planName: 'Second Plan' };
    api.getSubscriptionPlans.mockReturnValue(
      of(createSubscriptionPlanListResponse({ items: [firstPlan, secondPlan], totalItems: 2 }))
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const menuButtons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '[aria-label="More actions"]'
    );
    expect(fixture.componentInstance.openMenuId()).toBeNull();

    menuButtons[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.openMenuId()).toBe('plan-1');

    menuButtons[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.openMenuId()).toBeNull();

    menuButtons[0].click();
    menuButtons[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.openMenuId()).toBe('plan-2');
  });

  it('closes the row action menu after a successful action', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    api.archiveSubscriptionPlan.mockReturnValue(of({}));
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

    const fixture = await createComponent();
    fixture.componentInstance.toggleMenu('plan-1');
    fixture.componentInstance.archivePlan('plan-1');

    expect(api.archiveSubscriptionPlan).toHaveBeenCalledWith('plan-1');
    expect(fixture.componentInstance.openMenuId()).toBeNull();
  });
});
