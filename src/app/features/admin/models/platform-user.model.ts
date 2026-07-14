export interface PlatformUserSummary {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  roleCodes: string[];
  roleNames: string[];
  permissionCount: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformUserListResponse {
  users: PlatformUserSummary[];
}

export interface PlatformUserDetail extends PlatformUserSummary {
  invitePending: boolean;
}

export interface CreatePlatformUserRequest {
  email: string;
  status: string;
  roleIds: string[];
}

export interface UpdatePlatformUserRequest {
  status: string;
}

export interface AssignPlatformUserRolesRequest {
  roleIds: string[];
}

export type PlatformUserEditorMode = 'create' | 'edit';

export const platformUserStatusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'LOCKED', label: 'Locked' }
] as const;
