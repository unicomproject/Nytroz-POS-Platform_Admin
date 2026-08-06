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
      min-height: 100dvh;
      overflow-x: hidden;
    }

    app-sidebar {
      display: block;
      height: 100vh;
      left: 0;
      overflow: hidden;
      position: fixed;
      top: 0;
      z-index: 20;
    }

    .admin-main {
      display: flex;
      flex-direction: column;
      margin-left: 16.5rem;
      min-height: 100dvh;
      min-width: 0;
      width: calc(100% - 16.5rem);
    }

    main {
      flex: 1;
      min-height: 0;
      min-width: 0;
      overflow-x: hidden;
      overflow-y: auto;
      padding: 1.5rem 1.6rem 2rem;
      width: 100%;
    }

    @media (max-width: 820px) {
      app-sidebar {
        height: auto;
        position: static;
      }

      .admin-main {
        margin-left: 0;
        width: 100%;
      }
    }
  `
})
export class MainLayout {}
