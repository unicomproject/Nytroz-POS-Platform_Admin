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
      background: #f4f7f8;
      display: grid;
      grid-template-columns: 17rem minmax(0, 1fr);
      min-height: 100dvh;
    }

    .admin-main {
      min-width: 0;
    }

    main {
      padding: 1.5rem;
    }

    @media (max-width: 820px) {
      .admin-shell {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class MainLayout {}
