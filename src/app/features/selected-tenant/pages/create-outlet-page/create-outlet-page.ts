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
  selector: 'app-create-outlet-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeader, SelectedTenantContextBand, FormField, Button],
  templateUrl: './create-outlet-page.html',
  styleUrl: './create-outlet-page.scss'
})
export class CreateOutletPage {
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

  readonly outletName = signal('');
  readonly outletType = signal<'STORE' | 'WAREHOUSE'>('STORE');
  readonly timezone = signal('Asia/Colombo');
  readonly phone = signal('');
  readonly email = signal('');
  readonly addressLine1 = signal('');
  readonly city = signal('');
  readonly countryCode = signal('LK');
  readonly postalCode = signal('');
  readonly stateOrProvince = signal('');

  readonly submitting = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldError = signal<string | null>(null);

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => [
    { label: 'Configure', path: `/admin/tenants/${this.tenantId()}/configure` },
    { label: 'Create Outlet' }
  ]);

  constructor() {
    const summary = this.selectedTenantContext.summary();
    if (!summary || summary.tenant.tenantId !== this.tenantId()) {
      this.api
        .getSummary(this.tenantId())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (loaded) => this.selectedTenantContext.setSummary(loaded)
        });
    }
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    const name = this.outletName().trim();
    if (name.length < 2 || name.length > 200) {
      this.fieldError.set('Outlet name is required (2–200 characters).');
      return;
    }
    if (!this.addressLine1().trim() || !this.city().trim() || !this.countryCode().trim()) {
      this.errorMessage.set('Address line 1, city, and country are required.');
      return;
    }

    this.fieldError.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);

    const key = createIdempotencyKey();
    this.api
      .createOutlet(
        this.tenantId(),
        {
          outletName: name,
          outletType: this.outletType(),
          timezone: this.timezone(),
          phone: this.phone().trim() || undefined,
          email: this.email().trim() || undefined,
          status: 'ACTIVE',
          address: {
            addressLine1: this.addressLine1().trim(),
            city: this.city().trim(),
            countryCode: this.countryCode().trim().toUpperCase(),
            postalCode: this.postalCode().trim() || undefined,
            stateOrProvince: this.stateOrProvince().trim() || undefined
          }
        },
        key
      )
      .subscribe({
        next: (outlet) => {
          this.selectedTenantContext.rememberOutlet({
            outletId: outlet.outletId,
            outletName: outlet.outletName,
            outletCode: outlet.outletCode
          });
          this.successMessage.set(`Outlet created successfully (${outlet.outletCode}).`);
          this.submitting.set(false);
          void this.router.navigate(['/admin/tenants', this.tenantId(), 'configure'], {
            state: { bootstrapSuccess: this.successMessage() }
          });
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.submitting.set(false);
        }
      });
  }
}
