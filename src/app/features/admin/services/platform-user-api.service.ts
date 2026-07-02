import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  mapPlatformUserDetail,
  mapPlatformUserListResponse,
  PlatformUserDetailApiDto,
  PlatformUserListResponseApiDto
} from '../mappers/platform-user.mapper';
import { PlatformUserDetail, PlatformUserListResponse } from '../models/platform-user.model';

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
}
