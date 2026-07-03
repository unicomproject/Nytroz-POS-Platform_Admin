import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const ISO_COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/;
const ISO_CURRENCY_CODE_PATTERN = /^[A-Za-z]{3}$/;

export function isoCountryCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }

    return ISO_COUNTRY_CODE_PATTERN.test(value)
      ? null
      : { isoCountryCode: 'Country must be a 2-letter ISO code (for example LK).' };
  };
}

export function isoCurrencyCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }

    return ISO_CURRENCY_CODE_PATTERN.test(value)
      ? null
      : { isoCurrencyCode: 'Currency code must be exactly 3 letters (for example LKR).' };
  };
}

export function controlIssueMessage(control: AbstractControl | null, label: string): string | null {
  if (!control?.invalid) {
    return null;
  }

  if (control.errors?.['server']) {
    return String(control.errors['server']);
  }

  if (control.errors?.['required']) {
    return `${label} is required.`;
  }

  if (control.errors?.['email']) {
    return `${label} must be a valid email address.`;
  }

  if (control.errors?.['isoCountryCode']) {
    return String(control.errors['isoCountryCode']);
  }

  if (control.errors?.['isoCurrencyCode']) {
    return String(control.errors['isoCurrencyCode']);
  }

  if (control.errors?.['min']) {
    return `${label} must be at least ${control.errors['min'].min}.`;
  }

  return `${label} is invalid.`;
}

export function controlValidationMessage(control: AbstractControl | null, label: string): string | null {
  if (!control?.touched) {
    return null;
  }

  return controlIssueMessage(control, label);
}

export function isRawDatabaseMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('postgresql')
    || normalized.includes('22001')
    || normalized.includes('value too long')
    || normalized.includes('npgsql');
}
