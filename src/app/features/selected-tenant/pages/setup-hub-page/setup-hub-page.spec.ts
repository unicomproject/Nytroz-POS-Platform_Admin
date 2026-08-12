import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { AccessControlService } from '../../../../core/services/access-control.service';
import { allPlatformPermissionCodes } from '../../../../core/config/permission-keys';
import { SetupHubPage } from './setup-hub-page';

describe('SetupHubPage', () => {
  let fixture: ComponentFixture<SetupHubPage>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupHubPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ tenantId: 'tenant-1' })),
            snapshot: { paramMap: convertToParamMap({ tenantId: 'tenant-1' }) }
          }
        },
        {
          provide: AccessControlService,
          useValue: {
            hasPermission: (code: string) =>
              allPlatformPermissionCodes.includes(code as (typeof allPlatformPermissionCodes)[number])
          }
        }
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SetupHubPage);
    fixture.detectChanges();

    const request = httpTesting.expectOne('/api/v1/platform-admin/tenants/tenant-1/bootstrap/summary');
    request.flush({
      success: true,
      message: 'ok',
      data: {
        tenant: {
          id: 'tenant-1',
          name: 'ABC Retail',
          code: 'TEN-ABC',
          lifecycleStatus: 'ACTIVE',
          planName: 'Pro Plan'
        },
        modules: [
          {
            moduleKey: 'outlets',
            status: 'NOT_STARTED',
            count: 0,
            entitled: true,
            canConfigure: true,
            dependencyNotice: null
          },
          {
            moduleKey: 'tills',
            status: 'BLOCKED',
            count: 0,
            entitled: true,
            canConfigure: false,
            dependencyNotice: 'Requires at least one active outlet'
          },
          {
            moduleKey: 'roles',
            status: 'CONFIGURED',
            count: 0,
            entitled: true,
            canConfigure: true,
            dependencyNotice: null
          },
          {
            moduleKey: 'users',
            status: 'NOT_STARTED',
            count: 1,
            entitled: true,
            canConfigure: true,
            dependencyNotice: null
          },
          {
            moduleKey: 'products',
            status: 'NOT_STARTED',
            count: 0,
            entitled: true,
            canConfigure: true,
            dependencyNotice: null
          },
          {
            moduleKey: 'online_store',
            status: 'NOT_STARTED',
            count: 0,
            entitled: true,
            canConfigure: true,
            dependencyNotice: null
          }
        ]
      }
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('renders module cards from bootstrap summary', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Initial Setup');
    expect(text).toContain('Outlet Setup');
    expect(text).toContain('Till Setup');
    expect(text).toContain('Online Store');
    expect(text).toContain('ABC Retail');
  });
});
