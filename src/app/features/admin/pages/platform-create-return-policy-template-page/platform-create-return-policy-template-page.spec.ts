import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformReturnPolicyTemplateApiService } from '../../services/platform-return-policy-template-api.service';
import { PlatformCreateReturnPolicyTemplatePage } from './platform-create-return-policy-template-page';

describe('PlatformCreateReturnPolicyTemplatePage', () => {
  let api: { createTemplate: ReturnType<typeof vi.fn> };
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    api = { createTemplate: vi.fn() };
  });

  async function createComponent(): Promise<ComponentFixture<PlatformCreateReturnPolicyTemplatePage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformCreateReturnPolicyTemplatePage],
      providers: [
        provideRouter([]),
        { provide: PlatformReturnPolicyTemplateApiService, useValue: api },
        {
          provide: AccessControlService,
          useValue: {
            hasPermission: (permission: string) =>
              permission === platformPermissions.returnPolicyTemplatesCreate ||
              permission === platformPermissions.returnPolicyTemplatesManage
          }
        },
        {
          provide: ApiErrorService,
          useValue: {
            toSafeMessage: () => 'Create failed safely',
            toFieldErrors: () => [],
            applyFieldErrors: () => undefined
          }
        }
      ]
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(PlatformCreateReturnPolicyTemplatePage);
    fixture.detectChanges();
    return fixture;
  }

  it('maps and submits create payload to the API', async () => {
    api.createTemplate.mockReturnValue(
      of({
        id: '22222222-2222-4222-8222-222222222222',
        templateCode: 'TEST',
        name: 'Test Template',
        returnWindowDays: 5,
        status: 'ACTIVE',
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: null
      })
    );

    const fixture = await createComponent();
    fixture.componentInstance.form.patchValue({
      templateCode: 'TEST',
      name: 'Test Template',
      returnWindowDays: 5,
      status: 'ACTIVE'
    });
    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(api.createTemplate).toHaveBeenCalledWith({
      templateCode: 'TEST',
      name: 'Test Template',
      returnWindowDays: 5,
      status: 'ACTIVE'
    });
    expect(navigateSpy).toHaveBeenCalledWith([
      '/admin/return-policy-templates',
      '22222222-2222-4222-8222-222222222222'
    ]);
  });

  it('shows validation errors for required fields', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(api.createTemplate).not.toHaveBeenCalled();
    expect(fixture.componentInstance.fieldMessage('templateCode', 'Template code')).toContain('required');
  });

  it('shows API error message on create failure', async () => {
    api.createTemplate.mockReturnValue(throwError(() => new Error('fail')));

    const fixture = await createComponent();
    fixture.componentInstance.form.patchValue({
      templateCode: 'TEST',
      name: 'Test Template',
      returnWindowDays: null,
      status: 'ACTIVE'
    });
    fixture.componentInstance.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Create failed safely');
  });
});
