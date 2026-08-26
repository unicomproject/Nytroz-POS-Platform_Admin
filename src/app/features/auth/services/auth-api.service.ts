import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AuthSession } from '../../../core/models/auth-session.model';
import { CurrentUser } from '../../../core/models/current-user.model';
import { LoginRequest } from '../models/login-request.model';
import {
  CompletePlatformPasswordResetRequest,
  CompletePlatformPasswordResetResponse,
  ValidatePlatformPasswordResetTokenResponse
} from '../models/password-reset.model';

interface PlatformLoginResponse {
  accessToken: string;
  tokenType: string;
  accessTokenExpiresAt: string;
  sessionExpiresAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    status: string;
    platformPermissions?: string[];
  };
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  constructor(private readonly http: HttpClient) {}

  login(request: LoginRequest): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<PlatformLoginResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.auth.login}`,
        request,
        { withCredentials: true }
      )
      .pipe(map((response) => this.toAuthSession(response.data)));
  }

  refresh(): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<PlatformLoginResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.auth.refresh}`,
        {},
        { withCredentials: true }
      )
      .pipe(map((response) => this.toAuthSession(response.data)));
  }

  logout(): Observable<boolean> {
    return this.http
      .post<ApiResponse<boolean>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.auth.logout}`,
        {},
        { withCredentials: true }
      )
      .pipe(map((response) => response.data === true));
  }

  validatePasswordResetToken(token: string): Observable<ValidatePlatformPasswordResetTokenResponse> {
    return this.http
      .post<ApiResponse<ValidatePlatformPasswordResetTokenResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.auth.passwordResetValidate}`,
        { token }
      )
      .pipe(
        map(
          (response) =>
            response.data ?? {
              isValid: false,
              status: 'INVALID',
              expiresAt: null
            }
        )
      );
  }

  completePasswordReset(
    request: CompletePlatformPasswordResetRequest
  ): Observable<CompletePlatformPasswordResetResponse> {
    return this.http
      .post<ApiResponse<CompletePlatformPasswordResetResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.auth.passwordResetComplete}`,
        {
          token: request.token,
          newPassword: request.newPassword,
          confirmPassword: request.confirmPassword
        }
      )
      .pipe(
        map(
          (response) =>
            response.data ?? {
              success: false,
              message: response.message
            }
        )
      );
  }

  private toAuthSession(response: PlatformLoginResponse): AuthSession {
    const fullName =
      response.user.fullName?.trim() ||
      deriveDisplayNameFromEmail(response.user.email);

    const user: CurrentUser = {
      id: String(response.user.id),
      email: response.user.email,
      fullName,
      status: response.user.status,
      platformPermissions: response.user.platformPermissions ?? []
    };

    return {
      accessToken: response.accessToken,
      refreshToken: '',
      tokenType: response.tokenType,
      accessTokenExpiresAt: response.accessTokenExpiresAt,
      refreshTokenExpiresAt: response.sessionExpiresAt,
      user
    };
  }
}

function deriveDisplayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0]?.trim();
  if (!localPart) {
    return email;
  }

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
