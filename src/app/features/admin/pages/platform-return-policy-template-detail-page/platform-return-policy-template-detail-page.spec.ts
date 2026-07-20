import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformReturnPolicyTemplateApiService } from '../../services/platform-return-policy-template-api.service';
import { PlatformReturnPolicyTemplateDetailPage } from './platform-return-policy-template-detail-page';

describe('PlatformReturnPolicyTemplateDetailPage', () => {
  let api: {
    getTemplate: ReturnType<typeof vi.fn>;
    updateTemplate: ReturnType<typeof vi.fn>;
    deleteTemplate: ReturnType<typeof vi.fn>;
  };

  const detail = {
    id: '11111111-1111-4111-8111-111111111111',
    templateCode: '7DAYS',
    name: '7 Day Returns',
    returnWindowDays: 7,
    status: 'ACTIVE',
    createdAt: '2026-07-20T00:00:00Z',
    updatedAt: null
  };

  beforeEach(() => {
    api = {
      getTemplate: vi.fn(),
      updateTemplate: vi.fn(),
      deleteTemplate: vi.fn()
    };
  });

  async function createComponent(): Promise<ComponentFixture<PlatformReturnPolicyTemplateDetailPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformReturnPolicyTemplateDetailPage],
      providers: [
        provideRouter([]),
        { provide: PlatformReturnPolicyTemplateApiService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ templateId: detail.id }) },
            paramMap: of(convertToParamMap({ templateId: detail.id }))
          }
        },
        {
          provide: AccessControlService,
          useValue: {
            hasPermission: (permission: string) =>
              [
                platformPermissions.returnPolicyTemplatesView,
                platformPermissions.returnPolicyTemplatesUpdate,
                platformPermissions.returnPolicyTemplatesDelete,
                platformPermissions.returnPolicyTemplatesManage
              ].includes(permission as typeof platformPermissions.returnPolicyTemplatesView)
          }
        },
        {
          provide: ApiErrorService,
          useValue: {
            toSafeMessage: () => 'Detail failed safely',
            toFieldErrors: () => [],
            applyFieldErrors: () => undefined
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformReturnPolicyTemplateDetailPage);
    fixture.detectChanges();
    return fixture;
  }

  it('loads template details and prepopulates edit form', async () => {
    api.getTemplate.mockReturnValue(of(detail));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('7DAYS');
    fixture.componentInstance.startEdit();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.value.name).toBe('7 Day Returns');
  });

  it('persists update changes through the API', async () => {
    api.getTemplate.mockReturnValue(of(detail));
    api.updateTemplate.mockReturnValue(
      of({
        ...detail,
        name: 'Updated Name',
        updatedAt: '2026-07-20T01:00:00Z'
      })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.componentInstance.startEdit();
    fixture.componentInstance.form.patchValue({ name: 'Updated Name' });
    fixture.componentInstance.saveChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.updateTemplate).toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('updated successfully');
  });

  it('shows load error when detail request fails', async () => {
    api.getTemplate.mockReturnValue(throwError(() => new Error('fail')));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Detail failed safely');
  });
});
