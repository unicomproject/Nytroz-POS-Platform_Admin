import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  selector: 'app-product-manual-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeader, SelectedTenantContextBand, FormField, Button],
  templateUrl: './product-manual-page.html',
  styleUrl: './product-manual-page.scss'
})
export class ProductManualPage {
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
  readonly productName = signal('');
  readonly sku = signal('');
  readonly sellingPrice = signal('0.00');
  readonly barcode = signal('');
  readonly openingStockQuantity = signal('0');
  readonly outletId = signal('');
  readonly trackInventory = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => [
    { label: 'Configure', path: `/admin/tenants/${this.tenantId()}/configure` },
    { label: 'Add Product' }
  ]);

  constructor() {
    this.loadSummaryAndOutletOptions();
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    const price = Number(this.sellingPrice());
    if (!this.productName().trim() || !this.sku().trim() || Number.isNaN(price)) {
      this.errorMessage.set('Product name, SKU, and a valid sale price are required.');
      return;
    }

    const stock = Number(this.openingStockQuantity() || '0');
    this.submitting.set(true);
    this.errorMessage.set(null);
    const key = createIdempotencyKey();

    this.api
      .createProduct(
        this.tenantId(),
        {
          productName: this.productName().trim(),
          sku: this.sku().trim(),
          sellingPrice: price,
          barcode: this.barcode().trim() || undefined,
          trackInventory: this.trackInventory() || undefined,
          openingStockQuantity: stock > 0 ? stock : undefined,
          outletId: this.outletId().trim() || undefined,
          status: 'ACTIVE'
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

  private loadSummaryAndOutletOptions(): void {
    const tenantId = this.tenantId();
    const summary = this.selectedTenantContext.summary();
    const summary$ =
      summary?.tenant.tenantId === tenantId
        ? of(summary)
        : this.api.getSummary(tenantId).pipe(
            catchError((error) => {
              this.errorMessage.set(this.apiError.toSafeMessage(error));
              return of(null);
            })
          );

    forkJoin({
      summary: summary$,
      outlets: this.api.getOutletOptions(tenantId).pipe(
        catchError((error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          return of([]);
        })
      )
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ summary: loaded, outlets }) => {
        if (loaded) {
          this.selectedTenantContext.setSummary(loaded);
        }
        this.selectedTenantContext.mergeKnownOutletsFromApi(
          tenantId,
          outlets.map((outlet) => ({
            outletId: outlet.outletId,
            outletName: outlet.outletName,
            outletCode: outlet.outletCode
          }))
        );
      });
  }
}
