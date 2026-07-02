import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `<footer>TM-EPOS MVP Platform Admin</footer>`,
  styles: `
    footer {
      color: #607080;
      font-size: 0.85rem;
      padding: 1rem 1.5rem;
    }
  `
})
export class Footer {}
