import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  BootstrapOnlineStoreResponse,
  BootstrapOnlineStoreUpsertRequest,
  BootstrapOutletCreateRequest,
  BootstrapOutletResponse,
  BootstrapProductCreateRequest,
  BootstrapProductImportCommitResponse,
  BootstrapProductImportValidateResponse,
  BootstrapProductResponse,
  BootstrapRoleCreateRequest,
  BootstrapRoleResponse,
  BootstrapSummary,
  BootstrapSummaryApiDto,
  BootstrapTillCreateRequest,
  BootstrapTillResponse,
  BootstrapUserCreateRequest,
  BootstrapUserResponse,
  mapBootstrapSummary
} from '../models/selected-tenant-bootstrap.model';

@Injectable({ providedIn: 'root' })
export class SelectedTenantBootstrapApiService {
  private readonly http = inject(HttpClient);

  getSummary(tenantId: string): Observable<BootstrapSummary> {
    return this.http
      .get<ApiResponse<BootstrapSummaryApiDto>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.bootstrap.summary(tenantId)}`
      )
      .pipe(map((response) => mapBootstrapSummary(response.data)));
  }

  createOutlet(
    tenantId: string,
    request: BootstrapOutletCreateRequest,
    idempotencyKey: string
  ): Observable<BootstrapOutletResponse> {
    return this.http
      .post<ApiResponse<BootstrapOutletResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.bootstrap.outlets(tenantId)}`,
        request,
        { headers: this.idempotencyHeaders(idempotencyKey) }
      )
      .pipe(map((response) => response.data));
  }

  createTill(
    tenantId: string,
    request: BootstrapTillCreateRequest,
    idempotencyKey: string
  ): Observable<BootstrapTillResponse> {
    return this.http
      .post<ApiResponse<BootstrapTillResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.bootstrap.tills(tenantId)}`,
        request,
        { headers: this.idempotencyHeaders(idempotencyKey) }
      )
      .pipe(map((response) => response.data));
  }

  createRole(
    tenantId: string,
    request: BootstrapRoleCreateRequest,
    idempotencyKey: string
  ): Observable<BootstrapRoleResponse> {
    return this.http
      .post<ApiResponse<BootstrapRoleResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.bootstrap.roles(tenantId)}`,
        request,
        { headers: this.idempotencyHeaders(idempotencyKey) }
      )
      .pipe(map((response) => response.data));
  }

  createUser(
    tenantId: string,
    request: BootstrapUserCreateRequest,
    idempotencyKey: string
  ): Observable<BootstrapUserResponse> {
    return this.http
      .post<ApiResponse<BootstrapUserResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.bootstrap.users(tenantId)}`,
        request,
        { headers: this.idempotencyHeaders(idempotencyKey) }
      )
      .pipe(map((response) => response.data));
  }

  createProduct(
    tenantId: string,
    request: BootstrapProductCreateRequest,
    idempotencyKey: string
  ): Observable<BootstrapProductResponse> {
    return this.http
      .post<ApiResponse<BootstrapProductResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.bootstrap.products(tenantId)}`,
        request,
        { headers: this.idempotencyHeaders(idempotencyKey) }
      )
      .pipe(map((response) => response.data));
  }

  downloadImportTemplate(tenantId: string): Observable<Blob> {
    return this.http.get(
      `${appSettings.apiBaseUrl}${apiEndpoints.platform.bootstrap.importTemplate(tenantId)}`,
      { responseType: 'blob' }
    );
  }

  validateProductImport(
    tenantId: string,
    file: File,
    idempotencyKey: string
  ): Observable<BootstrapProductImportValidateResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http
      .post<ApiResponse<BootstrapProductImportValidateResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.bootstrap.importValidate(tenantId)}`,
        formData,
        { headers: this.idempotencyHeaders(idempotencyKey) }
      )
      .pipe(map((response) => response.data));
  }

  commitProductImport(
    tenantId: string,
    importId: string,
    idempotencyKey: string
  ): Observable<BootstrapProductImportCommitResponse> {
    return this.http
      .post<ApiResponse<BootstrapProductImportCommitResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.bootstrap.importCommit(tenantId, importId)}`,
        {},
        { headers: this.idempotencyHeaders(idempotencyKey) }
      )
      .pipe(map((response) => response.data));
  }

  downloadImportErrors(tenantId: string, importId: string): Observable<Blob> {
    return this.http.get(
      `${appSettings.apiBaseUrl}${apiEndpoints.platform.bootstrap.importErrors(tenantId, importId)}`,
      { responseType: 'blob' }
    );
  }

  getOnlineStore(tenantId: string): Observable<BootstrapOnlineStoreResponse> {
    return this.http
      .get<ApiResponse<BootstrapOnlineStoreResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.bootstrap.onlineStore(tenantId)}`
      )
      .pipe(map((response) => response.data));
  }

  upsertOnlineStore(
    tenantId: string,
    request: BootstrapOnlineStoreUpsertRequest,
    idempotencyKey: string
  ): Observable<BootstrapOnlineStoreResponse> {
    return this.http
      .put<ApiResponse<BootstrapOnlineStoreResponse>>(
        `${appSettings.apiBaseUrl}${apiEndpoints.platform.bootstrap.onlineStore(tenantId)}`,
        request,
        { headers: this.idempotencyHeaders(idempotencyKey) }
      )
      .pipe(map((response) => response.data));
  }

  private idempotencyHeaders(idempotencyKey: string): HttpHeaders {
    return new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
  }
}
