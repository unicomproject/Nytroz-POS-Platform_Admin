import {
  AssignPlatformUserRolesRequest,
  CreatePlatformUserRequest,
  PlatformUserDetail,
  PlatformUserListResponse,
  PlatformUserSummary,
  UpdatePlatformUserRequest
} from '../models/platform-user.model';

export interface PlatformUserListItemApiDto {
  id: string;
  email: string;
  displayName?: string | null;
  status: string;
  roleCodes: string[];
  roleNames: string[];
  permissionCount: number;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformUserListResponseApiDto {
  users: PlatformUserListItemApiDto[];
}

export interface PlatformUserDetailApiDto extends PlatformUserListItemApiDto {
  invitePending: boolean;
}

export function mapPlatformUserListResponse(
  dto: PlatformUserListResponseApiDto | null | undefined
): PlatformUserListResponse {
  return {
    users: (dto?.users ?? []).map(mapPlatformUserSummary)
  };
}

export function mapPlatformUserSummary(dto: PlatformUserListItemApiDto): PlatformUserSummary {
  return {
    id: String(dto.id),
    email: dto.email,
    displayName: dto.displayName ?? null,
    status: dto.status,
    roleCodes: dto.roleCodes ?? [],
    roleNames: dto.roleNames ?? [],
    permissionCount: dto.permissionCount,
    lastLoginAt: dto.lastLoginAt ?? null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt
  };
}

export function mapPlatformUserDetail(dto: PlatformUserDetailApiDto): PlatformUserDetail {
  return {
    ...mapPlatformUserSummary(dto),
    invitePending: dto.invitePending
  };
}

export function mapCreatePlatformUserRequest(request: CreatePlatformUserRequest): Record<string, unknown> {
  return {
    email: request.email.trim(),
    status: request.status,
    roleIds: request.roleIds
  };
}

export function mapUpdatePlatformUserRequest(request: UpdatePlatformUserRequest): Record<string, unknown> {
  return {
    status: request.status
  };
}

export function mapAssignPlatformUserRolesRequest(request: AssignPlatformUserRolesRequest): Record<string, unknown> {
  return {
    roleIds: request.roleIds
  };
}
