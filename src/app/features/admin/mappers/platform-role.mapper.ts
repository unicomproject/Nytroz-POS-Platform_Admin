import {
  CreatePlatformRoleRequest,
  PlatformRoleDetail,
  PlatformRoleListResponse,
  PlatformRolePermissionsResponse,
  PlatformRoleSummary,
  UpdatePlatformRoleRequest
} from '../models/platform-role-management.model';

export interface PlatformRoleListItemApiDto {
  id: string;
  roleCode: string;
  name: string;
  description?: string | null;
  status: string;
  permissionCount: number;
  userCount: number;
  isSystem: boolean;
  isProtected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformRoleListResponseApiDto {
  roles: PlatformRoleListItemApiDto[];
}

export interface PlatformRolePermissionsResponseApiDto {
  roleId: string;
  roleCode: string;
  roleName: string;
  assignedPermissionCodes: string[];
  availablePermissions?: PlatformPermissionApiDto[];
  updatedAt: string;
}

export interface PlatformPermissionApiDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: string;
  isSystem: boolean;
  isBootstrap: boolean;
}

export function mapPlatformRoleListResponse(
  dto: PlatformRoleListResponseApiDto | null | undefined
): PlatformRoleListResponse {
  return {
    roles: (dto?.roles ?? []).map(mapPlatformRoleSummary)
  };
}

export function mapPlatformRoleSummary(dto: PlatformRoleListItemApiDto): PlatformRoleSummary {
  return {
    id: String(dto.id),
    code: dto.roleCode,
    name: dto.name,
    description: dto.description ?? null,
    isSystem: dto.isSystem,
    status: dto.status,
    assignedUserCount: dto.userCount,
    permissionCount: dto.permissionCount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt
  };
}

export function mapPlatformRoleDetail(dto: PlatformRoleListItemApiDto): PlatformRoleDetail {
  return mapPlatformRoleSummary(dto);
}

export function mapPlatformRolePermissionsResponse(
  dto: PlatformRolePermissionsResponseApiDto | null | undefined
): PlatformRolePermissionsResponse {
  const data = dto ?? {
    roleId: '',
    roleCode: '',
    roleName: '',
    assignedPermissionCodes: [],
    updatedAt: new Date().toISOString()
  };

  const assignedPermissionCodes = data.assignedPermissionCodes ?? [];
  const assignedPermissionIds = (data.availablePermissions ?? [])
    .filter((permission) => assignedPermissionCodes.includes(permission.code))
    .map((permission) => String(permission.id));

  return {
    roleId: String(data.roleId),
    roleCode: data.roleCode,
    roleName: data.roleName,
    isSystem: false,
    status: 'active',
    assignedUserCount: 0,
    assignedPermissionCodes,
    assignedPermissionIds
  };
}

export function mapCreatePlatformRoleRequest(request: CreatePlatformRoleRequest): Record<string, unknown> {
  return {
    code: request.code,
    name: request.name,
    description: request.description ?? null,
    status: request.status
  };
}

export function mapUpdatePlatformRoleRequest(request: UpdatePlatformRoleRequest): Record<string, unknown> {
  return {
    name: request.name,
    description: request.description ?? null,
    status: request.status
  };
}
