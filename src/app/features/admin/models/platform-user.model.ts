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
