import { Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button [type]="type()" [disabled]="disabled()" [class]="variant() + ' ' + size()">
      <ng-content />
    </button>
  `,
  styles: `
    button {
      align-items: center;
      border: 1px solid transparent;
      border-radius: var(--radius-md, 8px);
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-weight: 600;
      gap: var(--space-2, 0.5rem);
      justify-content: center;
      outline: none;
      transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
      user-select: none;
      white-space: nowrap;
    }

    /* Sizes */
    .default {
      min-height: var(--control-height-default, 2.5rem);
      padding: 0 var(--space-4, 1rem);
      font-size: 0.875rem;
    }
    .compact {
      min-height: var(--control-height-compact, 2rem);
      padding: 0 var(--space-3, 0.75rem);
      font-size: 0.8125rem;
    }

    /* Primary */
    .primary {
      background-color: var(--primary, #0b5cff);
      color: var(--text-inverse, #fff);
    }
    .primary:hover:not(:disabled) {
      background-color: var(--primary-hover, #004de6);
    }
    .primary:active:not(:disabled) {
      background-color: var(--primary-active, #003cbd);
    }
    .primary:focus-visible {
      box-shadow: var(--shadow-focus);
    }

    /* Secondary */
    .secondary {
      background-color: var(--bg-surface-primary, #fff);
      border-color: var(--border-default, #e2e8f0);
      color: var(--text-primary, #0f172a);
    }
    .secondary:hover:not(:disabled) {
      background-color: var(--bg-surface-hover, #f8fafc);
      border-color: var(--border-strong, #cbd5e1);
    }
    .secondary:active:not(:disabled) {
      background-color: var(--bg-surface-secondary, #f1f5f9);
    }
    .secondary:focus-visible {
      box-shadow: var(--shadow-focus);
    }

    /* Tertiary / Ghost */
    .tertiary,
    .ghost {
      background-color: transparent;
      color: var(--text-secondary, #475569);
    }
    .tertiary:hover:not(:disabled),
    .ghost:hover:not(:disabled) {
      background-color: var(--bg-surface-hover, #f8fafc);
      color: var(--text-primary, #0f172a);
    }
    .tertiary:active:not(:disabled),
    .ghost:active:not(:disabled) {
      background-color: var(--bg-surface-secondary, #f1f5f9);
    }
    .tertiary:focus-visible,
    .ghost:focus-visible {
      box-shadow: var(--shadow-focus);
    }

    /* Destructive */
    .destructive {
      background-color: var(--status-danger, #ef4444);
      color: var(--text-inverse, #fff);
    }
    .destructive:hover:not(:disabled) {
      background-color: var(--status-danger-text, #b91c1c);
    }
    .destructive:active:not(:disabled) {
      background-color: #991b1b;
    }
    .destructive:focus-visible {
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15);
    }

    /* Icon */
    .icon {
      align-items: center;
      background-color: transparent;
      border: 1px solid var(--border-default, #e2e8f0);
      border-radius: 50%;
      color: var(--text-secondary, #475569);
      justify-content: center;
      min-height: var(--control-height-default, 2.5rem);
      padding: 0;
      width: var(--control-height-default, 2.5rem);
    }
    .icon.compact {
      min-height: var(--control-height-compact, 2rem);
      width: var(--control-height-compact, 2rem);
    }
    .icon:hover:not(:disabled) {
      background-color: var(--bg-surface-hover, #f8fafc);
      border-color: var(--border-strong, #cbd5e1);
      color: var(--text-primary, #0f172a);
    }
    .icon:focus-visible {
      box-shadow: var(--shadow-focus);
    }

    button:disabled {
      background-color: var(--bg-surface-secondary, #f1f5f9);
      border-color: var(--border-subtle, #f1f5f9);
      color: var(--text-disabled, #94a3b8);
      cursor: not-allowed;
      box-shadow: none;
    }
  `
})
export class Button {
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly variant = input<'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive' | 'icon'>('primary');
  readonly size = input<'default' | 'compact'>('default');
}

