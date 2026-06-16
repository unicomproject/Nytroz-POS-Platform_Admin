import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { createAuthSession } from '../../../../testing/test-fixtures';
import { AuthApiService } from '../../services/auth-api.service';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let component: LoginPage;
  let authApi: { login: ReturnType<typeof vi.fn> };
  let authSession: { setSession: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authApi = { login: vi.fn() };
    authSession = { setSession: vi.fn() };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthApiService, useValue: authApi },
        { provide: AuthSessionService, useValue: authSession },
        { provide: Router, useValue: router },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Safe backend error' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders and starts with an invalid empty form', () => {
    expect(component).toBeTruthy();
    expect(component.form.invalid).toBe(true);
    expect(component.form.controls.email.hasError('required')).toBe(true);
    expect(component.form.controls.password.hasError('required')).toBe(true);
  });

  it('validates email format and required password', () => {
    component.form.controls.email.setValue('not-an-email');
    component.form.controls.password.setValue('');

    expect(component.form.controls.email.hasError('email')).toBe(true);
    expect(component.form.controls.password.hasError('required')).toBe(true);
  });

  it('blocks invalid submit and does not call the API', () => {
    component.submit();

    expect(component.wasSubmitted()).toBe(true);
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('calls auth service with only email and password, then redirects to dashboard', () => {
    const session = createAuthSession();
    authApi.login.mockReturnValue(of(session));
    component.form.setValue({ email: 'admin@nytroz.local', password: 'Admin@12345' });

    component.submit();

    expect(authApi.login).toHaveBeenCalledWith({ email: 'admin@nytroz.local', password: 'Admin@12345' });
    expect('rememberMe' in authApi.login.mock.calls[0][0]).toBe(false);
    expect(authSession.setSession).toHaveBeenCalledWith(session);
    expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('shows loading while login is submitting', () => {
    authApi.login.mockReturnValue(of(createAuthSession()));
    component.form.setValue({ email: 'admin@nytroz.local', password: 'Admin@12345' });

    component.submit();

    expect(component.isSubmitting()).toBe(true);
  });

  it('displays a safe backend error and clears loading on failure', () => {
    authApi.login.mockReturnValue(throwError(() => new Error('boom')));
    component.form.setValue({ email: 'admin@nytroz.local', password: 'bad-password' });

    component.submit();
    fixture.detectChanges();

    expect(component.isSubmitting()).toBe(false);
    expect(component.errorMessage()).toBe('Safe backend error');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Safe backend error');
  });
});
