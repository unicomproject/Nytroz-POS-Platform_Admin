import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { AccessControlService } from '../services/access-control.service';

export const permissionGuard: CanActivateFn | CanActivateChildFn = (route) => {
  const accessControl = inject(AccessControlService);
  const router = inject(Router);
  const requiredPermission = route.data['requiredPermission'] as string | undefined;

  return accessControl.hasPermission(requiredPermission) || router.createUrlTree(['/admin/permission-denied']);
};
