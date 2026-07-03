import { describe, expect, it } from 'vitest';

import { isoCountryCodeValidator, isoCurrencyCodeValidator } from './platform-tenant-create.validators';
import { FormControl } from '@angular/forms';

describe('platform tenant create validators', () => {
  it('accepts LK country code', () => {
    const control = new FormControl('LK', isoCountryCodeValidator());
    expect(control.valid).toBe(true);
  });

  it('rejects Sri Lanka as country code', () => {
    const control = new FormControl('Sri Lanka', isoCountryCodeValidator());
    expect(control.invalid).toBe(true);
  });

  it('accepts LKR currency code', () => {
    const control = new FormControl('LKR', isoCurrencyCodeValidator());
    expect(control.valid).toBe(true);
  });

  it('rejects LK as currency code', () => {
    const control = new FormControl('LK', isoCurrencyCodeValidator());
    expect(control.invalid).toBe(true);
  });
});
