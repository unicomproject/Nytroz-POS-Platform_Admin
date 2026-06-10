import { Component } from '@angular/core';

@Component({
  selector: 'app-feature-not-enabled',
  standalone: true,
  template: `
    <section class="access-state">
      <h1>Feature not enabled</h1>
      <p>The selected tenant does not currently have the entitlement required for this route.</p>
    </section>
  `,
  styles: `
    .access-state {
      background: #fff;
      border: 1px solid #d8e0e8;
      border-radius: 8px;
      margin: 2rem auto;
      max-width: 42rem;
      padding: 1.5rem;
    }

    h1 {
      color: #18212b;
      font-size: 1.35rem;
      margin: 0 0 0.5rem;
    }

    p {
      color: #566575;
      margin: 0;
    }
  `
})
export class FeatureNotEnabled {}
