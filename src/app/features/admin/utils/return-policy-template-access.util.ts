import { platformPermissions } from '../../../core/config/permission-keys';
import { AccessControlService } from '../../../core/services/access-control.service';

export function canViewReturnPolicyTemplates(accessControl: AccessControlService): boolean {
  return (
    accessControl.hasPermission(platformPermissions.returnPolicyTemplatesView) ||
    accessControl.hasPermission(platformPermissions.returnPolicyTemplatesManage)
  );
}

export function canCreateReturnPolicyTemplates(accessControl: AccessControlService): boolean {
  return (
    accessControl.hasPermission(platformPermissions.returnPolicyTemplatesCreate) ||
    accessControl.hasPermission(platformPermissions.returnPolicyTemplatesManage)
  );
}

export function canUpdateReturnPolicyTemplates(accessControl: AccessControlService): boolean {
  return (
    accessControl.hasPermission(platformPermissions.returnPolicyTemplatesUpdate) ||
    accessControl.hasPermission(platformPermissions.returnPolicyTemplatesManage)
  );
}

export function canDeleteReturnPolicyTemplates(accessControl: AccessControlService): boolean {
  return (
    accessControl.hasPermission(platformPermissions.returnPolicyTemplatesDelete) ||
    accessControl.hasPermission(platformPermissions.returnPolicyTemplatesManage)
  );
}
