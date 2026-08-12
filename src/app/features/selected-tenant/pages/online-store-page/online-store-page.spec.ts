import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { OnlineStorePage } from './online-store-page';

describe('OnlineStorePage', () => {
  let fixture: ComponentFixture<OnlineStorePage>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnlineStorePage],
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
        }
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OnlineStorePage);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('shows not-entitled panel when online_store entitlement is false', () => {
    const summary = httpTesting.expectOne('/api/v1/platform-admin/tenants/tenant-1/bootstrap/summary');
    summary.flush({
      success: true,
      message: 'ok',
      data: {
        tenant: {
          id: 'tenant-1',
          name: 'ABC Retail',
          code: 'TEN-ABC',
          lifecycleStatus: 'ACTIVE',
          planName: 'Starter'
        },
        modules: []
      }
    });

    const onlineStore = httpTesting.expectOne(
      '/api/v1/platform-admin/tenants/tenant-1/bootstrap/online-store'
    );
    onlineStore.flush({
      success: true,
      message: 'ok',
      data: {
        entitled: false,
        storeStatus: 'DRAFT',
        taxDisplayMode: 'MATCH_TENANT',
        clickCollectEntitled: false,
        clickCollectConfigured: false,
        dependencyNotice: null
      }
    });

    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Online Store not entitled');
    expect(text).toContain('online_store');
  });
});
