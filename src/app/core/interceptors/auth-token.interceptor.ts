import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { apiEndpoints } from '../config/api-endpoints';
import { appSettings } from '../config/app-settings';
import { AuthSessionService } from '../services/auth-session.service';
import { AuthApiService } from '../../features/auth/services/auth-api.service';

const authRetryAttempted = new HttpContextToken<boolean>(() => false);
export const skipPlatformAuth = new HttpContextToken<boolean>(() => false);

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const authSession = inject(AuthSessionService);
  const authApi = inject(AuthApiService);
  const router = inject(Router);
  const accessToken = authSession.accessToken();
  const isAuthEndpoint = isPlatformAuthEndpoint(request.url);
  const skipsAuth = request.context.get(skipPlatformAuth);
  const requestWithToken = !accessToken || isAuthEndpoint || skipsAuth
    ? request
    : request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        }
      });

  return next(requestWithToken).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        isAuthEndpoint ||
        skipsAuth ||
        request.context.get(authRetryAttempted)
      ) {
        return throwError(() => error);
      }

      return authApi.refresh().pipe(
        switchMap((session) => {
          authSession.setSession(session);

          return next(
            request.clone({
              context: request.context.set(authRetryAttempted, true),
              setHeaders: {
                Authorization: `Bearer ${session.accessToken}`
              }
            })
          );
        }),
        catchError((refreshError: unknown) => {
          authSession.clearSession();
          void router.navigate(['/login']);

          return throwError(() => refreshError);
        })
      );
    })
  );
};

function isPlatformAuthEndpoint(url: string): boolean {
  const authPaths = [
    apiEndpoints.auth.login,
    apiEndpoints.auth.refresh,
    apiEndpoints.auth.logout,
    apiEndpoints.auth.passwordResetValidate,
    apiEndpoints.auth.passwordResetComplete
  ].map((path) => `${appSettings.apiBaseUrl}${path}`);

  return authPaths.some((path) => url.includes(path));
}
