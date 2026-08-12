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
  selector: 'app-create-till-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeader, SelectedTenantContextBand, FormField, Button],
  templateUrl: './create-till-page.html',
  styleUrl: './create-till-page.scss'
})
export class CreateTillPage {
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

  readonly knownOutlets = this.selectedTenantContext.knownOutlets;
  readonly outletModuleCount = computed(
    () => this.selectedTenantContext.module('outlets')?.count ?? 0
  );

  readonly outletId = signal('');
  readonly tillName = signal('');
  readonly tillCode = signal('');
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly gapNotice = signal<string | null>(null);

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => [
    { label: 'Configure', path: `/admin/tenants/${this.tenantId()}/configure` },
    { label: 'Create Till' }
  ]);

  constructor() {
    const queryOutletId = this.route.snapshot.queryParamMap.get('outletId');
    if (queryOutletId) {
      this.outletId.set(queryOutletId);
    }

    this.ensureSummary();
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    if (!this.outletId().trim() || !this.tillName().trim() || !this.tillCode().trim()) {
      this.errorMessage.set('Outlet, till name, and till code are required.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const key = createIdempotencyKey();

    this.api
      .createTill(
        this.tenantId(),
        {
          outletId: this.outletId().trim(),
          tillName: this.tillName().trim(),
          tillCode: this.tillCode().trim()
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

  private ensureSummary(): void {
    const summary = this.selectedTenantContext.summary();
    if (summary?.tenant.tenantId === this.tenantId()) {
      this.refreshGapNotice();
      return;
    }

    this.api
      .getSummary(this.tenantId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (loaded) => {
          this.selectedTenantContext.setSummary(loaded);
          this.refreshGapNotice();
        },
        error: (error) => this.errorMessage.set(this.apiError.toSafeMessage(error))
      });
  }

  private refreshGapNotice(): void {
    const count = this.outletModuleCount();
    if (count < 1) {
      this.gapNotice.set('Create an active outlet before configuring a till.');
      return;
    }

    if (!this.knownOutlets().length) {
      this.gapNotice.set(
        'No outlet list API is available on platform bootstrap. Outlets created in this browser session appear below. Prefer creating an outlet first, then open Till Configure — or use ?outletId= after a successful outlet create.'
      );
      return;
    }

    this.gapNotice.set(null);
    if (!this.outletId() && this.knownOutlets()[0]) {
      this.outletId.set(this.knownOutlets()[0].outletId);
    }
  }
}
