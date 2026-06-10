import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  toSafeMessage(error: unknown): string {
    const response = this.toApiError(error);

    return response?.message ?? 'Something went wrong. Please try again.';
  }

  toApiError(error: unknown): ApiErrorResponse | null {
    if (error instanceof HttpErrorResponse && error.error?.success === false) {
      return error.error as ApiErrorResponse;
    }

    return null;
  }
}
