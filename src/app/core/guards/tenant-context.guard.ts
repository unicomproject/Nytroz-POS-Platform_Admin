import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TenantContextService } from '../services/tenant-context.service';

export const tenantContextGuard: CanActivateFn = (route) => {
  const tenantContext = inject(TenantContextService);
  const router = inject(Router);
  const tenantId = route.paramMap.get('tenantId');

  return tenantContext.matchesTenant(tenantId) || router.createUrlTree(['/admin/tenants']);
};
