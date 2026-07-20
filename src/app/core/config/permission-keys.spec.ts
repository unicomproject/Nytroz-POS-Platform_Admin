import { describe, expect, it } from 'vitest';

import {
  allKnownPlatformBusinessPermissionCodes,
  allPlatformPermissionCodes,
  platformBackendOnlyPermissions,
  platformPermissions
} from './permission-keys';

describe('platform permission keys', () => {
  it('keeps guarded UI surface codes distinct from the full backend catalogue', () => {
    expect(allPlatformPermissionCodes).toHaveLength(31);
    expect(Object.values(platformBackendOnlyPermissions)).toHaveLength(5);
    expect(allKnownPlatformBusinessPermissionCodes).toHaveLength(36);
    expect(new Set(allKnownPlatformBusinessPermissionCodes).size).toBe(36);
  });

  it('does not put return-policy template codes on Angular route/menu guards yet', () => {
    const guarded = new Set<string>(allPlatformPermissionCodes);
    for (const code of Object.values(platformBackendOnlyPermissions)) {
      expect(guarded.has(code)).toBe(false);
    }
  });

  it('exposes stable guarded codes used by existing routes', () => {
    expect(platformPermissions.dashboardView).toBe('platform.dashboard.view');
    expect(platformPermissions.permissionsView).toBe('platform.permissions.view');
    expect(platformPermissions.billingManage).toBe('platform.billing.manage');
  });
});
