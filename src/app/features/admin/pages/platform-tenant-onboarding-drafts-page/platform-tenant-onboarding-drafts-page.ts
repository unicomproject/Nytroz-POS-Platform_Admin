import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { TenantOnboardingDraftSummary } from '../../models/platform-tenant-onboarding.model';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';

@Component({
  selector: 'app-platform-tenant-onboarding-drafts-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="drafts-page">
      <header><div><h1>Tenant onboarding drafts</h1><p>Resume durable tenant setup work.</p></div>
        <a class="primary" routerLink="/admin/tenants/create">Start new tenant</a></header>
      @if (error()) { <p role="alert" class="error">{{ error() }}</p> }
      @if (loading()) { <p aria-live="polite">Loading drafts...</p> }
      @else if (!drafts().length) { <div class="empty">No active drafts.</div> }
      @else {
        <div class="table-wrap"><table><thead><tr><th>Tenant</th><th>Step</th><th>Progress</th><th>Status</th><th>Last updated</th><th>Actions</th></tr></thead>
        <tbody>@for (draft of drafts(); track draft.id) {
          <tr><td><strong>{{ draft.displayName || 'Untitled tenant' }}</strong><small>{{ draft.tenantCode || 'No code yet' }}</small></td>
          <td>{{ draft.currentStep }} of 7</td><td><progress max="100" [value]="draft.progressPercent"></progress> {{ draft.progressPercent }}%</td>
          <td>{{ draft.status }}</td><td>{{ draft.updatedAt || 'Not saved' }}</td>
          <td><a [routerLink]="['/admin/tenants/onboarding', draft.id]">Resume</a>
            <button type="button" (click)="discard(draft)" [disabled]="discardingId() === draft.id">Discard</button></td></tr>
        }</tbody></table></div>
      }
    </section>`,
  styles: `
    .drafts-page{display:grid;gap:1rem}.drafts-page>header{display:flex;justify-content:space-between;align-items:center}h1{margin:0}p{color:#667085}
    .primary{background:#0b5cff;color:#fff;padding:.7rem 1rem;border-radius:.5rem;text-decoration:none}.table-wrap{overflow:auto;background:#fff;border:1px solid #e4e7ec;border-radius:.75rem}
    table{width:100%;border-collapse:collapse}th,td{padding:.8rem;text-align:left;border-bottom:1px solid #eaecf0}td small{display:block;color:#667085}button,a{margin-right:.6rem}.error{color:#b42318}.empty{padding:2rem;background:#fff}
  `
})
export class PlatformTenantOnboardingDraftsPage implements OnInit {
  private readonly api = inject(PlatformTenantApiService);
  private readonly apiError = inject(ApiErrorService);
  readonly drafts = signal<TenantOnboardingDraftSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly discardingId = signal<string | null>(null);

  ngOnInit(): void { this.reload(); }
  discard(draft: TenantOnboardingDraftSummary): void {
    this.discardingId.set(draft.id);
    this.api.discardOnboardingDraft(draft.id, draft.version).subscribe({
      next: () => { this.discardingId.set(null); this.reload(); },
      error: (error) => { this.discardingId.set(null); this.error.set(this.apiError.toSafeMessage(error)); }
    });
  }
  private reload(): void {
    this.loading.set(true);
    this.api.listOnboardingDrafts().subscribe({
      next: (drafts) => { this.drafts.set(drafts); this.loading.set(false); },
      error: (error) => { this.error.set(this.apiError.toSafeMessage(error)); this.loading.set(false); }
    });
  }
}
