import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PlatformDashboard } from '../models/platform-dashboard.model';
import {
  mapPlatformDashboard,
  PlatformDashboardApiDto
} from '../mappers/platform-dashboard.mapper';

@Injectable({ providedIn: 'root' })
export class PlatformDashboardApiService {
  constructor(private readonly http: HttpClient) {}

  getDashboard(): Observable<PlatformDashboard> {
    return this.http
      .get<ApiResponse<PlatformDashboardApiDto>>(`${appSettings.apiBaseUrl}${apiEndpoints.platform.dashboard}`)
      .pipe(map((response) => mapPlatformDashboard(response.data)));
  }
}
