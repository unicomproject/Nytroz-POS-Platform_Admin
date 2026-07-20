import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const PASSWORD_POLICY_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const platformPasswordPolicyValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const value = control.value as string | null | undefined;

  if (!value) {
    return null;
  }

  if (value.length < 8) {
    return { passwordPolicy: 'minLength' };
  }

  if (value.length > 128) {
    return { passwordPolicy: 'maxLength' };
  }

  if (!PASSWORD_POLICY_PATTERN.test(value)) {
    return { passwordPolicy: 'complexity' };
  }

  return null;
};

export function passwordPolicyGuidance(): string {
  return 'Use 8–128 characters with at least one uppercase letter, one lowercase letter, and one digit.';
}
