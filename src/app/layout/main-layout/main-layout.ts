import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [Header, RouterOutlet, Sidebar],
  template: `
    <div class="admin-shell">
      <app-sidebar />
      <div class="admin-main">
        <app-header />
        <main>
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .admin-shell {
      background: #f7f9fc;
      display: grid;
      grid-template-columns: 15.5rem minmax(0, 1fr);
      min-height: 100dvh;
    }

    .admin-main {
      min-width: 0;
    }

    main {
      padding: 1.5rem 1.6rem 2rem;
    }

    @media (max-width: 820px) {
      .admin-shell {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class MainLayout {}
