import { describe, expect, it } from 'vitest';

import { mapCreateOptions, mapCreateTenantRequest } from './platform-tenant-create.mapper';
import { TenantCreateWizardState } from '../models/platform-tenant-create.model';

describe('mapCreateOptions country mapping', () => {
  it('maps countryCodes code/name to value/label', () => {
    const result = mapCreateOptions({
      plans: [],
      addons: [],
      catalogModules: [],
      billingStatuses: [],
      paymentMethods: [],
      countryCodes: [{ code: 'LK', name: 'Sri Lanka' }],
      currencies: [],
      timezones: [],
      locales: [],
      businessTypes: [],
      operatingModes: [],
      subscriptionStatuses: [],
      billingCycles: []
    });

    expect(result.countryCodes).toEqual([{ value: 'LK', label: 'Sri Lanka' }]);
  });
});

function createWizardState(overrides: Partial<TenantCreateWizardState> = {}): TenantCreateWizardState {
  return {
    businessInfo: {
      code: 'TEN-NEW',
      name: 'New Tenant',
      legalName: '',
      registrationNumber: '',
      taxNumber: '',
      baseCurrency: 'LKR',
      defaultTimezone: 'Asia/Colombo',
      defaultLocale: 'en-LK',
      operatingMode: 'unified_epos',
      businessType: 'retail',
      countryCode: 'LK',
      addressLine1: '123 Main Street',
      addressCity: 'Colombo',
      addressCountryCode: 'LK'
    },
    planSelection: { subscriptionPlanId: 'plan-1' },
    limitsAddons: { maxOutlets: 5, maxTills: 10, maxUsers: 20, addons: [] },
    featureEntitlements: { enabledFeatureIds: ['feature-1'], enabledFeatureCodes: [] },
    tenantAdmin: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@tenant.com', phone: '' },
    billingSubscription: {
      subscriptionType: 'PAID',
      billingStatus: 'pending',
      billingCycle: 'monthly',
      subscriptionStatus: 'trial',
      createDraftInvoice: true,
      autoRenew: true,
      invoiceEmail: 'billing@tenant.com',
      paymentMethod: 'manual',
      notes: ''
    },
    ...overrides
  };
}

describe('mapCreateTenantRequest wizard field persistence', () => {
  it('includes defaultLocale, operatingMode, businessType and countryCode with backend contract names', () => {
    const request = mapCreateTenantRequest(
      createWizardState({
        businessInfo: {
          code: 'TEN-GB',
          name: 'UK Tenant',
          legalName: '',
          registrationNumber: '',
          taxNumber: '',
          baseCurrency: 'GBP',
          defaultTimezone: 'Europe/London',
          defaultLocale: 'en-GB',
          operatingMode: 'pos_only',
          businessType: 'retail',
          countryCode: 'GB',
          addressLine1: '10 Downing Street',
          addressCity: 'London',
          addressCountryCode: 'GB'
        }
      })
    );

    expect(request).toEqual(
      expect.objectContaining({
        defaultLocale: 'en-GB',
        operatingMode: 'pos_only',
        businessType: 'retail',
        countryCode: 'GB',
        address: expect.objectContaining({ countryCode: 'GB' })
      })
    );
  });
});

describe('mapCreateTenantRequest billing mapping', () => {
  it('maps billing status pending for tenant create payload', () => {
    const request = mapCreateTenantRequest(createWizardState());

    expect(request.billingStatus).toBe('pending');
    expect(request.subscription?.subscriptionType).toBe('PAID');
    expect(request.subscription?.subscriptionStatus).toBe('trial');
    expect(request.subscription?.billingCycle).toBe('monthly');
    expect(request.subscription?.paymentMethod).toBe('manual');
  });

  it('sends explicit PAID subscriptionType', () => {
    const request = mapCreateTenantRequest(
      createWizardState({
        billingSubscription: {
          subscriptionType: 'PAID',
          billingStatus: 'pending',
          billingCycle: 'monthly',
          subscriptionStatus: 'active',
          createDraftInvoice: true,
          autoRenew: true,
          invoiceEmail: '',
          paymentMethod: 'manual',
          notes: ''
        }
      })
    );

    expect(request.subscription?.subscriptionType).toBe('PAID');
  });

  it('sends explicit TRIAL subscriptionType', () => {
    const request = mapCreateTenantRequest(
      createWizardState({
        billingSubscription: {
          subscriptionType: 'TRIAL',
          billingStatus: 'pending',
          billingCycle: 'monthly',
          subscriptionStatus: 'trial',
          createDraftInvoice: false,
          autoRenew: false,
          invoiceEmail: '',
          paymentMethod: 'manual',
          notes: ''
        }
      })
    );

    expect(request.subscription?.subscriptionType).toBe('TRIAL');
    expect(request.subscription?.billingCycle).toBe('monthly');
  });

  it('sends explicit DEMO subscriptionType without billingCycle demo', () => {
    const request = mapCreateTenantRequest(
      createWizardState({
        billingSubscription: {
          subscriptionType: 'DEMO',
          billingStatus: 'waived',
          billingCycle: 'yearly',
          subscriptionStatus: 'active',
          createDraftInvoice: false,
          autoRenew: false,
          invoiceEmail: '',
          paymentMethod: 'manual',
          notes: ''
        }
      })
    );

    expect(request.subscription?.subscriptionType).toBe('DEMO');
    expect(request.subscription?.billingCycle).toBe('yearly');
    expect(request.subscription?.billingCycle).not.toBe('demo');
  });

  it('does not derive subscriptionType from billingCycle', () => {
    const request = mapCreateTenantRequest(
      createWizardState({
        billingSubscription: {
          subscriptionType: '',
          billingStatus: 'pending',
          billingCycle: 'demo',
          subscriptionStatus: 'trial',
          createDraftInvoice: false,
          autoRenew: true,
          invoiceEmail: '',
          paymentMethod: 'manual',
          notes: ''
        }
      })
    );

    expect(request.subscription?.subscriptionType).toBeUndefined();
    expect(request.subscription?.billingCycle).toBeUndefined();
  });

  it('serializes annual billing cycle as yearly', () => {
    const request = mapCreateTenantRequest(
      createWizardState({
        billingSubscription: {
          subscriptionType: 'PAID',
          billingStatus: 'pending',
          billingCycle: 'annual',
          subscriptionStatus: 'active',
          createDraftInvoice: true,
          autoRenew: true,
          invoiceEmail: '',
          paymentMethod: 'manual',
          notes: ''
        }
      })
    );

    expect(request.subscription?.billingCycle).toBe('yearly');
  });

  it('does not send subscriptionStatus as billingStatus', () => {
    const request = mapCreateTenantRequest(
      createWizardState({
        billingSubscription: {
          subscriptionType: 'TRIAL',
          billingStatus: 'pending',
          billingCycle: 'monthly',
          subscriptionStatus: 'trial',
          createDraftInvoice: false,
          autoRenew: true,
          invoiceEmail: '',
          paymentMethod: 'manual',
          notes: ''
        }
      })
    );

    expect(request.billingStatus).toBe('pending');
    expect(request.billingStatus).not.toBe(request.subscription?.subscriptionStatus);
  });

  it('maps billing status pending separately from subscriptionStatus trial', () => {
    const request = mapCreateTenantRequest(
      createWizardState({
        billingSubscription: {
          subscriptionType: 'TRIAL',
          billingStatus: 'pending',
          billingCycle: 'monthly',
          subscriptionStatus: 'trial',
          createDraftInvoice: true,
          autoRenew: true,
          invoiceEmail: '',
          paymentMethod: 'manual',
          notes: ''
        }
      })
    );

    expect(request.billingStatus).toBe('pending');
    expect(request.subscription?.subscriptionStatus).toBe('trial');
    expect(request.subscription?.paymentMethod).toBe('manual');
  });
});

describe('mapCreateOptions billing cycles', () => {
  it('keeps only monthly/yearly and normalizes annual to yearly', () => {
    const result = mapCreateOptions({
      plans: [],
      addons: [],
      catalogModules: [],
      billingStatuses: [],
      paymentMethods: [],
      countryCodes: [],
      currencies: [],
      timezones: [],
      locales: [],
      businessTypes: [],
      operatingModes: [],
      subscriptionStatuses: [],
      billingCycles: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'annual', label: 'Annual' },
        { value: 'demo', label: 'Demo' },
        { value: 'both', label: 'Both' }
      ]
    });

    expect(result.billingCycles.map((item) => item.value)).toEqual(['monthly', 'yearly']);
  });
});
