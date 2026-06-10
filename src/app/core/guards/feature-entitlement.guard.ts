import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AccessControlService } from '../services/access-control.service';

export const featureEntitlementGuard: CanActivateFn = (route) => {
  const accessControl = inject(AccessControlService);
  const router = inject(Router);
  const requiredFeature = route.data['requiredFeature'] as string | undefined;

  return accessControl.hasFeature(requiredFeature) || router.createUrlTree(['/admin/feature-not-enabled']);
};
