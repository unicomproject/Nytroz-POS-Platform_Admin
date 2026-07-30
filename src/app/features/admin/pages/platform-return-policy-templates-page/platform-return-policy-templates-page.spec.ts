import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { adminRoutes } from '../../routes/admin.routes';
import { ReturnPolicyTemplateListResponse } from '../../models/platform-return-policy-template.model';
import { PlatformReturnPolicyTemplateApiService } from '../../services/platform-return-policy-template-api.service';
import { PlatformReturnPolicyTemplatesPage } from './platform-return-policy-templates-page';

describe('PlatformReturnPolicyTemplatesPage', () => {
  let api: { getTemplates: ReturnType<typeof vi.fn> };
  let accessControl: { hasPermission: ReturnType<typeof vi.fn> };

  const listResponse: ReturnPolicyTemplateListResponse = {
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
    totalCount: 1,
    totalPages: 1
  };

  async function createComponent(): Promise<ComponentFixture<PlatformReturnPolicyTemplatesPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformReturnPolicyTemplatesPage],
      providers: [
        provideRouter([]),
        { provide: PlatformReturnPolicyTemplateApiService, useValue: api },
        { provide: AccessControlService, useValue: accessControl },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Templates failed safely' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformReturnPolicyTemplatesPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    api = { getTemplates: vi.fn() };
    accessControl = {
      hasPermission: vi.fn((permission: string) =>
        [
          platformPermissions.returnPolicyTemplatesView,
          platformPermissions.returnPolicyTemplatesCreate,
          platformPermissions.returnPolicyTemplatesManage
        ].includes(permission as typeof platformPermissions.returnPolicyTemplatesView)
      )
    };
  });

  it('loads templates and renders rows from the API', async () => {
    api.getTemplates.mockReturnValue(of(listResponse));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getTemplates).toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('7DAYS');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Create Template');
  });

  it('shows an error state when the API fails', async () => {
    api.getTemplates.mockReturnValue(throwError(() => new Error('fail')));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Templates failed safely');
  });

  it('shows a loading state while the request is pending', async () => {
    api.getTemplates.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading return policy templates');
  });

  it('registers route guard metadata for view permission', () => {
    const route = (adminRoutes[0]?.children ?? adminRoutes).find((entry) => entry.path === 'return-policy-templates');
    expect(route?.data?.['requiredPermission']).toBe(platformPermissions.returnPolicyTemplatesView);
  });
});
