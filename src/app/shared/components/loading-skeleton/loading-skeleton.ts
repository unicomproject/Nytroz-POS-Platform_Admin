import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  template: `
    <div class="loading-skeleton" [class.animate]="animate()">
      @for (row of rowsArray; track $index) {
        <div class="skeleton-row">
          <div class="skeleton-avatar" [class.hidden]="!avatar()"></div>
          <div class="skeleton-content">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line text"></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .loading-skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-4, 1rem);
      width: 100%;
    }

    .skeleton-row {
      align-items: center;
      display: flex;
      gap: var(--space-4, 1rem);
    }

    .skeleton-avatar {
      background: var(--bg-surface-secondary, #f1f5f9);
      border-radius: 50%;
      flex-shrink: 0;
      height: 2.5rem;
      width: 2.5rem;
    }

    .skeleton-avatar.hidden {
      display: none;
    }

    .skeleton-content {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      gap: var(--space-2, 0.5rem);
    }

    .skeleton-line {
      background: var(--bg-surface-secondary, #f1f5f9);
      border-radius: var(--radius-sm, 4px);
      height: 0.75rem;
    }

    .skeleton-line.title {
      width: 30%;
    }

    .skeleton-line.text {
      width: 80%;
    }

    .animate .skeleton-avatar,
    .animate .skeleton-line {
      animation: pulse 1.5s infinite ease-in-out;
    }

    @keyframes pulse {
      0% {
        opacity: 0.6;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0.6;
      }
    }
  `
})
export class LoadingSkeleton {
  readonly rows = input<number>(3);
  readonly avatar = input(false);
  readonly animate = input(true);

  get rowsArray(): number[] {
    return Array(this.rows());
  }
}
