import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  CreatePlatformRoleRequest,
  PlatformRoleDetail,
  PlatformRoleListResponse,
  PlatformRolePermissionsResponse,
  UpdatePlatformRolePermissionsRequest,
  UpdatePlatformRoleRequest
} from '../models/platform-role-management.model';

@Injectable({ providedIn: 'root' })
export class PlatformRoleManagementApiService {
  private readonly baseUrl = `${appSettings.apiBaseUrl}${apiEndpoints.platform.roles}`;

  constructor(private readonly http: HttpClient) {}

  getRoles(): Observable<PlatformRoleListResponse> {
    return this.http
      .get<ApiResponse<PlatformRoleListResponse>>(this.baseUrl)
      .pipe(map((response) => response.data ?? { roles: [] }));
  }

  createRole(request: CreatePlatformRoleRequest): Observable<PlatformRoleDetail> {
    return this.http
      .post<ApiResponse<PlatformRoleDetail>>(this.baseUrl, request)
      .pipe(map((response) => response.data));
  }

  getRole(roleId: string): Observable<PlatformRoleDetail> {
    return this.http
      .get<ApiResponse<PlatformRoleDetail>>(`${this.baseUrl}/${roleId}`)
      .pipe(map((response) => response.data));
  }

  updateRole(roleId: string, request: UpdatePlatformRoleRequest): Observable<PlatformRoleDetail> {
    return this.http
      .put<ApiResponse<PlatformRoleDetail>>(`${this.baseUrl}/${roleId}`, request)
      .pipe(map((response) => response.data));
  }

  getRolePermissions(roleId: string): Observable<PlatformRolePermissionsResponse> {
    return this.http
      .get<ApiResponse<PlatformRolePermissionsResponse>>(`${this.baseUrl}/${roleId}/permissions`)
      .pipe(map((response) => response.data));
  }

  updateRolePermissions(
    roleId: string,
    request: UpdatePlatformRolePermissionsRequest
  ): Observable<PlatformRolePermissionsResponse> {
    return this.http
      .put<ApiResponse<PlatformRolePermissionsResponse>>(`${this.baseUrl}/${roleId}/permissions`, request)
      .pipe(map((response) => response.data));
  }
}
