import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PermissionCatalogTreeResponse } from '../models/platform-permission-catalog.model';

@Injectable({ providedIn: 'root' })
export class PlatformPermissionCatalogApiService {
  constructor(private readonly http: HttpClient) {}

  getPermissionCatalog(): Observable<PermissionCatalogTreeResponse> {
    return this.http
      .get<ApiResponse<PermissionCatalogTreeResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.permissionCatalog}`
      )
      .pipe(
        map((response) => response.data ?? { modules: [] })
      );
  }
}
