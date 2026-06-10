import { Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `<button [type]="type()" [disabled]="disabled()"><ng-content /></button>`,
  styles: `
    button {
      align-items: center;
      background: #145c72;
      border: 0;
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-weight: 700;
      gap: 0.45rem;
      min-height: 2.5rem;
      padding: 0 0.9rem;
    }

    button:disabled {
      background: #9bacb8;
      cursor: not-allowed;
    }
  `
})
export class Button {
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
}
