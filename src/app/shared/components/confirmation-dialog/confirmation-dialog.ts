import { Component, ElementRef, HostListener, effect, inject, input, output, viewChild } from '@angular/core';

import { Button } from '../../ui/button/button';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [Button],
  template: `
    @if (isOpen()) {
      <div class="dialog-backdrop" (click)="onCancel()" role="presentation"></div>
      <div
        #dialogPanel
        class="dialog-panel"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        [attr.aria-describedby]="messageId"
      >
        <header class="dialog-header">
          <h2 [id]="titleId">{{ title() }}</h2>
        </header>
        <div class="dialog-body">
          <p [id]="messageId">{{ message() }}</p>
        </div>
        <footer class="dialog-footer">
          <app-button
            variant="secondary"
            [disabled]="isLoading()"
            (click)="onCancel()"
          >
            {{ cancelLabel() }}
          </app-button>
          <app-button
            [variant]="variant() === 'destructive' ? 'destructive' : 'primary'"
            [disabled]="isLoading() || confirmDisabled()"
            (click)="onConfirm()"
          >
            {{ isLoading() ? loadingLabel() : confirmLabel() }}
          </app-button>
        </footer>
      </div>
    }
  `,
  styles: `
    .dialog-backdrop {
      background-color: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(4px);
      inset: 0;
      position: fixed;
      z-index: 1000;
    }

    .dialog-panel {
      background-color: var(--bg-surface-primary, #fff);
      border: 1px solid var(--border-default, #e2e8f0);
      border-radius: var(--radius-lg, 12px);
      box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
      display: flex;
      flex-direction: column;
      gap: var(--space-4, 1rem);
      left: 50%;
      max-width: 28rem;
      outline: none;
      padding: var(--space-5, 1.25rem);
      position: fixed;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      z-index: 1001;
    }

    .dialog-header h2 {
      color: var(--text-primary, #0f172a);
      font-size: 1.125rem;
      font-weight: 700;
      margin: 0;
    }

    .dialog-body p {
      color: var(--text-secondary, #475569);
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0;
    }

    .dialog-footer {
      display: flex;
      gap: var(--space-3, 0.75rem);
      justify-content: flex-end;
      margin-top: var(--space-2, 0.5rem);
    }

    .dialog-panel:focus-visible {
      box-shadow: var(--shadow-focus, 0 0 0 4px rgba(11, 92, 255, 0.15));
    }
  `
})
export class ConfirmationDialog {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly dialogPanel = viewChild<ElementRef<HTMLElement>>('dialogPanel');

  readonly isOpen = input(false);
  readonly title = input('Confirm Action');
  readonly message = input('Are you sure you want to perform this action?');
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly loadingLabel = input('Working...');
  readonly variant = input<'default' | 'destructive'>('default');
  readonly isLoading = input(false);
  readonly confirmDisabled = input(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  readonly titleId = `dialog-title-${Math.random().toString(36).slice(2, 9)}`;
  readonly messageId = `dialog-message-${Math.random().toString(36).slice(2, 9)}`;

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        return;
      }

      queueMicrotask(() => {
        const panel =
          this.dialogPanel()?.nativeElement ??
          (this.host.nativeElement.querySelector('.dialog-panel') as HTMLElement | null);
        const focusTarget =
          (panel?.querySelector('.dialog-footer button:last-of-type') as HTMLElement | null) ??
          (panel?.querySelector('button') as HTMLElement | null) ??
          panel;
        focusTarget?.focus();
      });
    });
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isOpen() || this.isLoading()) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
  }

  onConfirm(): void {
    if (this.isLoading() || this.confirmDisabled()) {
      return;
    }

    this.confirm.emit();
  }

  onCancel(): void {
    if (this.isLoading()) {
      return;
    }

    this.cancel.emit();
  }
}
