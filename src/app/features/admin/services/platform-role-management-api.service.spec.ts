import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PlatformRoleManagementApiService } from './platform-role-management-api.service';

interface RoleFixture {
  id: string;
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  status: string;
  assignedUserCount: number;
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
}

describe('PlatformRoleManagementApiService', () => {
  let service: PlatformRoleManagementApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PlatformRoleManagementApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('calls GET /api/v1/platform-admin/roles', () => {
    service.getRoles().subscribe((response) => {
      expect(response.roles.length).toBe(1);
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/roles');
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'ok', data: { roles: [role()] } });
  });

  it('calls POST /api/v1/platform-admin/roles', () => {
    service.createRole({ code: 'support_admin', name: 'Support Admin', description: '', status: 'Active' }).subscribe();

    const request = httpTesting.expectOne('/api/v1/platform-admin/roles');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.code).toBe('support_admin');
    request.flush({ success: true, message: 'ok', data: role({ code: 'support_admin', name: 'Support Admin' }) });
  });

  it('calls GET /api/v1/platform-admin/roles/{roleId}', () => {
    service.getRole('role-1').subscribe((response) => {
      expect(response.id).toBe('role-1');
    });

    const request = httpTesting.expectOne('/api/v1/platform-admin/roles/role-1');
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'ok', data: role() });
  });

  it('calls PUT /api/v1/platform-admin/roles/{roleId}', () => {
    service.updateRole('role-1', { name: 'Updated', description: 'Changed', status: 'Active' }).subscribe();

    const request = httpTesting.expectOne('/api/v1/platform-admin/roles/role-1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.name).toBe('Updated');
    request.flush({ success: true, message: 'ok', data: role({ name: 'Updated' }) });
  });

  it('calls GET and PUT role permission endpoints', () => {
    service.getRolePermissions('role-1').subscribe();
    service.updateRolePermissions('role-1', { permissionCodes: ['platform.roles.view'] }).subscribe();

    const getRequest = httpTesting.expectOne((request) =>
      request.url === '/api/v1/platform-admin/roles/role-1/permissions' && request.method === 'GET'
    );
    expect(getRequest.request.method).toBe('GET');
    getRequest.flush({
      success: true,
      message: 'ok',
      data: {
        roleId: 'role-1',
        roleCode: 'support_admin',
        roleName: 'Support Admin',
        isSystem: false,
        status: 'Active',
        assignedUserCount: 0,
        assignedPermissionCodes: [],
        assignedPermissionIds: []
      }
    });

    const putRequest = httpTesting.expectOne((request) =>
      request.url === '/api/v1/platform-admin/roles/role-1/permissions' && request.method === 'PUT'
    );
    expect(putRequest.request.method).toBe('PUT');
    expect(putRequest.request.body.permissionCodes).toEqual(['platform.roles.view']);
    putRequest.flush({
      success: true,
      message: 'ok',
      data: {
        roleId: 'role-1',
        roleCode: 'support_admin',
        roleName: 'Support Admin',
        isSystem: false,
        status: 'Active',
        assignedUserCount: 0,
        assignedPermissionCodes: ['platform.roles.view'],
        assignedPermissionIds: []
      }
    });
  });
});

function role(overrides: Partial<RoleFixture> = {}): RoleFixture {
  return {
    id: 'role-1',
    code: 'support_admin',
    name: 'Support Admin',
    description: 'Support team role',
    isSystem: false,
    status: 'Active',
    assignedUserCount: 0,
    permissionCount: 1,
    createdAt: '2026-06-23T00:00:00Z',
    updatedAt: '2026-06-23T00:00:00Z',
    ...overrides
  };
}
