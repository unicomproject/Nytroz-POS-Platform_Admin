import { Injectable, computed, signal } from '@angular/core';

import {
  BootstrapModuleStatusItem,
  BootstrapSummary,
  KnownOutletOption,
  KnownRoleOption
} from '../models/selected-tenant-bootstrap.model';

const knownOutletsStoragePrefix = 'scs_tix.platform_admin.bootstrap.known_outlets.';
const knownRolesStoragePrefix = 'scs_tix.platform_admin.bootstrap.known_roles.';

@Injectable({ providedIn: 'root' })
export class SelectedTenantContextService {
  private readonly summaryState = signal<BootstrapSummary | null>(null);
  private readonly knownOutletsState = signal<KnownOutletOption[]>([]);
  private readonly knownRolesState = signal<KnownRoleOption[]>([]);
  private readonly activeTenantIdState = signal<string | null>(null);

  readonly summary = this.summaryState.asReadonly();
  readonly knownOutlets = this.knownOutletsState.asReadonly();
  readonly knownRoles = this.knownRolesState.asReadonly();
  readonly activeTenantId = this.activeTenantIdState.asReadonly();

  readonly modulesByKey = computed(() => {
    const map = new Map<string, BootstrapModuleStatusItem>();
    for (const module of this.summaryState()?.modules ?? []) {
      map.set(module.moduleKey, module);
    }
    return map;
  });

  setSummary(summary: BootstrapSummary): void {
    this.activeTenantIdState.set(summary.tenant.tenantId);
    this.summaryState.set(summary);
    this.hydrateSessionOptions(summary.tenant.tenantId);
  }

  rememberOutlet(outlet: KnownOutletOption): void {
    const tenantId = this.activeTenantIdState();
    this.knownOutletsState.update((items) => {
      const next = items.filter((item) => item.outletId !== outlet.outletId);
      next.push(outlet);
      if (tenantId) {
        this.writeSessionJson(knownOutletsStoragePrefix + tenantId, next);
      }
      return next;
    });
  }

  rememberRole(role: KnownRoleOption): void {
    const tenantId = this.activeTenantIdState();
    this.knownRolesState.update((items) => {
      const next = items.filter((item) => item.roleId !== role.roleId);
      next.push(role);
      if (tenantId) {
        this.writeSessionJson(knownRolesStoragePrefix + tenantId, next);
      }
      return next;
    });
  }

  clear(): void {
    const tenantId = this.activeTenantIdState();
    if (tenantId) {
      sessionStorage.removeItem(knownOutletsStoragePrefix + tenantId);
      sessionStorage.removeItem(knownRolesStoragePrefix + tenantId);
    }
    this.summaryState.set(null);
    this.knownOutletsState.set([]);
    this.knownRolesState.set([]);
    this.activeTenantIdState.set(null);
  }

  clearForTenantSwitch(): void {
    this.clear();
  }

  module(moduleKey: string): BootstrapModuleStatusItem | null {
    return this.modulesByKey().get(moduleKey) ?? null;
  }

  private hydrateSessionOptions(tenantId: string): void {
    this.knownOutletsState.set(this.readSessionJson<KnownOutletOption>(knownOutletsStoragePrefix + tenantId));
    this.knownRolesState.set(this.readSessionJson<KnownRoleOption>(knownRolesStoragePrefix + tenantId));
  }

  private readSessionJson<T>(key: string): T[] {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as T[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeSessionJson(key: string, value: unknown): void {
    sessionStorage.setItem(key, JSON.stringify(value));
  }
}
