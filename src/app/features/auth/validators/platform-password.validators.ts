import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Mirrors `PlatformPasswordResetConstants` / `PlatformPasswordPolicyValidator`. Backend remains authoritative. */
export const PLATFORM_PASSWORD_MIN_LENGTH = 8;
export const PLATFORM_PASSWORD_MAX_LENGTH = 128;

export function platformPasswordPolicyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');

    if (!value) {
      return { required: true };
    }

    if (value.length < PLATFORM_PASSWORD_MIN_LENGTH) {
      return {
        minlength: {
          requiredLength: PLATFORM_PASSWORD_MIN_LENGTH,
          actualLength: value.length
        }
      };
    }

    if (value.length > PLATFORM_PASSWORD_MAX_LENGTH) {
      return {
        maxlength: {
          requiredLength: PLATFORM_PASSWORD_MAX_LENGTH,
          actualLength: value.length
        }
      };
    }

    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
      return { passwordPolicy: true };
    }

    return null;
  };
}

export function passwordsMatchValidator(
  passwordControlName: string,
  confirmControlName: string
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const passwordControl = group.get(passwordControlName);
    const confirmControl = group.get(confirmControlName);

    if (!passwordControl || !confirmControl) {
      return null;
    }

    const password = String(passwordControl.value ?? '');
    const confirm = String(confirmControl.value ?? '');

    if (!password || !confirm) {
      return null;
    }

    if (password !== confirm) {
      return { passwordMismatch: true };
    }

    return null;
  };
}

export function platformPasswordErrorMessage(control: AbstractControl | null | undefined): string {
  if (!control || !control.errors) {
    return '';
  }

  if (control.hasError('required')) {
    return 'Password is required.';
  }

  if (control.hasError('minlength')) {
    return `Password must be at least ${PLATFORM_PASSWORD_MIN_LENGTH} characters.`;
  }

  if (control.hasError('maxlength')) {
    return `Password must be at most ${PLATFORM_PASSWORD_MAX_LENGTH} characters.`;
  }

  if (control.hasError('passwordPolicy')) {
    return 'Password must include uppercase, lowercase, and numeric characters.';
  }

  if (control.hasError('server')) {
    return String(control.errors['server']);
  }

  return 'Enter a valid password.';
}
