import { Component, input } from '@angular/core';

import { PlatformMenuIcon } from '../../core/config/menu.config';

@Component({
  selector: 'app-sidebar-menu-icon',
  standalone: true,
  template: `
    <svg
      class="menu-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @switch (icon()) {
        @case ('dashboard') {
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
        }
        @case ('tenants') {
          <circle cx="12" cy="8" r="3.25" />
          <path d="M6.5 19c.8-2.8 3-4.5 5.5-4.5s4.7 1.7 5.5 4.5" />
          <path d="M18.5 8.5a3.25 3.25 0 0 1 0 6" />
          <path d="M5.5 8.5a3.25 3.25 0 0 0 0 6" />
        }
        @case ('subscriptions') {
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M8 10h8M8 14h5" />
          <path d="m16.5 6 1.5-2h-12l1.5 2" />
        }
        @case ('outlets') {
          <path d="M4 10 12 4l8 6v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
          <path d="M9 14h6" />
        }
        @case ('tills') {
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h5" />
          <path d="M7 18h10" />
        }
        @case ('users') {
          <circle cx="9" cy="9" r="3" />
          <circle cx="17" cy="10" r="2.5" />
          <path d="M4 19c.8-2.5 2.8-4 5-4s4.2 1.5 5 4" />
          <path d="M15.5 19c.4-1.6 1.7-2.8 3.5-2.8 1.2 0 2.3.6 3 1.8" />
        }
        @case ('roles') {
          <circle cx="8" cy="8" r="3" />
          <path d="M4 19c.7-2.4 2.4-4 4-4s3.3 1.6 4 4" />
          <path d="M15 11h6M18 8v6" />
        }
        @case ('products') {
          <path d="M12 3 4 7v10l8 4 8-4V7z" />
          <path d="M12 11 4 7M12 11v10M12 11l8-4" />
        }
        @case ('billing') {
          <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2z" />
          <path d="M9 9h6M9 13h4" />
        }
        @case ('reports') {
          <path d="M5 19V9M12 19V5M19 19v-7" />
        }
        @case ('audit') {
          <path d="M8 4h8a2 2 0 0 1 2 2v14H6V6a2 2 0 0 1 2-2z" />
          <path d="M9 9h6M9 13h6M9 17h4" />
        }
        @case ('alerts') {
          <path d="M12 4a4.5 4.5 0 0 0-4.5 4.5c0 3-1.5 4.5-1.5 4.5h12S16.5 11.5 16.5 8.5A4.5 4.5 0 0 0 12 4z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
          />
        }
      }
    </svg>
  `,
  styles: `
    .menu-icon {
      display: block;
      flex: 0 0 1.15rem;
      height: 1.15rem;
      width: 1.15rem;
    }
  `
})
export class SidebarMenuIcon {
  readonly icon = input.required<PlatformMenuIcon>();
}
