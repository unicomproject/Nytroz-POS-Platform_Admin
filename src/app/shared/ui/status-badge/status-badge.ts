import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="status-badge" [class]="variant()">
      <span class="status-dot"></span>
      <span class="status-text"><ng-content /></span>
    </span>
  `,
  styles: `
    .status-badge {
      align-items: center;
      border-radius: var(--radius-pill, 9999px);
      display: inline-flex;
      font-size: 0.75rem;
      font-weight: 600;
      gap: var(--space-1, 0.25rem);
      line-height: 1;
      padding: 0.25rem 0.6rem;
      text-transform: capitalize;
      user-select: none;
      width: fit-content;
    }

    .status-dot {
      border-radius: 50%;
      height: 0.375rem;
      width: 0.375rem;
    }

    /* Success */
    .success {
      background-color: var(--status-success-bg, #ecfdf5);
      color: var(--status-success-text, #047857);
    }
    .success .status-dot {
      background-color: var(--status-success, #10b981);
    }

    /* Info */
    .info {
      background-color: var(--status-info-bg, #eff6ff);
      color: var(--status-info-text, #1d4ed8);
    }
    .info .status-dot {
      background-color: var(--status-info, #3b82f6);
    }

    /* Warning */
    .warning {
      background-color: var(--status-warning-bg, #fffbeb);
      color: var(--status-warning-text, #b45309);
    }
    .warning .status-dot {
      background-color: var(--status-warning, #f59e0b);
    }

    /* Danger */
    .danger {
      background-color: var(--status-danger-bg, #fef2f2);
      color: var(--status-danger-text, #b91c1c);
    }
    .danger .status-dot {
      background-color: var(--status-danger, #ef4444);
    }

    /* Neutral */
    .neutral {
      background-color: var(--status-neutral-bg, #f3f4f6);
      color: var(--status-neutral-text, #374151);
    }
    .neutral .status-dot {
      background-color: var(--status-neutral, #6b7280);
    }
  `
})
export class StatusBadge {
  readonly variant = input<'success' | 'info' | 'warning' | 'danger' | 'neutral'>('neutral');
}
