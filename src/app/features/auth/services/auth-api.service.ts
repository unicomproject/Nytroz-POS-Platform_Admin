import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AuthSession } from '../../../core/models/auth-session.model';
import { CurrentUser } from '../../../core/models/current-user.model';
import { LoginRequest } from '../models/login-request.model';

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
        request
      )
      .pipe(map((response) => this.toAuthSession(response.data)));
  }

  private toAuthSession(response: PlatformLoginResponse): AuthSession {
    const user: CurrentUser = {
      id: String(response.user.id),
      email: response.user.email,
      fullName: response.user.fullName,
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
