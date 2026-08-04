import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { createTenantCreateOptions } from '../../../../testing/test-fixtures';
import { TenantOnboardingDraft } from '../../models/platform-tenant-onboarding.model';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { PlatformCreateTenantPage } from './platform-create-tenant-page';

describe('PlatformCreateTenantPage durable onboarding', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let router: Router;
  const draft: TenantOnboardingDraft = {
    id: 'draft-1', ownerPlatformUserId: 'user-1', status: 'in_progress', currentStep: 1,
    completedSteps: [], progressPercent: 0,
    payload: { basicDetails: null, businessContact: null, plan: null, billing: null, entitlements: null, tenantAdmin: null },
    schemaVersion: 1, version: 1, createdAt: '2026-08-04T00:00:00Z', updatedAt: '2026-08-04T00:00:00Z',
    expiresAt: '2026-09-03T00:00:00Z', createdTenantId: null, warnings: []
  };

  beforeEach(async () => {
    api = {
      getCreateOptions: vi.fn().mockReturnValue(of(createTenantCreateOptions({
        defaults: { countryCode: 'LK', currencyCode: 'LKR', timezone: 'Asia/Colombo', locale: 'en-LK', billingCycle: 'monthly' }
      }))),
      createOnboardingDraft: vi.fn().mockReturnValue(of(draft)),
      saveOnboardingDraft: vi.fn().mockReturnValue(of({ ...draft, version: 2, progressPercent: 14 })),
      getOnboardingDraft: vi.fn().mockReturnValue(of(draft)),
      finalizeOnboardingDraft: vi.fn().mockReturnValue(of({
        tenantId: 'tenant-1', draftId: 'draft-1', operationId: 'operation-1', tenantStatus: 'pending_payment',
        provisioningStatus: 'SUCCEEDED', paymentStatus: 'PENDING', invitationStatus: 'NOT_ELIGIBLE',
        createdAt: '2026-08-04T00:00:00Z', idempotentReplay: false
      }))
    };
    await TestBed.configureTestingModule({
      imports: [PlatformCreateTenantPage],
      providers: [provideRouter([]), { provide: PlatformTenantApiService, useValue: api }, {
        provide: ApiErrorService, useValue: {
          toSafeMessage: (error: unknown) => (error as { error?: { message?: string } })?.error?.message ?? 'Safe failure',
          toFieldErrors: () => [], applyFieldErrors: vi.fn()
        }
      }]
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  function fixture(): ComponentFixture<PlatformCreateTenantPage> {
    const value = TestBed.createComponent(PlatformCreateTenantPage); value.detectChanges(); return value;
  }
  function fillValid(component: PlatformCreateTenantPage): void {
    component.businessInfoForm.patchValue({
      code: 'TEN-NEW', tenantSlug: 'ten-new', name: 'New Tenant', legalName: 'New Tenant Legal', businessType: 'retail',
      countryCode: 'LK', baseCurrency: 'LKR', defaultTimezone: 'Asia/Colombo', defaultLocale: 'en-LK', operatingMode: 'unified_epos',
      addressLine1: '123 Main Street', addressCountryCode: 'LK', primaryContactName: 'Ada', primaryContactEmail: 'ada@tenant.test',
      primaryContactPhone: '+94112223344', billingContactName: 'Billing', billingContactEmail: 'billing@tenant.test'
    });
    component.selectPlan('plan-1');
    component.limitsAddonsForm.patchValue({ maxOutlets: 5, maxTills: 10, maxUsers: 20 });
    const feature = component.createOptions().catalogModules[0].features[0];
    component.toggleFeature(feature, { target: { checked: true } } as unknown as Event);
    component.tenantAdminForm.patchValue({ firstName: 'Ada', email: 'ada@tenant.test' });
    component.billingSubscriptionForm.patchValue({ subscriptionType: 'PAID', billingStatus: 'pending', billingCycle: 'monthly',
      subscriptionStatus: 'active', invoiceEmail: 'billing@tenant.test', paymentMethod: 'manual' });
  }

  it('renders the exact canonical seven-step order', () => {
    const component = fixture().componentInstance;
    expect(component.steps.map((step) => step.label)).toEqual([
      'Tenant Basic Details', 'Business & Contact Information', 'Subscription Plan', 'Billing / Payment Setup',
      'Feature Entitlements', 'Tenant Admin User', 'Review, Create & Activation'
    ]);
  });
  it('loads authoritative create options', () => expect(fixture().componentInstance.createOptions().plans).toHaveLength(1));
  it('uses server country default', () => expect(fixture().componentInstance.businessInfoForm.controls.countryCode.value).toBe('LK'));
  it('uses server currency default', () => expect(fixture().componentInstance.businessInfoForm.controls.baseCurrency.value).toBe('LKR'));
  it('uses server timezone default', () => expect(fixture().componentInstance.businessInfoForm.controls.defaultTimezone.value).toBe('Asia/Colombo'));
  it('uses server locale default', () => expect(fixture().componentInstance.businessInfoForm.controls.defaultLocale.value).toBe('en-LK'));
  it('uses server billing-cycle default', () => expect(fixture().componentInstance.billingSubscriptionForm.controls.billingCycle.value).toBe('monthly'));
  it('does not select a geographic fallback when the server default is null', () => {
    api['getCreateOptions'].mockReturnValueOnce(of(createTenantCreateOptions({ defaults: { countryCode: null, currencyCode: null, timezone: null, locale: null, billingCycle: null } })));
    const component = fixture().componentInstance; expect(component.businessInfoForm.controls.countryCode.value).toBe('');
  });
  it('blocks step one until required values are valid', () => expect(fixture().componentInstance.isCurrentStepValid()).toBe(false));
  it('advances completed steps and saves the durable draft', () => {
    const component = fixture().componentInstance; fillValid(component); component.currentStep.set('business-info'); component.nextStep();
    expect(component.currentStep()).toBe('plan-selection'); expect(api['createOnboardingDraft']).toHaveBeenCalledOnce();
  });
  it('provides an explicit Save Draft action', () => expect((fixture().nativeElement as HTMLElement).textContent).toContain('Save Draft'));
  it('creates a draft on first explicit save', () => { const component = fixture().componentInstance; component.saveDraft(); expect(api['createOnboardingDraft']).toHaveBeenCalledOnce(); });
  it('updates a draft with its latest version', () => {
    const component = fixture().componentInstance; component.saveDraft(); component.saveDraft();
    expect(api['saveOnboardingDraft']).toHaveBeenCalledWith('draft-1', 1, expect.any(Object), 1);
  });
  it('shows saved status and last-saved time', () => { const component = fixture().componentInstance; component.saveDraft(); expect(component.saveState()).toBe('saved'); expect(component.lastSavedAt()).not.toBeNull(); });
  it('shows a safe save failure state', () => {
    api['createOnboardingDraft'].mockReturnValueOnce(throwError(() => new Error('network'))); const component = fixture().componentInstance;
    component.saveDraft(); expect(component.saveState()).toBe('failed'); expect(component.errorMessage()).toBe('Safe failure');
  });
  it('persists contact and address data in the structured payload', () => {
    const component = fixture().componentInstance; fillValid(component); component.saveDraft();
    const payload = api['createOnboardingDraft'].mock.calls[0][0]; expect(payload.businessContact.primaryContact.email).toBe('ada@tenant.test');
  });
  it('persists explicit slug separately from tenant code', () => {
    const component = fixture().componentInstance; fillValid(component); component.saveDraft();
    expect(api['createOnboardingDraft'].mock.calls[0][0].basicDetails.tenantSlug).toBe('ten-new');
  });
  it('persists the server-selected plan and billing cycle', () => {
    const component = fixture().componentInstance; fillValid(component); component.saveDraft();
    expect(api['createOnboardingDraft'].mock.calls[0][0].plan).toEqual(expect.objectContaining({ subscriptionPlanId: 'plan-1', billingCycle: 'monthly' }));
  });
  it('persists effective feature selections', () => {
    const component = fixture().componentInstance; fillValid(component); component.saveDraft();
    expect(api['createOnboardingDraft'].mock.calls[0][0].entitlements.featureIds).toContain('feature-1');
  });
  it('keeps future steps inaccessible when the current step is invalid', () => { const component = fixture().componentInstance; component.nextStep(); expect(component.currentStep()).toBe('business-info'); });
  it('allows completed steps to be revisited', () => { const component = fixture().componentInstance; fillValid(component); component.currentStep.set('plan-selection'); component.goBack(); expect(component.currentStep()).toBe('business-info'); });
  it('reuses one idempotency key for a logical final submission retry', () => {
    const component = fixture().componentInstance; fillValid(component); component.currentStep.set('review-create'); component.saveDraft(); component.createTenant();
    const first = api['finalizeOnboardingDraft'].mock.calls[0][2];
    api['finalizeOnboardingDraft'].mockReturnValueOnce(throwError(() => new Error('timeout'))); component.createTenant();
    expect(api['finalizeOnboardingDraft'].mock.calls[1][2]).toBe(first);
  });
  it('routes finalization to operation status without query-string secrets', () => {
    const component = fixture().componentInstance; fillValid(component); component.currentStep.set('review-create'); component.saveDraft(); component.createTenant();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/tenants/onboarding/operations', 'operation-1']);
  });
  it('disables overlapping draft saves', () => { const component = fixture().componentInstance; component.isSaving.set(true); component.saveDraft(); expect(api['createOnboardingDraft']).not.toHaveBeenCalled(); });
  it('shows progress from the backend response', () => { const component = fixture().componentInstance; component.saveDraft(); component.saveDraft(); expect(component.progressPercent()).toBe(14); });
  it('normalizes annual billing cycle to yearly in the draft', () => {
    const component = fixture().componentInstance; fillValid(component); component.billingSubscriptionForm.controls.billingCycle.setValue('annual'); component.saveDraft();
    expect(api['createOnboardingDraft'].mock.calls[0][0].plan.billingCycle).toBe('yearly');
  });
  it('does not expose temporary-password controls', () => expect((fixture().nativeElement as HTMLElement).textContent).not.toContain('Temporary Password'));
});
