import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  mapCreateReturnPolicyTemplateRequest,
  mapReturnPolicyTemplateDetail,
  mapReturnPolicyTemplateListResponse,
  mapUpdateReturnPolicyTemplateRequest,
  ReturnPolicyTemplateApiDto,
  ReturnPolicyTemplateListResponseApiDto
} from '../mappers/platform-return-policy-template.mapper';
import {
  ReturnPolicyTemplateDetail,
  ReturnPolicyTemplateDraft,
  ReturnPolicyTemplateListQuery,
  ReturnPolicyTemplateListResponse
} from '../models/platform-return-policy-template.model';

@Injectable({ providedIn: 'root' })
export class PlatformReturnPolicyTemplateApiService {
  constructor(private readonly http: HttpClient) {}

  getTemplates(query: ReturnPolicyTemplateListQuery): Observable<ReturnPolicyTemplateListResponse> {
    return this.http
      .get<ApiResponse<ReturnPolicyTemplateListResponseApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.returnPolicyTemplates}`,
        { params: this.toParams(query) }
      )
      .pipe(map((response) => mapReturnPolicyTemplateListResponse(response.data, query)));
  }

  getTemplate(templateId: string): Observable<ReturnPolicyTemplateDetail> {
    return this.http
      .get<ApiResponse<ReturnPolicyTemplateApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.returnPolicyTemplate(templateId)}`
      )
      .pipe(map((response) => mapReturnPolicyTemplateDetail(response.data)));
  }

  createTemplate(draft: ReturnPolicyTemplateDraft): Observable<ReturnPolicyTemplateDetail> {
    return this.http
      .post<ApiResponse<ReturnPolicyTemplateApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.returnPolicyTemplates}`,
        mapCreateReturnPolicyTemplateRequest(draft)
      )
      .pipe(map((response) => mapReturnPolicyTemplateDetail(response.data)));
  }

  updateTemplate(templateId: string, draft: ReturnPolicyTemplateDraft): Observable<ReturnPolicyTemplateDetail> {
    return this.http
      .put<ApiResponse<ReturnPolicyTemplateApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.returnPolicyTemplate(templateId)}`,
        mapUpdateReturnPolicyTemplateRequest(draft)
      )
      .pipe(map((response) => mapReturnPolicyTemplateDetail(response.data)));
  }

  deleteTemplate(templateId: string): Observable<void> {
    return this.http
      .delete<void>(`${appSettings.apiBaseUrl}${apiEndpoints.platform.returnPolicyTemplate(templateId)}`)
      .pipe(map(() => undefined));
  }

  private toParams(query: ReturnPolicyTemplateListQuery): HttpParams {
    let params = new HttpParams()
      .set('pageNumber', String(query.pageNumber))
      .set('pageSize', String(query.pageSize));

    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }

    return params;
  }
}
