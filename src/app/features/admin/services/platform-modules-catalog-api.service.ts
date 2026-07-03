import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  mapPlatformModulesCatalogResponse,
  PlatformModulesCatalogResponseApiDto
} from '../mappers/platform-modules-catalog.mapper';
import { PlatformModulesCatalogResponse } from '../models/platform-modules-catalog.model';

@Injectable({ providedIn: 'root' })
export class PlatformModulesCatalogApiService {
  constructor(private readonly http: HttpClient) {}

  getCatalog(): Observable<PlatformModulesCatalogResponse> {
    return this.http
      .get<ApiResponse<PlatformModulesCatalogResponseApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.modulesCatalog}`
      )
      .pipe(map((response) => mapPlatformModulesCatalogResponse(response.data)));
  }
}
