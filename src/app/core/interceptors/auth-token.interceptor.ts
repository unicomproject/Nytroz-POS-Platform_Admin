import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  finalize,
  map,
  Observable,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { apiEndpoints } from '../config/api-endpoints';
import { appSettings } from '../config/app-settings';
import { ApiResponse } from '../models/api-response.model';
import { AuthSession } from '../models/auth-session.model';
import { AuthSessionService } from '../services/auth-session.service';

let refreshRequest$: Observable<AuthSession> | null = null;

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const authSession = inject(AuthSessionService);
  const backend = inject(HttpBackend);
  const router = inject(Router);
  const isProtectedApiRequest = isFirstPartyApiRequest(request.url) && !isAuthRequest(request.url);

  if (!isProtectedApiRequest) {
    return next(request);
  }

  const accessToken = authSession.accessToken();

  if (!accessToken) {
    return next(request);
  }

  if (authSession.hasSessionExpired() || !authSession.isCurrentUserActive()) {
    const authError = createAuthError();
    forceLogin(authSession, router, authError);
    return throwError(() => authError);
  }

  if (authSession.shouldRefreshAccessToken()) {
    return refreshPlatformSession(backend, authSession).pipe(
      switchMap((session) => next(addBearerToken(request, session.accessToken))),
      catchError((error: unknown) => {
        forceLogin(authSession, router, error);
        return throwError(() => error);
      }),
    );
  }

  return next(addBearerToken(request, accessToken)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      forceLogin(authSession, router, error);
      return throwError(() => error);
    }),
  );
};

function refreshPlatformSession(
  backend: HttpBackend,
  authSession: AuthSessionService,
): Observable<AuthSession> {
  if (!refreshRequest$) {
    const rawHttp = new HttpClient(backend);
    refreshRequest$ = rawHttp
      .post<
        ApiResponse<AuthSession>
      >(`${appSettings.apiBaseUrl}${apiEndpoints.auth.refresh}`, {}, { withCredentials: true })
      .pipe(
        map((response) => response.data),
        tap((session) => authSession.setSession(session)),
        shareReplay({ bufferSize: 1, refCount: false }),
        finalize(() => {
          refreshRequest$ = null;
        }),
      );
  }

  return refreshRequest$;
}

function addBearerToken<T>(request: HttpRequest<T>, accessToken: string): HttpRequest<T> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

function isFirstPartyApiRequest(requestUrl: string): boolean {
  const applicationOrigin = window.location.origin;
  const apiUrl = new URL(appSettings.apiBaseUrl, applicationOrigin);
  const resolvedRequestUrl = new URL(requestUrl, applicationOrigin);
  const apiPath = apiUrl.pathname.endsWith('/') ? apiUrl.pathname : `${apiUrl.pathname}/`;

  return (
    resolvedRequestUrl.origin === apiUrl.origin && resolvedRequestUrl.pathname.startsWith(apiPath)
  );
}

function isAuthRequest(requestUrl: string): boolean {
  const requestPath = new URL(requestUrl, window.location.origin).pathname;

  return Object.values(apiEndpoints.auth).some(
    (endpoint) => requestPath === `${appSettings.apiBaseUrl}${endpoint}`,
  );
}

function forceLogin(authSession: AuthSessionService, router: Router, error: unknown): void {
  authSession.terminateSession(error);
  void router.navigate(['/login']);
}

function createAuthError(): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 401,
    statusText: 'Authentication required',
  });
}
