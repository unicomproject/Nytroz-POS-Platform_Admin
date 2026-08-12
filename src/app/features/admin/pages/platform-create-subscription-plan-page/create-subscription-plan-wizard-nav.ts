import { Component, input } from '@angular/core';

export type SubscriptionPlanWizardStep = {
  key: string;
  label: string;
};

export type SubscriptionPlanStepVisualState = 'current' | 'completed' | 'upcoming';

@Component({
  selector: 'app-create-subscription-plan-wizard-nav',
  standalone: true,
  templateUrl: './create-subscription-plan-wizard-nav.html',
  styleUrl: './create-subscription-plan-wizard-nav.scss'
})
export class CreateSubscriptionPlanWizardNav {
  readonly steps = input.required<SubscriptionPlanWizardStep[]>();
  readonly currentStepKey = input.required<string>();
  readonly stepStates = input.required<Record<string, SubscriptionPlanStepVisualState>>();

  stateFor(key: string): SubscriptionPlanStepVisualState {
    return this.stepStates()[key] ?? 'upcoming';
  }

  stepAriaLabel(label: string, index: number, total: number): string {
    return `Step ${index + 1} of ${total}: ${label}`;
  }
}
