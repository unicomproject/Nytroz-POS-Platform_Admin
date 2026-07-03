import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  mapPlatformSettings,
  mapUpdatePlatformSettingsRequest,
  PlatformSettingsApiDto
} from '../mappers/platform-settings.mapper';
import { PlatformSettings, UpdatePlatformSettingsRequest } from '../models/platform-settings.model';

@Injectable({ providedIn: 'root' })
export class PlatformSettingsApiService {
  private readonly baseUrl = `${appSettings.apiBaseUrl}${apiEndpoints.platform.settings}`;

  constructor(private readonly http: HttpClient) {}

  getSettings(): Observable<PlatformSettings> {
    return this.http
      .get<ApiResponse<PlatformSettingsApiDto>>(this.baseUrl)
      .pipe(map((response) => mapPlatformSettings(response.data)));
  }

  updateSettings(request: UpdatePlatformSettingsRequest): Observable<PlatformSettings> {
    return this.http
      .put<ApiResponse<PlatformSettingsApiDto>>(this.baseUrl, mapUpdatePlatformSettingsRequest(request))
      .pipe(map((response) => mapPlatformSettings(response.data)));
  }
}
