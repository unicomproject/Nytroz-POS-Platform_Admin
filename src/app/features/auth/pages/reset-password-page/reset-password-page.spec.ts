import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { AuthApiService } from '../../services/auth-api.service';
import { ResetPasswordPage } from './reset-password-page';

describe('ResetPasswordPage', () => {
  let fixture: ComponentFixture<ResetPasswordPage>;
  let component: ResetPasswordPage;
  let authApi: {
    validatePasswordResetToken: ReturnType<typeof vi.fn>;
    completePasswordReset: ReturnType<typeof vi.fn>;
  };
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordPage],
      providers: [
        provideRouter([]),
        { provide: AuthApiService, useValue: authApi },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Safe backend error' } },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    authApi = {
      validatePasswordResetToken: vi.fn(),
      completePasswordReset: vi.fn()
    };
    queryParamMap$ = new BehaviorSubject(convertToParamMap({ token: 'reset-token' }));
  });

  it('shows loading while validating the reset token', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(new Subject().asObservable());
    await createComponent();

    expect(component.view()).toBe('loading');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Validating reset link');
  });

  it('shows invalid state when token query param is missing', async () => {
    queryParamMap$.next(convertToParamMap({}));
    authApi.validatePasswordResetToken.mockReturnValue(of({ isValid: false, status: 'INVALID', expiresAt: null }));
    await createComponent();

    expect(component.view()).toBe('invalid');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Invalid reset link');
  });

  it('shows expired state when validation returns EXPIRED', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: false, status: 'EXPIRED', expiresAt: '2026-07-01T00:00:00Z' })
    );
    await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.view()).toBe('expired');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Reset link expired');
  });

  it('shows used state when validation returns USED', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: false, status: 'USED', expiresAt: '2026-07-01T00:00:00Z' })
    );
    await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.view()).toBe('used');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Reset link already used');
  });

  it('shows revoked state when validation returns REVOKED', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: false, status: 'REVOKED', expiresAt: null })
    );
    await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.view()).toBe('revoked');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Reset link revoked');
  });

  it('shows the reset form when validation succeeds with PENDING status', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: true, status: 'PENDING', expiresAt: '2026-07-21T00:00:00Z' })
    );
    await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.view()).toBe('form');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Set a new password');
  });

  it('shows password mismatch validation before submit', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: true, status: 'PENDING', expiresAt: '2026-07-21T00:00:00Z' })
    );
    await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    component.form.setValue({ newPassword: 'ValidPass1', confirmPassword: 'Different1' });
    component.submit();
    fixture.detectChanges();

    expect(authApi.completePasswordReset).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Passwords do not match');
  });

  it('completes reset and shows login link on success', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(
      of({ isValid: true, status: 'PENDING', expiresAt: '2026-07-21T00:00:00Z' })
    );
    authApi.completePasswordReset.mockReturnValue(of(true));
    await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    component.form.setValue({ newPassword: 'ValidPass1', confirmPassword: 'ValidPass1' });
    component.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(authApi.completePasswordReset).toHaveBeenCalledWith({
      token: 'reset-token',
      newPassword: 'ValidPass1',
      confirmPassword: 'ValidPass1'
    });
    expect(component.view()).toBe('success');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Go to sign in');
  });

  it('shows invalid state when validation request fails', async () => {
    authApi.validatePasswordResetToken.mockReturnValue(throwError(() => new Error('network')));
    await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.view()).toBe('invalid');
  });
});
