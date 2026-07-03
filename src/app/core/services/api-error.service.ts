import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl } from '@angular/forms';

import { ApiErrorResponse, ApiFieldError } from '../models/api-response.model';
import { isRawDatabaseMessage } from '../../features/admin/validators/platform-tenant-create.validators';

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  toSafeMessage(error: unknown): string {
    const response = this.toApiError(error);

    if (response?.message) {
      if (isRawDatabaseMessage(response.message)) {
        return 'One or more fields are invalid. Please review the highlighted fields.';
      }

      return response.message;
    }

    return 'Something went wrong. Please try again.';
  }

  toFieldErrors(error: unknown): ApiFieldError[] {
    return this.toApiError(error)?.errors ?? [];
  }

  applyFieldErrors(fieldErrors: ApiFieldError[], controlsByField: Record<string, AbstractControl | null | undefined>): void {
    for (const item of fieldErrors) {
      if (!item.field) {
        continue;
      }

      const control = controlsByField[item.field];
      if (!control) {
        continue;
      }

      control.setErrors({ ...(control.errors ?? {}), server: item.message });
      control.markAsTouched();
    }
  }

  toApiError(error: unknown): ApiErrorResponse | null {
    if (error instanceof HttpErrorResponse && error.error?.success === false) {
      return error.error as ApiErrorResponse;
    }

    return null;
  }
}
