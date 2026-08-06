import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ManualPaymentStatusBadge } from '../../components/manual-payment-status-badge/manual-payment-status-badge';
import { titleCase } from '../../mappers/manual-payment.mapper';
import {
  ManualPaymentHistoryItem,
  RecipientManualPaymentAccess,
  RecipientManualPaymentSubmissionRequest
} from '../../models/manual-payment.model';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';
import { manualPaymentErrorMessage } from '../../utils/manual-payment-error.util';

const maxEvidenceSize = 10 * 1024 * 1024;
const allowedEvidenceExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

@Component({
  selector: 'app-manual-payment-recipient-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, ManualPaymentStatusBadge],
  templateUrl: './manual-payment-recipient-page.html',
  styleUrl: './manual-payment-recipient-page.scss'
})
export class ManualPaymentRecipientPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PlatformBillingApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private accessToken = '';
  private idempotencyKey: string | null = null;
  private previousRobotsContent: string | null = null;
  private robotsMeta: HTMLMetaElement | null = null;

  readonly access = signal<RecipientManualPaymentAccess | null>(null);
  readonly maxPaymentDate = new Date().toISOString().slice(0, 10);
  readonly history = signal<ManualPaymentHistoryItem[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly expiredOrInvalid = signal(false);
  readonly historyError = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly uploadProgress = signal(0);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal<string | null>(null);
  readonly invoiceOpen = signal(false);
  readonly invoiceLoading = signal(false);
  readonly invoiceError = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    paymentMethod: ['bank_transfer', [Validators.required, Validators.maxLength(64)]],
    bankOrTransactionReference: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(120)]],
    submittedAmount: [0, [Validators.required, Validators.min(0.01)]],
    currencyCode: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    paymentDate: ['', [Validators.required, notFutureDate]],
    payerNote: ['', Validators.maxLength(500)]
  });

  readonly status = computed(() => this.access()?.paymentStatus ?? '');
  readonly canSubmit = computed(() => ['AWAITING_PAYMENT', 'ACTION_REQUIRED', 'REJECTED'].includes(this.status()));
  readonly isCorrection = computed(() => ['ACTION_REQUIRED', 'REJECTED'].includes(this.status()));
  readonly reviewerMessage = computed(() => [...this.history()].reverse().find((item) =>
    ['REQUEST_INFORMATION', 'REJECT'].includes(item.action)
  )?.note ?? null);

  ngOnInit(): void {
    this.applyNoIndex();
    this.accessToken = this.route.snapshot.paramMap.get('accessToken') ?? '';
    if (!this.accessToken) {
      this.loading.set(false);
      this.expiredOrInvalid.set(true);
      this.loadError.set('This payment link is invalid or expired. Request a new link from the billing team.');
      return;
    }
    this.loadAccess();
  }

  ngOnDestroy(): void {
    if (!this.robotsMeta) return;
    if (this.previousRobotsContent === null) this.robotsMeta.remove();
    else this.robotsMeta.content = this.previousRobotsContent;
  }

  loadAccess(preserveForm = false): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.expiredOrInvalid.set(false);
    this.api.getRecipientPaymentAccess(this.accessToken).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (access) => {
        this.access.set(access);
        if (!preserveForm) this.hydrateForm(access);
        this.loading.set(false);
        this.loadHistory();
      },
      error: (error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        this.expiredOrInvalid.set(status === 404 || status === 410);
        this.loadError.set(this.expiredOrInvalid()
          ? 'This payment link is invalid or expired. Request a new link from the billing team.'
          : manualPaymentErrorMessage(error, this.apiError));
        this.loading.set(false);
      }
    });
  }

  loadHistory(): void {
    this.historyError.set(null);
    this.api.getRecipientHistory(this.accessToken).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (history) => this.history.set(history.items),
      error: (error) => this.historyError.set(manualPaymentErrorMessage(error, this.apiError))
    });
  }

  chooseFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.setFile(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.setFile(event.dataTransfer?.files?.[0] ?? null);
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.fileError.set(null);
  }

  submit(): void {
    this.submitError.set(null);
    this.submitSuccess.set(null);
    this.form.markAllAsTouched();
    const access = this.access();
    const proof = this.selectedFile();
    if (!access || !this.canSubmit() || this.form.invalid || !proof || this.fileError()) {
      if (!proof) this.fileError.set('Select a PDF, JPEG, or PNG proof of payment.');
      return;
    }

    const value = this.form.getRawValue();
    const request: RecipientManualPaymentSubmissionRequest = {
      ...value,
      currencyCode: access.currencyCode,
      paymentDate: new Date(`${value.paymentDate}T00:00:00`).toISOString(),
      expectedVersion: access.version,
      proof
    };
    this.idempotencyKey ??= createIdempotencyKey();
    this.submitting.set(true);
    this.uploadProgress.set(0);
    const operation = this.isCorrection()
      ? this.api.updateRecipientSubmission(this.accessToken, access.paymentId, request, this.idempotencyKey)
      : this.api.submitRecipientEvidence(this.accessToken, request, this.idempotencyKey);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress.set(event.total ? Math.round((event.loaded / event.total) * 100) : 0);
        }
        if (event.type === HttpEventType.Response) {
          this.submitting.set(false);
          this.uploadProgress.set(100);
          this.idempotencyKey = null;
          this.submitSuccess.set(event.body?.data.idempotentReplay
            ? 'Your previous submission was confirmed. No duplicate was created.'
            : 'Payment details submitted for review.');
          this.loadAccess();
        }
      },
      error: (error: unknown) => this.handleSubmitError(error)
    });
  }

  openInvoice(): void {
    this.invoiceOpen.set(true);
    this.invoiceLoading.set(true);
    this.invoiceError.set(null);
    this.api.getRecipientInvoice(this.accessToken).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (invoice) => {
        this.access.set(invoice);
        this.invoiceLoading.set(false);
      },
      error: (error) => {
        this.invoiceError.set(manualPaymentErrorMessage(error, this.apiError));
        this.invoiceLoading.set(false);
      }
    });
  }

  closeInvoice(): void {
    this.invoiceOpen.set(false);
  }

  formatStatus(value: string | null | undefined): string {
    return titleCase(value);
  }

  private loadHistoryAfterConflict(): void {
    this.loadAccess(true);
    this.loadHistory();
  }

  private handleSubmitError(error: unknown): void {
    this.submitting.set(false);
    const apiError = this.apiError.toApiError(error);
    const isConflict = error instanceof HttpErrorResponse && error.status === 409;
    if (isConflict) {
      this.submitError.set(apiError?.errorCode?.includes('idempotency')
        ? 'This retry does not match the original submission. Review the latest status before trying again.'
        : 'This payment was updated elsewhere. The latest status has been reloaded; your form values are preserved.');
      this.loadHistoryAfterConflict();
      return;
    }
    this.submitError.set(manualPaymentErrorMessage(error, this.apiError));
  }

  private hydrateForm(access: RecipientManualPaymentAccess): void {
    this.form.patchValue({
      paymentMethod: access.paymentMethod?.toLowerCase() || 'bank_transfer',
      submittedAmount: access.submittedAmount ?? access.expectedAmount,
      currencyCode: access.currencyCode,
      paymentDate: access.paymentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      payerNote: access.payerNote ?? ''
    });
  }

  private setFile(file: File | null): void {
    this.fileError.set(null);
    if (!file) {
      this.selectedFile.set(null);
      return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!allowedEvidenceExtensions.includes(extension)) {
      this.fileError.set('Only PDF, JPEG, and PNG files are allowed.');
      this.selectedFile.set(null);
      return;
    }
    if (file.size > maxEvidenceSize) {
      this.fileError.set('The proof file must be 10 MiB or smaller.');
      this.selectedFile.set(null);
      return;
    }
    this.selectedFile.set(file);
  }

  private applyNoIndex(): void {
    const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    this.robotsMeta = existing ?? document.createElement('meta');
    this.previousRobotsContent = existing?.content ?? null;
    this.robotsMeta.name = 'robots';
    this.robotsMeta.content = 'noindex, nofollow, noarchive';
    if (!existing) document.head.appendChild(this.robotsMeta);
  }
}

function createIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function notFutureDate(control: AbstractControl<string>): ValidationErrors | null {
  if (!control.value) return null;
  const value = new Date(`${control.value}T23:59:59.999`).getTime();
  return Number.isFinite(value) && value <= Date.now() + 24 * 60 * 60 * 1000 ? null : { futureDate: true };
}
