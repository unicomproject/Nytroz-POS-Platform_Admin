import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { BreadcrumbItem, PageHeader } from '../../../../shared/components/page-header/page-header';
import { Button } from '../../../../shared/ui/button/button';
import { SelectedTenantContextBand } from '../../components/selected-tenant-context-band/selected-tenant-context-band';
import {
  BootstrapProductImportCommitResponse,
  BootstrapProductImportValidateResponse
} from '../../models/selected-tenant-bootstrap.model';
import { SelectedTenantBootstrapApiService } from '../../services/selected-tenant-bootstrap-api.service';
import { SelectedTenantContextService } from '../../services/selected-tenant-context.service';
import { createIdempotencyKey } from '../../utils/idempotency-key.util';

const maxFileBytes = 5 * 1024 * 1024;
const maxRowsSoftLimit = 2000;

@Component({
  selector: 'app-product-import-page',
  standalone: true,
  imports: [RouterLink, PageHeader, SelectedTenantContextBand, Button],
  templateUrl: './product-import-page.html',
  styleUrl: './product-import-page.scss'
})
export class ProductImportPage {
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

  readonly step = signal<'upload' | 'preview' | 'result'>('upload');
  readonly selectedFile = signal<File | null>(null);
  readonly preview = signal<BootstrapProductImportValidateResponse | null>(null);
  readonly commitResult = signal<BootstrapProductImportCommitResponse | null>(null);
  readonly busy = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => [
    { label: 'Configure', path: `/admin/tenants/${this.tenantId()}/configure` },
    { label: 'Import CSV' }
  ]);

  constructor() {
    const summary = this.selectedTenantContext.summary();
    if (!summary || summary.tenant.tenantId !== this.tenantId()) {
      this.api
        .getSummary(this.tenantId())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (loaded) => this.selectedTenantContext.setSummary(loaded) });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.errorMessage.set(null);
  }

  downloadTemplate(): void {
    this.api.downloadImportTemplate(this.tenantId()).subscribe({
      next: (blob) => this.saveBlob(blob, 'OVZ-ST-PRODUCT-IMPORT-v1.csv'),
      error: (error) => this.errorMessage.set(this.apiError.toSafeMessage(error))
    });
  }

  validate(): void {
    if (this.busy()) {
      return;
    }

    const file = this.selectedFile();
    if (!file) {
      this.errorMessage.set('Choose a CSV file to validate.');
      return;
    }
    if (file.size > maxFileBytes) {
      this.errorMessage.set('File exceeds the 5MB client-side limit.');
      return;
    }

    this.busy.set(true);
    this.errorMessage.set(null);
    const key = createIdempotencyKey();

    this.api.validateProductImport(this.tenantId(), file, key).subscribe({
      next: (preview) => {
        if (preview.totalRows > maxRowsSoftLimit) {
          this.errorMessage.set(
            `File has ${preview.totalRows} rows (soft client limit ${maxRowsSoftLimit}). Reduce the file before committing.`
          );
        }
        this.preview.set(preview);
        this.step.set('preview');
        this.busy.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.busy.set(false);
      }
    });
  }

  resetUpload(): void {
    this.step.set('upload');
    this.preview.set(null);
    this.commitResult.set(null);
    this.selectedFile.set(null);
    this.errorMessage.set(null);
  }

  commit(): void {
    if (this.busy()) {
      return;
    }
    const importId = this.preview()?.importId;
    if (!importId) {
      return;
    }

    this.busy.set(true);
    this.errorMessage.set(null);
    const key = createIdempotencyKey();

    this.api.commitProductImport(this.tenantId(), importId, key).subscribe({
      next: (result) => {
        this.commitResult.set(result);
        this.step.set('result');
        this.busy.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.busy.set(false);
      }
    });
  }

  downloadErrors(): void {
    const importId = this.preview()?.importId ?? this.commitResult()?.importId;
    if (!importId) {
      return;
    }

    this.api.downloadImportErrors(this.tenantId(), importId).subscribe({
      next: (blob) => this.saveBlob(blob, `bootstrap-import-${importId}-errors.csv`),
      error: (error) => this.errorMessage.set(this.apiError.toSafeMessage(error))
    });
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
