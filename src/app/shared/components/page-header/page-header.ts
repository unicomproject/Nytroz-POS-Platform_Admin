import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <div class="header-content">
        @if (breadcrumbs() && breadcrumbs()!.length > 0) {
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            @for (crumb of breadcrumbs()!; track crumb.label; let last = $last) {
              @if (crumb.path && !last) {
                <a [routerLink]="crumb.path" class="crumb-link">{{ crumb.label }}</a>
              } @else {
                <span class="crumb-text" [class.crumb-current]="last">{{ crumb.label }}</span>
              }
              @if (!last) {
                <span class="crumb-separator" aria-hidden="true">/</span>
              }
            }
          </nav>
        } @else if (eyebrow()) {
          <p class="eyebrow">{{ eyebrow() }}</p>
        }
        <h1>{{ title() }}</h1>
        @if (description()) {
          <p class="description">{{ description() }}</p>
        }
      </div>
      <div class="header-actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .page-header {
      align-items: flex-start;
      border-bottom: 1px solid var(--border-subtle, #f1f5f9);
      display: flex;
      gap: var(--space-4, 1rem);
      justify-content: space-between;
      margin-bottom: var(--space-5, 1.5rem);
      padding-bottom: var(--space-4, 1rem);
    }

    .header-content {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .breadcrumbs {
      align-items: center;
      color: var(--text-muted, #64748b);
      display: flex;
      font-size: 0.8125rem;
      gap: var(--space-2, 0.5rem);
      margin-bottom: var(--space-2, 0.5rem);
    }

    .crumb-link {
      color: var(--text-muted, #64748b);
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .crumb-link:hover {
      color: var(--primary, #0b5cff);
    }

    .crumb-text {
      color: var(--text-muted, #64748b);
    }

    .crumb-current {
      color: var(--text-secondary, #475569);
      font-weight: 600;
    }

    .crumb-separator {
      color: var(--text-disabled, #94a3b8);
      user-select: none;
    }

    .eyebrow {
      color: var(--text-muted, #64748b);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin: 0 0 var(--space-2, 0.5rem);
      text-transform: uppercase;
    }

    h1 {
      color: var(--text-primary, #0f172a);
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.2;
      margin: 0;
    }

    .description {
      color: var(--text-secondary, #475569);
      font-size: 0.875rem;
      margin: var(--space-2, 0.5rem) 0 0;
      max-width: 52rem;
    }

    .header-actions {
      align-items: center;
      display: flex;
      flex-shrink: 0;
      gap: var(--space-3, 0.75rem);
    }
  `
})
export class PageHeader {
  readonly eyebrow = input('Platform Admin');
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly breadcrumbs = input<BreadcrumbItem[]>();
}

