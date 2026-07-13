import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TenantContextService } from '../services/tenant-context.service';

export const tenantContextGuard: CanActivateFn = (route) => {
  const tenantContext = inject(TenantContextService);
  const router = inject(Router);
  const tenantId = route.paramMap.get('tenantId');

  if (!tenantId || !isUuid(tenantId)) {
    return router.createUrlTree(['/admin/tenants']);
  }

  tenantContext.setSelectedTenantId(tenantId);
  return true;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
