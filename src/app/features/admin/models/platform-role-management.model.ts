export interface PlatformRoleListResponse {
  roles: PlatformRoleSummary[];
}

export interface PlatformRoleSummary {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  status: string;
  assignedUserCount: number;
  permissionCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type PlatformRoleDetail = PlatformRoleSummary;

export interface CreatePlatformRoleRequest {
  code: string;
  name: string;
  description?: string | null;
  status: string;
}

export interface UpdatePlatformRoleRequest {
  name: string;
  description?: string | null;
  status: string;
}

export interface PlatformRolePermissionsResponse {
  roleId: string;
  roleCode: string;
  roleName: string;
  isSystem: boolean;
  status: string;
  assignedUserCount: number;
  assignedPermissionCodes: string[];
  assignedPermissionIds: string[];
}

export interface UpdatePlatformRolePermissionsRequest {
  permissionCodes: string[];
}
