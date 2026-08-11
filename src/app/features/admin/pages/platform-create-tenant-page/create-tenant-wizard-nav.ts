import { Component, input } from '@angular/core';

export type CreateTenantWizardStep = {
  key: string;
  label: string;
  shortLabel: string;
};

export type CreateTenantStepVisualState = 'current' | 'completed' | 'upcoming' | 'error';

@Component({
  selector: 'app-create-tenant-wizard-nav',
  standalone: true,
  templateUrl: './create-tenant-wizard-nav.html',
  styleUrl: './create-tenant-wizard-nav.scss'
})
export class CreateTenantWizardNav {
  readonly steps = input.required<CreateTenantWizardStep[]>();
  readonly currentStepKey = input.required<string>();
  readonly currentStepLabel = input.required<string>();
  readonly currentStepNumber = input.required<number>();
  readonly draftId = input<string | null>(null);
  readonly progressPercent = input(0);
  readonly stepStates = input.required<Record<string, CreateTenantStepVisualState>>();
  readonly stepErrorCounts = input.required<Record<string, number>>();

  stateFor(key: string): CreateTenantStepVisualState {
    return this.stepStates()[key] ?? 'upcoming';
  }

  errorCountFor(key: string): number {
    return this.stepErrorCounts()[key] ?? 0;
  }

  showErrorCount(key: string): boolean {
    return this.stateFor(key) === 'error' && this.errorCountFor(key) > 0;
  }

  errorAriaLabel(label: string, count: number): string {
    return `${label} — ${count} validation error${count === 1 ? '' : 's'}`;
  }
}
