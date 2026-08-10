import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: true,
  template: `
    <div class="error-state">
      <div class="error-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2>{{ title() }}</h2>
      <p>{{ message() }}</p>
      <div class="error-actions">
        @if (hasRetry()) {
          <button type="button" class="retry-btn" (click)="onRetry()">
            Try again
          </button>
        }
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .error-state {
      align-items: center;
      background: var(--bg-surface-primary, #fff);
      border: 1px solid var(--border-default, #e2e8f0);
      border-radius: var(--radius-lg, 12px);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: var(--space-6, 2rem) var(--space-5, 1.5rem);
      text-align: center;
      width: 100%;
    }

    .error-icon {
      color: var(--status-danger, #ef4444);
      margin-bottom: var(--space-3, 0.75rem);
    }

    .error-icon svg {
      height: 3rem;
      width: 3rem;
    }

    h2 {
      color: var(--text-primary, #0f172a);
      font-size: 1.125rem;
      font-weight: 700;
      margin: 0 0 var(--space-2, 0.5rem);
    }

    p {
      color: var(--text-secondary, #475569);
      font-size: 0.875rem;
      margin: 0 0 var(--space-4, 1rem);
      max-width: 32rem;
      line-height: 1.5;
    }

    .error-actions {
      display: flex;
      gap: var(--space-3, 0.75rem);
      justify-content: center;
    }

    .retry-btn {
      align-items: center;
      background-color: var(--primary, #0b5cff);
      border: 1px solid transparent;
      border-radius: var(--radius-md, 8px);
      color: var(--text-inverse, #fff);
      cursor: pointer;
      display: inline-flex;
      font-size: 0.875rem;
      font-weight: 600;
      min-height: var(--control-height-compact, 2rem);
      padding: 0 var(--space-4, 1rem);
      transition: background-color 0.15s ease;
    }

    .retry-btn:hover {
      background-color: var(--primary-hover, #004de6);
    }
  `
})
export class ErrorState {
  readonly title = input('Something went wrong');
  readonly message = input('An error occurred while loading this feature. Please try again.');
  readonly hasRetry = input(false);
  readonly retry = output<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
