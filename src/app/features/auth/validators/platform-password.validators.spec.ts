import { FormControl, FormGroup } from '@angular/forms';

import {
  PLATFORM_PASSWORD_MAX_LENGTH,
  PLATFORM_PASSWORD_MIN_LENGTH,
  passwordsMatchValidator,
  platformPasswordErrorMessage,
  platformPasswordPolicyValidator
} from './platform-password.validators';

describe('platformPasswordPolicyValidator', () => {
  const validator = platformPasswordPolicyValidator();

  it('requires a password', () => {
    expect(validator(new FormControl(''))).toEqual({ required: true });
  });

  it('enforces the backend minimum length', () => {
    expect(validator(new FormControl('Ab1'))).toEqual({
      minlength: { requiredLength: PLATFORM_PASSWORD_MIN_LENGTH, actualLength: 3 }
    });
  });

  it('enforces the backend maximum length', () => {
    const value = `${'Aa1'.repeat(50)}x`;
    expect(value.length).toBeGreaterThan(PLATFORM_PASSWORD_MAX_LENGTH);
    expect(validator(new FormControl(value))).toEqual({
      maxlength: { requiredLength: PLATFORM_PASSWORD_MAX_LENGTH, actualLength: value.length }
    });
  });

  it('requires uppercase, lowercase, and a number', () => {
    expect(validator(new FormControl('abcdefgh'))).toEqual({ passwordPolicy: true });
    expect(validator(new FormControl('ABCDEFGH'))).toEqual({ passwordPolicy: true });
    expect(validator(new FormControl('ABCDEfgh'))).toEqual({ passwordPolicy: true });
  });

  it('accepts a password that matches backend policy', () => {
    expect(validator(new FormControl('NewPass1'))).toBeNull();
  });
});

describe('passwordsMatchValidator', () => {
  it('blocks mismatched passwords', () => {
    const group = new FormGroup(
      {
        newPassword: new FormControl('NewPass1'),
        confirmPassword: new FormControl('NewPass2')
      },
      { validators: passwordsMatchValidator('newPassword', 'confirmPassword') }
    );

    expect(group.hasError('passwordMismatch')).toBe(true);
  });

  it('allows matching passwords', () => {
    const group = new FormGroup(
      {
        newPassword: new FormControl('NewPass1'),
        confirmPassword: new FormControl('NewPass1')
      },
      { validators: passwordsMatchValidator('newPassword', 'confirmPassword') }
    );

    expect(group.valid).toBe(true);
  });
});

describe('platformPasswordErrorMessage', () => {
  it('returns the backend-aligned required message', () => {
    const control = new FormControl('', platformPasswordPolicyValidator());
    expect(platformPasswordErrorMessage(control)).toBe('Password is required.');
  });
});
