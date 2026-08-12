import { describe, expect, it } from 'vitest';

import { allPlatformPermissionCodes, platformPermissions } from './permission-keys';

describe('platform permission keys', () => {
  it('includes return-policy template codes in the guarded catalogue', () => {
    expect(allPlatformPermissionCodes).toHaveLength(45);
    expect(new Set(allPlatformPermissionCodes).size).toBe(45);
    expect(allPlatformPermissionCodes).toContain(platformPermissions.returnPolicyTemplatesView);
    expect(allPlatformPermissionCodes).toContain(platformPermissions.returnPolicyTemplatesManage);
    expect(allPlatformPermissionCodes).toContain(platformPermissions.tenantsBootstrapAccess);
    expect(allPlatformPermissionCodes).toContain(platformPermissions.tenantsBootstrapOnlineStoreManage);
  });

  it('exposes stable guarded codes used by existing routes', () => {
    expect(platformPermissions.dashboardView).toBe('platform.dashboard.view');
    expect(platformPermissions.permissionsView).toBe('platform.permissions.view');
    expect(platformPermissions.billingManage).toBe('platform.billing.manage');
    expect(platformPermissions.returnPolicyTemplatesCreate).toBe('platform.return_policy_templates.create');
  });
});
