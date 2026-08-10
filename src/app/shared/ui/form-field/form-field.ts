import { Component, input } from '@angular/core';

@Component({
  selector: 'app-form-field',
  standalone: true,
  template: `
    <div class="form-field">
      @if (label()) {
        <label [attr.for]="id()">
          {{ label() }}
          @if (required()) {
            <span class="required" aria-hidden="true">*</span>
          }
        </label>
      }
      <div class="control-container">
        <ng-content />
      </div>
      @if (error()) {
        <p class="error-text" [id]="id() + '-error'">{{ error() }}</p>
      } @else if (helperText()) {
        <p class="helper-text" [id]="id() + '-helper'">{{ helperText() }}</p>
      }
    </div>
  `,
  styles: `
    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 0.25rem);
      width: 100%;
    }

    label {
      color: var(--text-primary, #0f172a);
      font-size: 0.8125rem;
      font-weight: 600;
      user-select: none;
    }

    .required {
      color: var(--status-danger, #ef4444);
      margin-left: var(--space-1, 0.25rem);
    }

    .control-container {
      position: relative;
    }

    .helper-text {
      color: var(--text-muted, #64748b);
      font-size: 0.75rem;
      margin: 0;
    }

    .error-text {
      color: var(--status-danger, #ef4444);
      font-size: 0.75rem;
      font-weight: 500;
      margin: 0;
    }
  `
})
export class FormField {
  readonly id = input<string>('');
  readonly label = input<string>('');
  readonly required = input(false);
  readonly helperText = input<string>('');
  readonly error = input<string | null>(null);
}
