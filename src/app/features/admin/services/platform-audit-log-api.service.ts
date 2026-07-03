import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  mapPlatformAuditLogListQueryParams,
  mapPlatformAuditLogListResponse,
  PlatformAuditLogListResponseApiDto
} from '../mappers/platform-audit-log.mapper';
import { PlatformAuditLogListQuery, PlatformAuditLogListResponse } from '../models/platform-audit-log.model';

@Injectable({ providedIn: 'root' })
export class PlatformAuditLogApiService {
  constructor(private readonly http: HttpClient) {}

  getAuditLogs(query: PlatformAuditLogListQuery): Observable<PlatformAuditLogListResponse> {
    return this.http
      .get<ApiResponse<PlatformAuditLogListResponseApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.auditLogs}`,
        { params: this.toParams(query) }
      )
      .pipe(map((response) => mapPlatformAuditLogListResponse(response.data, query)));
  }

  private toParams(query: PlatformAuditLogListQuery): HttpParams {
    const entries = mapPlatformAuditLogListQueryParams(query);
    let params = new HttpParams();

    for (const [key, value] of Object.entries(entries)) {
      params = params.set(key, value);
    }

    return params;
  }
}
