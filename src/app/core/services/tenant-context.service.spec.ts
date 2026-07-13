import { TestBed } from '@angular/core/testing';

import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('clears the cached tenant object when the authoritative route tenant ID changes', () => {
    const service = TestBed.inject(TenantContextService);
    service.setSelectedTenant({ tenantId: 'tenant-a', tenantName: 'Tenant A' });

    service.setSelectedTenantId('tenant-b');

    expect(service.selectedTenantId()).toBe('tenant-b');
    expect(service.selectedTenant()).toBeNull();
    expect(localStorage.getItem('scs_tix.platform_admin.selected_tenant_id')).toBe('tenant-b');
  });
});
