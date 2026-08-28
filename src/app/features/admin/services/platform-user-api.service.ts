import { HttpClient, HttpParams } from '@angular/common/http';
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
  PlatformUserListQuery,
  PlatformUserListResponse,
  UpdatePlatformUserRequest
} from '../models/platform-user.model';

@Injectable({ providedIn: 'root' })
export class PlatformUserApiService {
  private readonly baseUrl = `${appSettings.apiBaseUrl}${apiEndpoints.platform.users}`;

  constructor(private readonly http: HttpClient) {}

  getUsers(query?: PlatformUserListQuery): Observable<PlatformUserListResponse> {
    let params = new HttpParams();
    if (query) {
      if (query.pageNumber !== undefined && query.pageNumber !== null) {
        params = params.set('pageNumber', query.pageNumber.toString());
      }
      if (query.pageSize !== undefined && query.pageSize !== null) {
        params = params.set('pageSize', query.pageSize.toString());
      }
      if (query.search?.trim()) {
        params = params.set('search', query.search.trim());
      }
      if (query.status?.trim()) {
        params = params.set('status', query.status.trim());
      }
      if (query.role?.trim()) {
        params = params.set('role', query.role.trim());
      }
      if (query.sortBy?.trim()) {
        params = params.set('sortBy', query.sortBy.trim());
      }
      if (query.sortDirection?.trim()) {
        params = params.set('sortDirection', query.sortDirection.trim());
      }
    }

    return this.http
      .get<ApiResponse<PlatformUserListResponseApiDto>>(this.baseUrl, { params })
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
