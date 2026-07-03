import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { appSettings } from '../../../core/config/app-settings';
import { apiEndpoints } from '../../../core/config/api-endpoints';
import { PlatformUserApiService } from './platform-user-api.service';

describe('PlatformUserApiService', () => {
  let service: PlatformUserApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlatformUserApiService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(PlatformUserApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('calls GET /platform-admin/users for list', () => {
    service.getUsers().subscribe((response) => {
      expect(response.users.length).toBe(1);
      expect(response.users[0].email).toBe('staff@nytroz.local');
    });

    const request = httpTesting.expectOne(`${appSettings.apiBaseUrl}${apiEndpoints.platform.users}`);
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: {
        users: [
          {
            id: 'user-1',
            email: 'staff@nytroz.local',
            displayName: 'Staff User',
            status: 'ACTIVE',
            roleCodes: ['support_admin'],
            roleNames: ['Support Admin'],
            permissionCount: 12,
            lastLoginAt: null,
            createdAt: '2026-07-01T00:00:00Z',
            updatedAt: '2026-07-01T00:00:00Z'
          }
        ]
      }
    });
  });

  it('calls POST /platform-admin/users for create', () => {
    service
      .createUser({ email: 'new@nytroz.local', status: 'INACTIVE', roleIds: ['role-1'] })
      .subscribe((response) => {
        expect(response.email).toBe('new@nytroz.local');
      });

    const request = httpTesting.expectOne(`${appSettings.apiBaseUrl}${apiEndpoints.platform.users}`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'new@nytroz.local',
      status: 'INACTIVE',
      roleIds: ['role-1']
    });
    request.flush({
      success: true,
      data: {
        id: 'user-2',
        email: 'new@nytroz.local',
        displayName: null,
        status: 'INACTIVE',
        invitePending: true,
        roleCodes: ['support_admin'],
        roleNames: ['Support Admin'],
        permissionCount: 12,
        lastLoginAt: null,
        createdAt: '2026-07-02T00:00:00Z',
        updatedAt: '2026-07-02T00:00:00Z'
      }
    });
  });

  it('calls GET /platform-admin/users/{id} for detail', () => {
    service.getUserById('user-1').subscribe((response) => {
      expect(response.id).toBe('user-1');
      expect(response.invitePending).toBe(false);
    });

    const request = httpTesting.expectOne(`${appSettings.apiBaseUrl}${apiEndpoints.platform.users}/user-1`);
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: {
        id: 'user-1',
        email: 'staff@nytroz.local',
        displayName: 'Staff User',
        status: 'ACTIVE',
        invitePending: false,
        roleCodes: ['support_admin'],
        roleNames: ['Support Admin'],
        permissionCount: 12,
        lastLoginAt: null,
        createdAt: '2026-07-01T00:00:00Z',
        updatedAt: '2026-07-01T00:00:00Z'
      }
    });
  });

  it('calls PUT /platform-admin/users/{id} for status update', () => {
    service.updateUser('user-1', { status: 'LOCKED' }).subscribe((response) => {
      expect(response.status).toBe('LOCKED');
    });

    const request = httpTesting.expectOne(`${appSettings.apiBaseUrl}${apiEndpoints.platform.users}/user-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ status: 'LOCKED' });
    request.flush({
      success: true,
      data: {
        id: 'user-1',
        email: 'staff@nytroz.local',
        displayName: 'Staff User',
        status: 'LOCKED',
        invitePending: false,
        roleCodes: ['support_admin'],
        roleNames: ['Support Admin'],
        permissionCount: 12,
        lastLoginAt: null,
        createdAt: '2026-07-01T00:00:00Z',
        updatedAt: '2026-07-02T00:00:00Z'
      }
    });
  });

  it('calls PUT /platform-admin/users/{id}/roles for role assignment', () => {
    service.assignRoles('user-1', { roleIds: ['role-1', 'role-2'] }).subscribe();

    const request = httpTesting.expectOne(`${appSettings.apiBaseUrl}${apiEndpoints.platform.users}/user-1/roles`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ roleIds: ['role-1', 'role-2'] });
    request.flush({
      success: true,
      data: {
        id: 'user-1',
        email: 'staff@nytroz.local',
        displayName: 'Staff User',
        status: 'ACTIVE',
        invitePending: false,
        roleCodes: ['support_admin'],
        roleNames: ['Support Admin'],
        permissionCount: 12,
        lastLoginAt: null,
        createdAt: '2026-07-01T00:00:00Z',
        updatedAt: '2026-07-02T00:00:00Z'
      }
    });
  });
});
