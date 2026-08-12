import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { BreadcrumbItem, PageHeader } from '../../../../shared/components/page-header/page-header';
import { Button } from '../../../../shared/ui/button/button';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { SelectedTenantContextBand } from '../../components/selected-tenant-context-band/selected-tenant-context-band';
import {
  BootstrapOnlineStoreResponse,
  OnlineStoreStatus,
  OnlineStoreTaxDisplayMode
} from '../../models/selected-tenant-bootstrap.model';
import { SelectedTenantBootstrapApiService } from '../../services/selected-tenant-bootstrap-api.service';
import { SelectedTenantContextService } from '../../services/selected-tenant-context.service';
import { createIdempotencyKey } from '../../utils/idempotency-key.util';

@Component({
  selector: 'app-online-store-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeader, SelectedTenantContextBand, FormField, Button],
  templateUrl: './online-store-page.html',
  styleUrl: './online-store-page.scss'
})
export class OnlineStorePage {
  private readonly route = inject(ActivatedRoute);
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

  readonly store = signal<BootstrapOnlineStoreResponse | null>(null);
  readonly storeStatus = signal<OnlineStoreStatus>('DRAFT');
  readonly taxDisplayMode = signal<OnlineStoreTaxDisplayMode>('MATCH_TENANT');
  readonly isLoading = signal(true);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly statusError = signal<string | null>(null);

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => [
    { label: 'Configure', path: `/admin/tenants/${this.tenantId()}/configure` },
    { label: 'Online Store' }
  ]);

  readonly notEntitled = computed(() => this.store() != null && !this.store()!.entitled);

  readonly showClickCollectNotice = computed(() => {
    const data = this.store();
    return !!data?.clickCollectEntitled && !data.clickCollectConfigured;
  });

  constructor() {
    this.load();
  }

  reload(): void {
    this.load();
  }

  submit(): void {
    if (this.submitting() || this.notEntitled()) {
      return;
    }
    if (!this.storeStatus()) {
      this.statusError.set('Store status is required.');
      return;
    }

    this.statusError.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);
    const key = createIdempotencyKey();

    this.api
      .upsertOnlineStore(
        this.tenantId(),
        {
          storeStatus: this.storeStatus(),
          taxDisplayMode: this.taxDisplayMode()
        },
        key
      )
      .subscribe({
        next: (response) => {
          this.store.set(response);
          this.successMessage.set(
            `Initial Online Store readiness saved for ${this.band().tenantName}. Hub status will show CONFIGURED.`
          );
          this.submitting.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.submitting.set(false);
        }
      });
  }

  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const summary = this.selectedTenantContext.summary();
    if (!summary || summary.tenant.tenantId !== this.tenantId()) {
      this.api
        .getSummary(this.tenantId())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (loaded) => this.selectedTenantContext.setSummary(loaded) });
    }

    this.api
      .getOnlineStore(this.tenantId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.store.set(response);
          this.storeStatus.set((response.storeStatus as OnlineStoreStatus) || 'DRAFT');
          this.taxDisplayMode.set(
            (response.taxDisplayMode as OnlineStoreTaxDisplayMode) || 'MATCH_TENANT'
          );
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }
}
