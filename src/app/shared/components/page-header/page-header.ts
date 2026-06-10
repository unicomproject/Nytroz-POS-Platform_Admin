import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ eyebrow() }}</p>
        <h1>{{ title() }}</h1>
        @if (description()) {
          <p class="description">{{ description() }}</p>
        }
      </div>
      <ng-content />
    </header>
  `,
  styles: `
    .page-header {
      align-items: flex-start;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .eyebrow {
      color: #607080;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0;
      margin: 0 0 0.35rem;
      text-transform: uppercase;
    }

    h1 {
      color: #18212b;
      font-size: 1.75rem;
      line-height: 1.2;
      margin: 0;
    }

    .description {
      color: #566575;
      margin: 0.45rem 0 0;
      max-width: 52rem;
    }
  `
})
export class PageHeader {
  readonly eyebrow = input('Platform Admin');
  readonly title = input.required<string>();
  readonly description = input<string>();
}
