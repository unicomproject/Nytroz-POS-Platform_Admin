import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthSession } from '../models/auth-session.model';
import { AuthSessionService } from '../services/auth-session.service';
import { authTokenInterceptor } from './auth-token.interceptor';

describe('authTokenInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authSession: AuthSessionService;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigate = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate } },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    authSession = TestBed.inject(AuthSessionService);
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
  });

  it('refreshes an expiring access token before sending the protected request', () => {
    authSession.setSession(
      createSession({
        accessToken: 'old-token',
        accessTokenExpiresAt: new Date(Date.now() + 10_000).toISOString(),
      }),
    );

    http.get('/api/v1/tenants').subscribe();

    const refresh = httpTesting.expectOne('/api/v1/auth/platform-refresh');
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush(createApiResponse(createSession({ accessToken: 'new-token' })));

    const protectedRequest = httpTesting.expectOne('/api/v1/tenants');
    expect(protectedRequest.request.headers.get('Authorization')).toBe('Bearer new-token');
    protectedRequest.flush({});
  });

  it('shares one refresh request across concurrent protected requests', () => {
    authSession.setSession(
      createSession({ accessTokenExpiresAt: new Date(Date.now() - 1_000).toISOString() }),
    );

    http.get('/api/v1/tenants').subscribe();
    http.get('/api/v1/tenants').subscribe();

    const refresh = httpTesting.expectOne('/api/v1/auth/platform-refresh');
    refresh.flush(createApiResponse(createSession({ accessToken: 'shared-token' })));

    const protectedRequests = httpTesting.match('/api/v1/tenants');
    expect(protectedRequests).toHaveLength(2);
    protectedRequests.forEach((request) => {
      expect(request.request.headers.get('Authorization')).toBe('Bearer shared-token');
      request.flush({});
    });
  });

  it('forces login without refreshing when a valid-looking token receives 401', () => {
    authSession.setSession(createSession());
    let receivedStatus: number | undefined;

    http.get('/api/v1/tenants').subscribe({
      error: (error: HttpErrorResponse) => (receivedStatus = error.status),
    });

    const protectedRequest = httpTesting.expectOne('/api/v1/tenants');
    protectedRequest.flush(
      { success: false, message: 'Session inactive', errorCode: 'SESSION_NOT_ACTIVE', errors: [] },
      { status: 401, statusText: 'Unauthorized' },
    );

    httpTesting.expectNone('/api/v1/auth/platform-refresh');
    expect(receivedStatus).toBe(401);
    expect(authSession.session()).toBeNull();
    expect(authSession.loginNotice()).toContain('expired or was revoked');
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not attach bearer tokens to external or auth requests', () => {
    authSession.setSession(createSession());

    http.get('https://example.com/data').subscribe();
    http.post('/api/v1/auth/platform-logout', {}).subscribe();

    const externalRequest = httpTesting.expectOne('https://example.com/data');
    const authRequest = httpTesting.expectOne('/api/v1/auth/platform-logout');

    expect(externalRequest.request.headers.has('Authorization')).toBe(false);
    expect(authRequest.request.headers.has('Authorization')).toBe(false);
    externalRequest.flush({});
    authRequest.flush({});
  });

  it('shows an explicit security notice when refresh-token reuse is detected', () => {
    authSession.setSession(
      createSession({ accessTokenExpiresAt: new Date(Date.now() - 1_000).toISOString() }),
    );

    http.get('/api/v1/tenants').subscribe({ error: () => undefined });

    const refresh = httpTesting.expectOne('/api/v1/auth/platform-refresh');
    refresh.flush(
      { success: false, message: 'Session revoked', errorCode: 'REFRESH_TOKEN_REUSED', errors: [] },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(authSession.session()).toBeNull();
    expect(authSession.loginNotice()).toContain('refresh token was reused');
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});

function createSession(
  overrides: {
    accessToken?: string;
    accessTokenExpiresAt?: string;
    sessionExpiresAt?: string;
    userStatus?: string;
  } = {},
): AuthSession {
  return {
    accessToken: overrides.accessToken ?? 'access-token',
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

function createApiResponse(session: AuthSession) {
  return {
    success: true,
    message: 'Session refreshed',
    data: session,
  };
}
