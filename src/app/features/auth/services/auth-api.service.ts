import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AuthSession } from '../../../core/models/auth-session.model';
import { LoginRequest } from '../models/login-request.model';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  constructor(private readonly http: HttpClient) {}

  login(request: LoginRequest): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<AuthSession>>(`${appSettings.apiBaseUrl}${apiEndpoints.auth.login}`, request, {
        withCredentials: true
      })
      .pipe(map((response) => response.data));
  }

  refresh(): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<AuthSession>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.auth.refresh}`,
        {},
        { withCredentials: true }
      )
      .pipe(map((response) => response.data));
  }

  logout(): Observable<void> {
    return this.http.post<void>(
      `${appSettings.apiBaseUrl}${apiEndpoints.auth.logout}`,
      {},
      { withCredentials: true }
    );
  }
}
