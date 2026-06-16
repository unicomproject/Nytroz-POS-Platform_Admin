import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { catchError, firstValueFrom, of, tap } from 'rxjs';

import { routes } from './app.routes';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { tenantContextInterceptor } from './core/interceptors/tenant-context.interceptor';
import { AuthSessionService } from './core/services/auth-session.service';
import { AuthApiService } from './features/auth/services/auth-api.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authTokenInterceptor, tenantContextInterceptor])),
    provideRouter(routes),
    provideAppInitializer(() => {
      const authApi = inject(AuthApiService);
      const authSession = inject(AuthSessionService);

      return firstValueFrom(
        authApi.refresh().pipe(
          tap((session) => authSession.setSession(session)),
          catchError((error: unknown) => {
            authSession.terminateSession(error);
            return of(null);
          }),
        ),
      );
    }),
  ],
};
