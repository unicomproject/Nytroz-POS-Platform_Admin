import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { AccessControlService } from '../services/access-control.service';

function isRoutePermissionGranted(
  accessControl: AccessControlService,
  requiredPermission?: string,
  alternatePermissions?: string[]
): boolean {
  const candidates = [requiredPermission, ...(alternatePermissions ?? [])].filter(Boolean) as string[];

  // Routes without an explicit permission requirement are publicly reachable within auth (e.g. permission-denied).
  if (candidates.length === 0) {
    return true;
  }

  return candidates.some((permission) => accessControl.hasPermission(permission));
}

export const permissionGuard: CanActivateFn | CanActivateChildFn = (route) => {
  const accessControl = inject(AccessControlService);
  const router = inject(Router);
  const requiredPermission = route.data['requiredPermission'] as string | undefined;
  const alternatePermissions = route.data['alternatePermissions'] as string[] | undefined;

  return (
    isRoutePermissionGranted(accessControl, requiredPermission, alternatePermissions) ||
    router.createUrlTree(['/admin/permission-denied'])
  );
};
