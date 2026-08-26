import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { BreadcrumbItem, PageHeader } from '../../../../shared/components/page-header/page-header';
import { Button } from '../../../../shared/ui/button/button';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { SelectedTenantContextBand } from '../../components/selected-tenant-context-band/selected-tenant-context-band';
import { SelectedTenantBootstrapApiService } from '../../services/selected-tenant-bootstrap-api.service';
import { SelectedTenantContextService } from '../../services/selected-tenant-context.service';
import { createIdempotencyKey } from '../../utils/idempotency-key.util';

@Component({
  selector: 'app-create-role-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeader, SelectedTenantContextBand, FormField, Button],
  templateUrl: './create-role-page.html',
  styleUrl: './create-role-page.scss'
})
export class CreateRolePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(SelectedTenantBootstrapApiService);
  private readonly selectedTenantContext = inject(SelectedTenantContextService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly apiError = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);

  readonly permissionOptions = signal<{ code: string; label: string }[]>([]);
  readonly tenantId = computed(() => this.route.snapshot.paramMap.get('tenantId') ?? '');
  readonly band = computed(() => {
    const summary = this.selectedTenantContext.summary()?.tenant;
    const ctx = this.tenantContext.selectedTenant();
    return {
      tenantName: summary?.tenantName ?? ctx?.tenantName ?? '',
      tenantCode: summary?.tenantCode ?? ctx?.tenantCode ?? null,
      lifecycleStatus: summary?.lifecycleStatus ?? ctx?.status ?? null,
      planName: summary?.planName ?? ctx?.planName ?? null
    };
  });

  readonly roleName = signal('');
  readonly description = signal('');
  readonly selectedCodes = signal<string[]>([]);
  readonly submitting = signal(false);
  readonly loadingPermissions = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => [
    { label: 'Configure', path: `/admin/tenants/${this.tenantId()}/configure` },
    { label: 'Create Role' }
  ]);

  constructor() {
    const tenantId = this.tenantId();
    const summary = this.selectedTenantContext.summary();
    if (!summary || summary.tenant.tenantId !== tenantId) {
      this.api
        .getSummary(tenantId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (loaded) => this.selectedTenantContext.setSummary(loaded) });
    }

    this.api
      .getPermissionOptions(tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => {
          const mapped = options.map((option) => ({
            code: option.permissionCode,
            label: option.permissionCode
          }));
          this.permissionOptions.set(mapped);
          if (mapped.length > 0) {
            this.selectedCodes.set([mapped[0].code]);
          }
          this.loadingPermissions.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.loadingPermissions.set(false);
        }
      });
  }

  togglePermission(code: string, checked: boolean): void {
    this.selectedCodes.update((codes) =>
      checked ? (codes.includes(code) ? codes : [...codes, code]) : codes.filter((item) => item !== code)
    );
  }

  isSelected(code: string): boolean {
    return this.selectedCodes().includes(code);
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }
    if (!this.roleName().trim()) {
      this.errorMessage.set('Role name is required.');
      return;
    }
    if (!this.selectedCodes().length) {
      this.errorMessage.set('Select at least one permission.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const key = createIdempotencyKey();

    this.api
      .createRole(
        this.tenantId(),
        {
          roleName: this.roleName().trim(),
          description: this.description().trim() || undefined,
          permissionCodes: [...this.selectedCodes()]
        },
        key
      )
      .subscribe({
        next: (role) => {
          this.selectedTenantContext.rememberRole({
            roleId: role.roleId,
            roleName: role.roleName,
            roleCode: role.roleCode
          });
          this.submitting.set(false);
          void this.router.navigate(['/admin/tenants', this.tenantId(), 'configure']);
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.submitting.set(false);
        }
      });
  }
}
