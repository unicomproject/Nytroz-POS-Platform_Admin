import { TestBed } from '@angular/core/testing';

import { SelectedTenantContextService } from './selected-tenant-context.service';

describe('SelectedTenantContextService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('stores summary and clears all feature state on switch/exit', () => {
    const service = TestBed.inject(SelectedTenantContextService);

    service.setSummary({
      tenant: {
        tenantId: 'tenant-a',
        tenantName: 'Tenant A',
        tenantCode: 'TEN-A',
        lifecycleStatus: 'ACTIVE',
        planName: 'Pro'
      },
      modules: [
        {
          moduleKey: 'outlets',
          status: 'CONFIGURED',
          count: 1,
          entitled: true,
          canConfigure: true,
          dependencyNotice: null
        }
      ]
    });
    service.rememberOutlet({ outletId: 'out-1', outletName: 'Main' });
    service.rememberRole({ roleId: 'role-1', roleName: 'Manager' });

    expect(service.summary()?.tenant.tenantName).toBe('Tenant A');
    expect(service.knownOutlets()).toHaveLength(1);
    expect(service.knownRoles()).toHaveLength(1);
    expect(service.module('outlets')?.count).toBe(1);

    service.clearForTenantSwitch();

    expect(service.summary()).toBeNull();
    expect(service.knownOutlets()).toHaveLength(0);
    expect(service.knownRoles()).toHaveLength(0);
    expect(service.activeTenantId()).toBeNull();
  });

  it('merges API outlet options over session cache', () => {
    const service = TestBed.inject(SelectedTenantContextService);
    service.setSummary({
      tenant: {
        tenantId: 'tenant-a',
        tenantName: 'Tenant A',
        tenantCode: 'TEN-A',
        lifecycleStatus: 'ACTIVE',
        planName: 'Pro'
      },
      modules: []
    });
    service.rememberOutlet({ outletId: 'out-session', outletName: 'Session Only' });
    service.rememberOutlet({ outletId: 'out-1', outletName: 'Stale Name' });

    service.mergeKnownOutletsFromApi('tenant-a', [
      { outletId: 'out-1', outletName: 'API Name', outletCode: 'OUT-1' }
    ]);

    const outlets = service.knownOutlets();
    expect(outlets).toHaveLength(2);
    expect(outlets.find((item) => item.outletId === 'out-1')?.outletName).toBe('API Name');
    expect(outlets.find((item) => item.outletId === 'out-session')?.outletName).toBe('Session Only');
  });
});
