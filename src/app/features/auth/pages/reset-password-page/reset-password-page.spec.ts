import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { AuthApiService } from '../../services/auth-api.service';
import { ResetPasswordPage } from './reset-password-page';

const validToken = 'one-time-reset-token-fixture';

describe('ResetPasswordPage', () => {
  let authApi: {
    validatePasswordResetToken: ReturnType<typeof vi.fn>;
    completePasswordReset: ReturnType<typeof vi.fn>;
  };

  async function createComponent(query: Record<string, string> = { token: validToken }): Promise<ComponentFixture<ResetPasswordPage>> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ResetPasswordPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(query) } }
        },
        { provide: AuthApiService, useValue: authApi },
        {
          provide: ApiErrorService,
          useValue: {
            toSafeMessage: (error: unknown) =>
              error instanceof HttpErrorResponse && error.error?.message
                ? String(error.error.message)
                : 'Something went wrong. Please try again.'
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ResetPasswordPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    authApi = {
      validatePasswordResetToken: vi.fn(),
      completePasswordReset: vi.fn()
    };
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows an invalid state when the token query param is missing', async () => {
    const fixture = await createComponent({});
    await fixture.whenStable();
    fixture.detectChanges();

    expect(authApi.validatePasswordResetToken).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Invalid reset link');
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
  });

  it('calls validate with the URL token and renders the form when valid', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: true, status: 'PENDING', expiresAt: '2026-08-14T12:00:00Z' })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(authApi.validatePasswordResetToken).toHaveBeenCalledWith(validToken);
    expect((fixture.nativeElement as HTMLElement).querySelector('#newPassword')).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('#confirmPassword')).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Reset Password');
  });

  it('shows a loading state until validation finishes', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Validating reset link');
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
  });

  it('shows an invalid token state from validate', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(of({ isValid: false, status: 'INVALID', expiresAt: null }));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Invalid reset link');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(validToken);
  });

  it('shows an expired token state from validate', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: false, status: 'EXPIRED', expiresAt: '2026-08-14T11:00:00Z' })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Reset link expired');
  });

  it('shows a used token state from validate', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: false, status: 'USED', expiresAt: '2026-08-14T11:00:00Z' })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('already been used');
  });

  it('blocks submit when passwords do not match', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: true, status: 'PENDING', expiresAt: '2026-08-14T12:00:00Z' })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.setValue({ newPassword: 'NewPass1', confirmPassword: 'NewPass2' });
    component.submit();
    fixture.detectChanges();

    expect(authApi.completePasswordReset).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Passwords must match.');
  });

  it('blocks submit when the password fails client policy', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: true, status: 'PENDING', expiresAt: '2026-08-14T12:00:00Z' })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.setValue({ newPassword: 'short', confirmPassword: 'short' });
    component.submit();
    fixture.detectChanges();

    expect(authApi.completePasswordReset).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Password must be at least 8 characters.');
  });

  it('submits the complete API with the URL token and both passwords', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: true, status: 'PENDING', expiresAt: '2026-08-14T12:00:00Z' })
    );
    authApi.completePasswordReset.mockReturnValue(
      of({ success: true, message: 'Password has been reset successfully. Sign in with your new password.' })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.setValue({ newPassword: 'NewPass1', confirmPassword: 'NewPass1' });
    component.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(authApi.completePasswordReset).toHaveBeenCalledWith({
      token: validToken,
      newPassword: 'NewPass1',
      confirmPassword: 'NewPass1'
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Password reset successful');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Back to Sign In');
  });

  it('disables submit and prevents double submit while the complete request is pending', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: true, status: 'PENDING', expiresAt: '2026-08-14T12:00:00Z' })
    );
    const pending = new Subject();
    authApi.completePasswordReset.mockReturnValue(pending.asObservable());

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.setValue({ newPassword: 'NewPass1', confirmPassword: 'NewPass1' });
    component.submit();
    fixture.detectChanges();
    component.submit();

    const submitButton = (fixture.nativeElement as HTMLElement).querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement | null;

    expect(authApi.completePasswordReset).toHaveBeenCalledTimes(1);
    expect(submitButton?.disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Resetting Password');
    pending.complete();
  });

  it('displays backend password policy failure on the form', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: true, status: 'PENDING', expiresAt: '2026-08-14T12:00:00Z' })
    );
    authApi.completePasswordReset.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              success: false,
              errorCode: 'platform_password_reset.password_policy',
              message: 'Password must include uppercase, lowercase, and numeric characters.'
            }
          })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.setValue({ newPassword: 'NewPass1', confirmPassword: 'NewPass1' });
    component.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.viewState()).toBe('valid');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Password must include uppercase, lowercase, and numeric characters.'
    );
  });

  it('displays a retry-safe server failure', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Password reset failed');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Try again');
  });

  it('does not persist the reset token to localStorage or sessionStorage', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: true, status: 'PENDING', expiresAt: '2026-08-14T12:00:00Z' })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const localValues = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.getItem(localStorage.key(index) ?? '')
    );
    const sessionValues = Array.from({ length: sessionStorage.length }, (_, index) =>
      sessionStorage.getItem(sessionStorage.key(index) ?? '')
    );

    expect(localValues.join(' ')).not.toContain(validToken);
    expect(sessionValues.join(' ')).not.toContain(validToken);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(validToken);
  });
});
