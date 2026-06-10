import { Injectable, signal } from '@angular/core';

import { TenantContext } from '../models/tenant-context.model';

const tenantContextStorageKey = 'scs_tix.platform_admin.selected_tenant';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly selectedTenantState = signal<TenantContext | null>(this.readTenantContext());

  readonly selectedTenant = this.selectedTenantState.asReadonly();

  setSelectedTenant(tenant: TenantContext): void {
    this.selectedTenantState.set(tenant);
    localStorage.setItem(tenantContextStorageKey, JSON.stringify(tenant));
  }

  clearSelectedTenant(): void {
    this.selectedTenantState.set(null);
    localStorage.removeItem(tenantContextStorageKey);
  }

  matchesTenant(tenantId: string | null): boolean {
    const selectedTenant = this.selectedTenantState();

    return !!tenantId && selectedTenant?.tenantId === tenantId;
  }

  private readTenantContext(): TenantContext | null {
    const rawTenant = localStorage.getItem(tenantContextStorageKey);

    if (!rawTenant) {
      return null;
    }

    try {
      return JSON.parse(rawTenant) as TenantContext;
    } catch {
      localStorage.removeItem(tenantContextStorageKey);
      return null;
    }
  }
}
