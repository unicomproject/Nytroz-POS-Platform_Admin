import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <section class="empty-state">
      <h2>{{ title() }}</h2>
      <p>{{ message() }}</p>
    </section>
  `,
  styles: `
    .empty-state {
      background: #fff;
      border: 1px solid #d8e0e8;
      border-radius: 8px;
      padding: 1.25rem;
    }

    h2 {
      color: #18212b;
      font-size: 1rem;
      margin: 0 0 0.35rem;
    }

    p {
      color: #607080;
      margin: 0;
    }
  `
})
export class EmptyState {
  readonly title = input('No records yet');
  readonly message = input('Records will appear here after the backend returns data for this TM-EPOS MVP feature.');
}
