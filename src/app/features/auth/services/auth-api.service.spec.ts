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

    request.flush({ success: true, message: 'ok', data: session });
    expect(result).toBe('mapped-token');
  });
});
