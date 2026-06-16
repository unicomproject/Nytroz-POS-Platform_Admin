import { TestBed } from '@angular/core/testing';

import { createAuthSession } from '../../testing/test-fixtures';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('uses accessTokenExpiresAt to treat a future session as authenticated', () => {
    const service = TestBed.inject(AuthSessionService);

    service.setSession(createAuthSession());

    expect(service.isAuthenticated()).toBe(true);
    expect(service.accessToken()).toBe('access-token');
  });

  it('treats expired sessions as unauthenticated', () => {
    const service = TestBed.inject(AuthSessionService);

    service.setSession(createAuthSession({ accessTokenExpiresAt: new Date(Date.now() - 1000).toISOString() }));

    expect(service.isAuthenticated()).toBe(false);
  });

  it('fails closed when the access token is missing even if expiry is in the future', () => {
    const service = TestBed.inject(AuthSessionService);

    service.setSession(createAuthSession({ accessToken: '' }));

    expect(service.isAuthenticated()).toBe(false);
  });

  it('clears invalid stored session JSON and stays unauthenticated', () => {
    localStorage.setItem('scs_tix.platform_admin.auth_session', '{bad json');
    TestBed.resetTestingModule();

    const service = TestBed.inject(AuthSessionService);

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('scs_tix.platform_admin.auth_session')).toBeNull();
  });

  it('logout/clearSession removes the stored session', () => {
    const service = TestBed.inject(AuthSessionService);

    service.setSession(createAuthSession());
    service.clearSession();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('scs_tix.platform_admin.auth_session')).toBeNull();
  });
});
