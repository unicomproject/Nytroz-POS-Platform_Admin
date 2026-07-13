import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { tenantScopedApiSegments } from '../config/api-endpoints';
import { TenantContextService } from '../services/tenant-context.service';

export const tenantContextInterceptor: HttpInterceptorFn = (request, next) => {
  const tenantContext = inject(TenantContextService);
  const tenantId = tenantContext.selectedTenantId();
  const isTenantScopedApi = tenantScopedApiSegments.some((segment) => request.url.includes(segment));

  if (!tenantId || !isTenantScopedApi) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        'X-Tenant-Id': tenantId
      }
    })
  );
};
