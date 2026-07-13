import { Injectable, signal } from '@angular/core';

import { TenantContext } from '../models/tenant-context.model';

const tenantContextStorageKey = 'scs_tix.platform_admin.selected_tenant_id';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly selectedTenantIdState = signal<string | null>(this.readTenantId());
  private readonly selectedTenantState = signal<TenantContext | null>(null);

  readonly selectedTenant = this.selectedTenantState.asReadonly();
  readonly selectedTenantId = this.selectedTenantIdState.asReadonly();

  setSelectedTenant(tenant: TenantContext): void {
    this.selectedTenantState.set(tenant);
    this.selectedTenantIdState.set(tenant.tenantId);
    localStorage.setItem(tenantContextStorageKey, tenant.tenantId);
  }

  setSelectedTenantId(tenantId: string | null): void {
    if (this.selectedTenantState()?.tenantId !== tenantId) {
      this.selectedTenantState.set(null);
    }

    this.selectedTenantIdState.set(tenantId);
    if (tenantId) {
      localStorage.setItem(tenantContextStorageKey, tenantId);
      return;
    }

    localStorage.removeItem(tenantContextStorageKey);
  }

  clearSelectedTenant(): void {
    this.selectedTenantState.set(null);
    this.selectedTenantIdState.set(null);
    localStorage.removeItem(tenantContextStorageKey);
  }

  matchesTenant(tenantId: string | null): boolean {
    return !!tenantId && this.selectedTenantIdState() === tenantId;
  }

  private readTenantId(): string | null {
    const tenantId = localStorage.getItem(tenantContextStorageKey);
    if (!tenantId) {
      return null;
    }

    return tenantId;
  }
}
