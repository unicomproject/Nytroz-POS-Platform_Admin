import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  mapCreatePlatformRoleRequest,
  mapPlatformRoleDetail,
  mapPlatformRoleListResponse,
  mapPlatformRolePermissionsResponse,
  mapUpdatePlatformRoleRequest,
  PlatformRoleListItemApiDto,
  PlatformRoleListResponseApiDto,
  PlatformRolePermissionsResponseApiDto
} from '../mappers/platform-role.mapper';
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
      .get<ApiResponse<PlatformRoleListResponseApiDto>>(this.baseUrl)
      .pipe(map((response) => mapPlatformRoleListResponse(response.data)));
  }

  createRole(request: CreatePlatformRoleRequest): Observable<PlatformRoleDetail> {
    return this.http
      .post<ApiResponse<PlatformRoleListItemApiDto>>(this.baseUrl, mapCreatePlatformRoleRequest(request))
      .pipe(map((response) => mapPlatformRoleDetail(response.data)));
  }

  getRole(roleId: string): Observable<PlatformRoleDetail> {
    return this.http
      .get<ApiResponse<PlatformRoleListItemApiDto>>(`${this.baseUrl}/${roleId}`)
      .pipe(map((response) => mapPlatformRoleDetail(response.data)));
  }

  updateRole(roleId: string, request: UpdatePlatformRoleRequest): Observable<PlatformRoleDetail> {
    return this.http
      .put<ApiResponse<PlatformRoleListItemApiDto>>(
        `${this.baseUrl}/${roleId}`,
        mapUpdatePlatformRoleRequest(request)
      )
      .pipe(map((response) => mapPlatformRoleDetail(response.data)));
  }

  getRolePermissions(roleId: string): Observable<PlatformRolePermissionsResponse> {
    return this.http
      .get<ApiResponse<PlatformRolePermissionsResponseApiDto>>(`${this.baseUrl}/${roleId}/permissions`)
      .pipe(map((response) => mapPlatformRolePermissionsResponse(response.data)));
  }

  updateRolePermissions(
    roleId: string,
    request: UpdatePlatformRolePermissionsRequest
  ): Observable<PlatformRolePermissionsResponse> {
    return this.http
      .put<ApiResponse<PlatformRolePermissionsResponseApiDto>>(`${this.baseUrl}/${roleId}/permissions`, request)
      .pipe(map((response) => mapPlatformRolePermissionsResponse(response.data)));
  }
}
