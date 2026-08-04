import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap, takeWhile, timer } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { TenantOnboardingOperation } from '../../models/platform-tenant-onboarding.model';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';

@Component({
  selector: 'app-platform-tenant-onboarding-result-page', standalone: true, imports: [RouterLink],
  template: `<section class="result" aria-live="polite"><h1>Tenant onboarding status</h1>
    @if (error()) { <p role="alert" class="error">{{ error() }}</p> }
    @if (operation(); as op) {
      <div class="card"><h2>{{ title(op) }}</h2><dl>
        <div><dt>Tenant reference</dt><dd>{{ op.tenantId }}</dd></div><div><dt>Provisioning</dt><dd>{{ op.provisioningStatus }}</dd></div>
        <div><dt>Payment</dt><dd>{{ op.paymentStatus }}</dd></div><div><dt>Tenant Admin invitation</dt><dd>{{ op.invitationStatus }}</dd></div>
      </dl>@if (op.failureCode) { <p class="error">Reference: {{ op.failureCode }}</p> }
      <a [routerLink]="['/admin/tenants', op.tenantId]">Open tenant</a></div>
    } @else { <p>Loading operation status...</p> }
  </section>`,
  styles: `.result{max-width:760px;margin:auto}.card{background:#fff;border:1px solid #e4e7ec;border-radius:1rem;padding:1.25rem}dl{display:grid;grid-template-columns:1fr 1fr;gap:1rem}dt{color:#667085}dd{margin:0;font-weight:600}.error{color:#b42318}`
})
export class PlatformTenantOnboardingResultPage implements OnInit {
  private readonly route = inject(ActivatedRoute); private readonly api = inject(PlatformTenantApiService);
  private readonly apiError = inject(ApiErrorService); private readonly destroyRef = inject(DestroyRef);
  readonly operation = signal<TenantOnboardingOperation | null>(null); readonly error = signal<string | null>(null);
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('operationId'); if (!id) { this.error.set('Operation reference is missing.'); return; }
    timer(0, 5000).pipe(switchMap(() => this.api.getOnboardingOperation(id)),
      takeWhile((op) => op.status === 'PROCESSING' || op.status === 'FAILED_RETRYABLE', true), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (op) => this.operation.set(op), error: (error) => this.error.set(this.apiError.toSafeMessage(error)) });
  }
  title(op: TenantOnboardingOperation): string {
    if (op.status.startsWith('FAILED')) return 'Tenant created — follow-up needs attention';
    if (op.paymentStatus === 'PENDING') return 'Tenant created — payment pending';
    if (op.invitationStatus === 'PENDING') return 'Tenant created — activation handoff pending';
    return 'Tenant onboarding completed';
  }
}
