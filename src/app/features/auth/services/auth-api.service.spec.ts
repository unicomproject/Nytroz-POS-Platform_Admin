import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { createAuthSession } from '../../../testing/test-fixtures';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('calls the platform login endpoint and maps the session response', () => {
    const session = createAuthSession({ accessToken: 'mapped-token' });
    let result = '';

    service.login({ email: 'admin@nytroz.local', password: 'Admin@12345' }).subscribe((response) => {
      result = response.accessToken;
    });

    const request = httpTesting.expectOne('/api/v1/auth/platform-login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'admin@nytroz.local', password: 'Admin@12345' });
    expect('rememberMe' in request.request.body).toBe(false);

    request.flush({
      success: true,
      message: 'ok',
      data: {
        accessToken: session.accessToken,
        tokenType: session.tokenType,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        sessionExpiresAt: session.refreshTokenExpiresAt,
        user: {
          id: session.user.id,
          email: session.user.email,
          fullName: session.user.fullName,
          status: session.user.status,
          platformPermissions: session.user.platformPermissions
        }
      }
    });
    expect(result).toBe('mapped-token');
  });

  it('derives fullName from email when backend fullName is empty', () => {
    let fullName = '';

    service.login({ email: 'posunique001@gmail.com', password: 'Admin@12345' }).subscribe((response) => {
      fullName = response.user.fullName;
    });

    const request = httpTesting.expectOne('/api/v1/auth/platform-login');
    request.flush({
      success: true,
      message: 'ok',
      data: {
        accessToken: 'token',
        tokenType: 'Bearer',
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        sessionExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        user: {
          id: 'platform-user-1',
          email: 'posunique001@gmail.com',
          fullName: '',
          status: 'active',
          platformPermissions: ['platform.admin.access']
        }
      }
    });

    expect(fullName).toBe('Posunique001');
  });

  it('maps platformPermissions from the login response user payload', () => {
    let permissions: string[] = [];

    service.login({ email: 'admin@nytroz.local', password: 'Admin@12345' }).subscribe((response) => {
      permissions = response.user.platformPermissions ?? [];
    });

    const request = httpTesting.expectOne('/api/v1/auth/platform-login');
    request.flush({
      success: true,
      message: 'ok',
      data: {
        accessToken: 'token',
        tokenType: 'Bearer',
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        sessionExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        user: {
          id: 'platform-user-1',
          email: 'admin@nytroz.local',
          fullName: 'Platform Admin',
          status: 'active',
          platformPermissions: ['platform.subscription_plans.view', 'platform.subscription_plans.create']
        }
      }
    });

    expect(permissions).toEqual([
      'platform.subscription_plans.view',
      'platform.subscription_plans.create'
    ]);
  });

  it('calls the platform refresh endpoint and maps the replacement session', () => {
    let accessToken = '';

    service.refresh().subscribe((response) => {
      accessToken = response.accessToken;
    });

    const request = httpTesting.expectOne('/api/v1/auth/platform-refresh');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);

    request.flush({
      success: true,
      message: 'ok',
      data: {
        accessToken: 'refreshed-token',
        tokenType: 'Bearer',
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        sessionExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        user: {
          id: 'platform-user-1',
          email: 'admin@nytroz.local',
          fullName: 'Platform Admin',
          status: 'active',
          platformPermissions: []
        }
      }
    });

    expect(accessToken).toBe('refreshed-token');
  });

  it('calls the platform logout endpoint with refresh cookie credentials', () => {
    let loggedOut = false;

    service.logout().subscribe((response) => {
      loggedOut = response;
    });

    const request = httpTesting.expectOne('/api/v1/auth/platform-logout');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);

    request.flush({ success: true, message: 'ok', data: true });

    expect(loggedOut).toBe(true);
  });

  it('validates a password reset token through the platform auth endpoint', () => {
    let isValid = false;

    service.validatePasswordResetToken('reset-token').subscribe((response) => {
      isValid = response.isValid;
    });

    const request = httpTesting.expectOne('/api/v1/auth/platform-password-reset/validate');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ token: 'reset-token' });

    request.flush({
      success: true,
      message: 'ok',
      data: {
        isValid: true,
        status: 'PENDING',
        expiresAt: '2026-07-21T00:00:00Z'
      }
    });

    expect(isValid).toBe(true);
  });

  it('completes a password reset through the platform auth endpoint', () => {
    let completed = false;

    service
      .completePasswordReset({
        token: 'reset-token',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123'
      })
      .subscribe((response) => {
        completed = response;
      });

    const request = httpTesting.expectOne('/api/v1/auth/platform-password-reset/complete');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      token: 'reset-token',
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123'
    });

    request.flush({ success: true, message: 'ok', data: true });

    expect(completed).toBe(true);
  });
});
