import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  mapAssignPlatformUserRolesRequest,
  mapCreatePlatformUserRequest,
  mapPlatformUserDetail,
  mapPlatformUserListResponse,
  mapUpdatePlatformUserRequest,
  PlatformUserDetailApiDto,
  PlatformUserListResponseApiDto
} from '../mappers/platform-user.mapper';
import {
  AssignPlatformUserRolesRequest,
  CreatePlatformUserRequest,
  InitiatePlatformPasswordResetResponse,
  PlatformUserDetail,
  PlatformUserListResponse,
  UpdatePlatformUserRequest
} from '../models/platform-user.model';

@Injectable({ providedIn: 'root' })
export class PlatformUserApiService {
  private readonly baseUrl = `${appSettings.apiBaseUrl}${apiEndpoints.platform.users}`;

  constructor(private readonly http: HttpClient) {}

  getUsers(): Observable<PlatformUserListResponse> {
    return this.http
      .get<ApiResponse<PlatformUserListResponseApiDto>>(this.baseUrl)
      .pipe(map((response) => mapPlatformUserListResponse(response.data)));
  }

  getUserById(userId: string): Observable<PlatformUserDetail> {
    return this.http
      .get<ApiResponse<PlatformUserDetailApiDto>>(`${this.baseUrl}/${userId}`)
      .pipe(map((response) => mapPlatformUserDetail(response.data)));
  }

  createUser(request: CreatePlatformUserRequest): Observable<PlatformUserDetail> {
    return this.http
      .post<ApiResponse<PlatformUserDetailApiDto>>(this.baseUrl, mapCreatePlatformUserRequest(request))
      .pipe(map((response) => mapPlatformUserDetail(response.data)));
  }

  updateUser(userId: string, request: UpdatePlatformUserRequest): Observable<PlatformUserDetail> {
    return this.http
      .put<ApiResponse<PlatformUserDetailApiDto>>(
        `${this.baseUrl}/${userId}`,
        mapUpdatePlatformUserRequest(request)
      )
      .pipe(map((response) => mapPlatformUserDetail(response.data)));
  }

  assignRoles(userId: string, request: AssignPlatformUserRolesRequest): Observable<PlatformUserDetail> {
    return this.http
      .put<ApiResponse<PlatformUserDetailApiDto>>(
        `${this.baseUrl}/${userId}/roles`,
        mapAssignPlatformUserRolesRequest(request)
      )
      .pipe(map((response) => mapPlatformUserDetail(response.data)));
  }

  initiatePasswordReset(userId: string): Observable<InitiatePlatformPasswordResetResponse> {
    return this.http
      .post<ApiResponse<InitiatePlatformPasswordResetResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.userPasswordReset(userId)}`,
        {}
      )
      .pipe(map((response) => response.data));
  }
}
