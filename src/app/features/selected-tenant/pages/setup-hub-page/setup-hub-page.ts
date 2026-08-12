import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { BreadcrumbItem, PageHeader } from '../../../../shared/components/page-header/page-header';
import { SelectedTenantContextBand } from '../../components/selected-tenant-context-band/selected-tenant-context-band';
import {
  BootstrapModuleStatusItem,
  BootstrapSummary
} from '../../models/selected-tenant-bootstrap.model';
import { SelectedTenantBootstrapApiService } from '../../services/selected-tenant-bootstrap-api.service';
import { SelectedTenantContextService } from '../../services/selected-tenant-context.service';

interface HubModuleCard {
  key: string;
  title: string;
  description: string;
  module: BootstrapModuleStatusItem | null;
  primaryLabel: string;
  primaryLink: string[] | null;
  secondaryLabel?: string;
  secondaryLink?: string[] | null;
  managePermission: string;
  importPermission?: string;
}

@Component({
  selector: 'app-setup-hub-page',
  standalone: true,
  imports: [
    RouterLink,
    PageHeader,
    SelectedTenantContextBand,
    LoadingSkeleton,
    ErrorState
  ],
  templateUrl: './setup-hub-page.html',
  styleUrl: './setup-hub-page.scss'
})
export class SetupHubPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(SelectedTenantBootstrapApiService);
  private readonly selectedTenantContext = inject(SelectedTenantContextService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly accessControl = inject(AccessControlService);
  private readonly apiError = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);

  readonly summary = signal<BootstrapSummary | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const tenant = this.summary()?.tenant;
    return [
      { label: 'Tenants', path: '/admin/tenants' },
      {
        label: tenant?.tenantName || 'Tenant',
        path: tenant ? `/admin/tenants/${tenant.tenantId}` : undefined
      },
      { label: 'Configure' }
    ];
  });

  readonly moduleCards = computed<HubModuleCard[]>(() => {
    const tenantId = this.route.snapshot.paramMap.get('tenantId') ?? '';
    const modules = this.selectedTenantContext.modulesByKey();
    const base = ['/admin/tenants', tenantId, 'configure'];

    return [
      {
        key: 'outlets',
        title: 'Outlet Setup',
        description: 'Create the first outlet for POS and fulfilment bootstrap.',
        module: modules.get('outlets') ?? null,
        primaryLabel: 'Configure',
        primaryLink: [...base, 'outlets', 'create'],
        managePermission: platformPermissions.tenantsBootstrapOutletsManage
      },
      {
        key: 'tills',
        title: 'Till Setup',
        description: 'Create a till for an active outlet.',
        module: modules.get('tills') ?? null,
        primaryLabel: 'Configure',
        primaryLink: [...base, 'tills', 'create'],
        managePermission: platformPermissions.tenantsBootstrapTillsManage
      },
      {
        key: 'roles',
        title: 'Roles & Permissions',
        description: 'Bootstrap Tenant Admin role exists. Add custom roles if needed.',
        module: modules.get('roles') ?? null,
        primaryLabel: 'Configure',
        primaryLink: [...base, 'roles', 'create'],
        managePermission: platformPermissions.tenantsBootstrapRolesManage
      },
      {
        key: 'users',
        title: 'Additional Users',
        description: 'Add staff beyond the first Tenant Admin from wizard.',
        module: modules.get('users') ?? null,
        primaryLabel: 'Add User',
        primaryLink: [...base, 'users', 'create'],
        managePermission: platformPermissions.tenantsBootstrapUsersManage
      },
      {
        key: 'products',
        title: 'Product Onboarding',
        description: 'Seed initial catalog manually or via CSV.',
        module: modules.get('products') ?? null,
        primaryLabel: 'Add Products',
        primaryLink: [...base, 'products', 'manual'],
        secondaryLabel: 'Import CSV',
        secondaryLink: [...base, 'products', 'import'],
        managePermission: platformPermissions.tenantsBootstrapProductsManage,
        importPermission: platformPermissions.tenantsBootstrapProductsImport
      },
      {
        key: 'online_store',
        title: 'Online Store',
        description:
          'Set initial Online Store readiness for entitled tenants. Branding, merchandising, and Click & Collect remain Tenant Admin.',
        module: modules.get('online_store') ?? null,
        primaryLabel: 'Configure',
        primaryLink: [...base, 'online-store'],
        managePermission: platformPermissions.tenantsBootstrapOnlineStoreManage
      }
    ];
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
          return this.api.getSummary(params.get('tenantId') ?? '');
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (summary) => this.applySummary(summary),
        error: (error) => {
          this.summary.set(null);
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  reload(): void {
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    if (!tenantId) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.api.getSummary(tenantId).subscribe({
      next: (summary) => this.applySummary(summary),
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  canManage(permission: string): boolean {
    return this.accessControl.hasPermission(permission);
  }

  statusChipClass(status: string | undefined): string {
    const normalized = (status ?? '').toUpperCase();
    if (normalized === 'CONFIGURED') {
      return 'chip-success';
    }
    if (normalized === 'NOT_ENTITLED') {
      return 'chip-entitled';
    }
    if (normalized === 'BLOCKED') {
      return 'chip-neutral';
    }
    return 'chip-neutral';
  }

  isDisabled(card: HubModuleCard): boolean {
    const module = card.module;
    if (!module) {
      return true;
    }
    if (!module.entitled || !module.canConfigure) {
      return true;
    }
    if (!this.canManage(card.managePermission)) {
      return true;
    }
    return false;
  }

  ctaLabel(card: HubModuleCard): string {
    const status = (card.module?.status ?? '').toUpperCase();
    if (status === 'CONFIGURED' && card.key === 'online_store') {
      return 'Review';
    }
    if (status === 'NOT_ENTITLED') {
      return 'Not available';
    }
    return card.primaryLabel;
  }

  summaryText(card: HubModuleCard): string {
    const module = card.module;
    if (!module) {
      return 'Status unavailable';
    }
    if (card.key === 'online_store') {
      if (!module.entitled) {
        return 'Feature: online_store = false';
      }
      return `Current status · Count: ${module.count}`;
    }
    if (card.key === 'roles') {
      return module.count > 0
        ? `Custom roles: ${module.count}`
        : 'Default TA role provisioned at create';
    }
    if (card.key === 'users') {
      return `Current: ${module.count} users`;
    }
    return `Current: ${module.count} ${card.key}`;
  }

  private applySummary(summary: BootstrapSummary): void {
    this.summary.set(summary);
    this.selectedTenantContext.setSummary(summary);
    this.tenantContext.setSelectedTenant({
      tenantId: summary.tenant.tenantId,
      tenantName: summary.tenant.tenantName,
      tenantCode: summary.tenant.tenantCode,
      status: summary.tenant.lifecycleStatus,
      planName: summary.tenant.planName ?? undefined
    });
    this.isLoading.set(false);
  }
}
