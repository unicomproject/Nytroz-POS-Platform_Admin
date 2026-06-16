import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { AuthSession } from '../models/auth-session.model';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  let service: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthSessionService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('reports expired sessions and inactive users as unauthenticated', () => {
    service.setSession(
      createSession({ sessionExpiresAt: new Date(Date.now() - 1_000).toISOString() }),
    );

    expect(service.sessionExpired()).toBe(true);
    expect(service.isAuthenticated()).toBe(false);

    service.setSession(createSession({ userStatus: 'inactive' }));

    expect(service.isUserActive()).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('marks access tokens within thirty seconds of expiry for refresh', () => {
    service.setSession(
      createSession({ accessTokenExpiresAt: new Date(Date.now() + 10_000).toISOString() }),
    );

    expect(service.accessTokenExpiresSoon()).toBe(true);
    expect(service.shouldRefreshAccessToken()).toBe(true);
  });

  it('maps refresh-token reuse to an explicit force-login notice', () => {
    service.setSession(createSession());

    service.terminateSession(
      new HttpErrorResponse({
        status: 401,
        error: {
          success: false,
          message: 'Session revoked',
          errorCode: 'REFRESH_TOKEN_REUSED',
          errors: [],
        },
      }),
    );

    expect(service.session()).toBeNull();
    expect(service.loginNotice()).toContain('refresh token was reused');
    expect(service.loginNotice()).toContain('sign in again');
  });
});

function createSession(
  overrides: {
    accessTokenExpiresAt?: string;
    sessionExpiresAt?: string;
    userStatus?: string;
  } = {},
): AuthSession {
  return {
    accessToken: 'access-token',
    tokenType: 'Bearer',
    accessTokenExpiresAt:
      overrides.accessTokenExpiresAt ?? new Date(Date.now() + 5 * 60_000).toISOString(),
    sessionExpiresAt:
      overrides.sessionExpiresAt ?? new Date(Date.now() + 8 * 60 * 60_000).toISOString(),
    user: {
      id: 'user-id',
      email: 'admin@example.com',
      fullName: 'Platform Admin',
      status: overrides.userStatus ?? 'active',
    },
  };
}
