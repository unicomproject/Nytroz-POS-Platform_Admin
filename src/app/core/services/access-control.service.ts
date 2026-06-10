import { Injectable } from '@angular/core';

import { AuthSessionService } from './auth-session.service';

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  constructor(private readonly authSession: AuthSessionService) {}

  hasPermission(permission?: string): boolean {
    if (!permission) {
      return true;
    }

    const user = this.authSession.currentUser();

    return !!user && [...user.platformPermissions, ...user.tenantPermissions].includes(permission);
  }

  hasFeature(feature?: string): boolean {
    if (!feature) {
      return true;
    }

    return this.authSession.currentUser()?.featureEntitlements.includes(feature) ?? false;
  }

  canAccess(requiredPermission?: string, requiredFeature?: string): boolean {
    return this.hasPermission(requiredPermission) && this.hasFeature(requiredFeature);
  }
}
