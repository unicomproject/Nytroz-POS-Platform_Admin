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
  selector: 'app-create-user-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeader, SelectedTenantContextBand, FormField, Button],
  templateUrl: './create-user-page.html',
  styleUrl: './create-user-page.scss'
})
export class CreateUserPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(SelectedTenantBootstrapApiService);
  private readonly selectedTenantContext = inject(SelectedTenantContextService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly apiError = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);

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

  readonly knownRoles = this.selectedTenantContext.knownRoles;
  readonly knownOutlets = this.selectedTenantContext.knownOutlets;

  readonly displayName = signal('');
  readonly email = signal('');
  readonly phone = signal('');
  readonly roleId = signal('');
  readonly selectedOutletIds = signal<string[]>([]);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly gapNotice = signal<string | null>(null);

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => [
    { label: 'Configure', path: `/admin/tenants/${this.tenantId()}/configure` },
    { label: 'Add User' }
  ]);

  constructor() {
    const summary = this.selectedTenantContext.summary();
    if (!summary || summary.tenant.tenantId !== this.tenantId()) {
      this.api
        .getSummary(this.tenantId())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (loaded) => {
            this.selectedTenantContext.setSummary(loaded);
            this.refreshGap();
          }
        });
    } else {
      this.refreshGap();
    }
  }

  toggleOutlet(outletId: string, checked: boolean): void {
    this.selectedOutletIds.update((ids) =>
      checked ? (ids.includes(outletId) ? ids : [...ids, outletId]) : ids.filter((id) => id !== outletId)
    );
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }
    if (!this.displayName().trim() || !this.email().trim() || !this.roleId().trim()) {
      this.errorMessage.set('Full name, email, and role are required.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const key = createIdempotencyKey();

    this.api
      .createUser(
        this.tenantId(),
        {
          displayName: this.displayName().trim(),
          email: this.email().trim(),
          phone: this.phone().trim() || undefined,
          roleId: this.roleId().trim(),
          outletIds: this.selectedOutletIds().length ? [...this.selectedOutletIds()] : undefined
        },
        key
      )
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigate(['/admin/tenants', this.tenantId(), 'configure']);
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.submitting.set(false);
        }
      });
  }

  private refreshGap(): void {
    if (!this.knownRoles().length) {
      this.gapNotice.set(
        'No role list API on platform bootstrap. Roles created in this session appear in the picker; otherwise paste a role ID from a prior create success.'
      );
    } else if (!this.roleId()) {
      this.roleId.set(this.knownRoles()[0].roleId);
      this.gapNotice.set(null);
    } else {
      this.gapNotice.set(null);
    }
  }
}
