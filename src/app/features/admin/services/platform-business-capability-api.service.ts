import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import { BusinessCapabilityMapResponse } from '../models/business-capability-map.model';

@Injectable({ providedIn: 'root' })
export class PlatformBusinessCapabilityApiService {
  constructor(private readonly http: HttpClient) {}

  getBusinessCapabilityMap(): Observable<BusinessCapabilityMapResponse> {
    const url = `${appSettings.apiBaseUrl}${apiEndpoints.platform.businessCapabilityMap}`;
    return this.http
      .get<ApiResponse<BusinessCapabilityMapResponse>>(url)
      .pipe(map((response) => response.data));
  }
}
