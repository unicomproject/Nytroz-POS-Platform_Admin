import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformSettings } from '../../models/platform-settings.model';
import { TenantCreateOptions } from '../../models/platform-tenant-create.model';
import { PlatformSettingsApiService } from '../../services/platform-settings-api.service';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { PlatformSystemSettingsPage } from './platform-system-settings-page';

describe('PlatformSystemSettingsPage', () => {
  let settingsApi: {
    getSettings: ReturnType<typeof vi.fn>;
    updateSettings: ReturnType<typeof vi.fn>;
  };
  let tenantApi: { getCreateOptions: ReturnType<typeof vi.fn> };
  let accessControl: { hasPermission: ReturnType<typeof vi.fn> };

  const createOptions: TenantCreateOptions = {
    plans: [],
    addons: [],
    catalogModules: [],
    billingStatuses: [],
    paymentMethods: [],
    countryCodes: [{ value: 'LK', label: 'Sri Lanka (LK)' }],
    currencies: [{ value: 'LKR', label: 'LKR - Sri Lankan Rupee (LKR)' }],
    timezones: [{ value: 'Asia/Colombo', label: 'Asia/Colombo' }],
    locales: [{ value: 'en-LK', label: 'en-LK (English - Sri Lanka)' }],
    businessTypes: [],
    operatingModes: [],
    subscriptionStatuses: [],
    billingCycles: []
  };

  const loadedSettings: PlatformSettings = {
    platformDisplayName: 'OneVerz',
    supportEmail: 'support@example.com',
    defaultCountryCode: 'LK',
    defaultCurrencyCode: 'LKR',
    defaultTimezone: 'Asia/Colombo',
    defaultLocale: 'en-LK',
    updatedAt: '2026-07-03T12:00:00Z',
    updatedByPlatformUserId: 'user-1'
  };

  async function createComponent(): Promise<ComponentFixture<PlatformSystemSettingsPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformSystemSettingsPage],
      providers: [
        { provide: PlatformSettingsApiService, useValue: settingsApi },
        { provide: PlatformTenantApiService, useValue: tenantApi },
        { provide: AccessControlService, useValue: accessControl },
        {
          provide: ApiErrorService,
          useValue: {
            toSafeMessage: () => 'Settings failed safely',
            toFieldErrors: () => [],
            applyFieldErrors: vi.fn()
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformSystemSettingsPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    settingsApi = {
      getSettings: vi.fn(),
      updateSettings: vi.fn()
    };
    tenantApi = {
      getCreateOptions: vi.fn()
    };
    accessControl = {
      hasPermission: vi.fn((permission: string) =>
        [platformPermissions.settingsView, platformPermissions.settingsUpdate].includes(
          permission as typeof platformPermissions.settingsView
        )
      )
    };
  });

  it('shows a loading state while settings are pending', async () => {
    settingsApi.getSettings.mockReturnValue(new Subject().asObservable());
    tenantApi.getCreateOptions.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading platform settings');
  });

  it('loads settings from the API and renders the form', async () => {
    settingsApi.getSettings.mockReturnValue(of(loadedSettings));
    tenantApi.getCreateOptions.mockReturnValue(of(createOptions));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(settingsApi.getSettings).toHaveBeenCalled();
    expect(tenantApi.getCreateOptions).toHaveBeenCalled();
    expect(root.textContent).toContain('General Platform Settings');
    expect(root.textContent).toContain('Configuration Summary');
    expect((fixture.componentInstance.form.controls.platformDisplayName.value)).toBe('OneVerz');
    expect(root.textContent).toContain('Sri Lanka (LK)');
  });

  it('shows an error state when settings fail to load', async () => {
    settingsApi.getSettings.mockReturnValue(throwError(() => new Error('network')));
    tenantApi.getCreateOptions.mockReturnValue(of(createOptions));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Platform settings could not be loaded');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Settings failed safely');
  });

  it('saves valid changes through the API', async () => {
    settingsApi.getSettings.mockReturnValue(of(loadedSettings));
    tenantApi.getCreateOptions.mockReturnValue(of(createOptions));
    settingsApi.updateSettings.mockReturnValue(
      of({
        ...loadedSettings,
        platformDisplayName: 'TM-EPOS'
      })
    );

    const fixture = await createComponent();
    await fixture.whenStable();

    fixture.componentInstance.form.controls.platformDisplayName.setValue('TM-EPOS');
    fixture.componentInstance.saveChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(settingsApi.updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ platformDisplayName: 'TM-EPOS' })
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Platform settings saved successfully.');
  });

  it('shows validation errors for invalid form values', async () => {
    settingsApi.getSettings.mockReturnValue(of(loadedSettings));
    tenantApi.getCreateOptions.mockReturnValue(of(createOptions));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.form.controls.platformDisplayName.setValue('');
    fixture.componentInstance.form.controls.supportEmail.setValue('not-an-email');
    fixture.componentInstance.form.controls.defaultCountryCode.setValue('LKR');
    fixture.componentInstance.saveChanges();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Platform display name is required.');
    expect(text).toContain('Support email must be a valid email address.');
    expect(text).toContain('Country must be a 2-letter ISO code');
    expect(settingsApi.updateSettings).not.toHaveBeenCalled();
  });

  it('reset changes restores API values', async () => {
    settingsApi.getSettings.mockReturnValue(of(loadedSettings));
    tenantApi.getCreateOptions.mockReturnValue(of(createOptions));

    const fixture = await createComponent();
    await fixture.whenStable();

    fixture.componentInstance.form.controls.platformDisplayName.setValue('Changed Name');
    fixture.componentInstance.resetChanges();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.platformDisplayName.value).toBe('OneVerz');
  });

  it('renders read-only mode without update permission', async () => {
    accessControl.hasPermission.mockImplementation(
      (permission: string) => permission === platformPermissions.settingsView
    );
    settingsApi.getSettings.mockReturnValue(of(loadedSettings));
    tenantApi.getCreateOptions.mockReturnValue(of(createOptions));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('view-only access');
    expect(root.textContent).not.toContain('Save Changes');
    expect(fixture.componentInstance.form.disabled).toBe(true);
  });

  it('renders settings when create-options fails', async () => {
    settingsApi.getSettings.mockReturnValue(of(loadedSettings));
    tenantApi.getCreateOptions.mockReturnValue(throwError(() => new Error('options failed')));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('General Platform Settings');
    expect(root.textContent).toContain('OneVerz');
    expect(root.textContent).toContain('Lookup options could not be loaded.');
  });
});
