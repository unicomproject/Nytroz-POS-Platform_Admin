import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { createAuthSession } from '../../../../testing/test-fixtures';
import { PlatformPermissionCatalogApiService } from '../../services/platform-permission-catalog-api.service';
import { PlatformRoleManagementApiService } from '../../services/platform-role-management-api.service';
import { PlatformPermissionCatalogPage } from './platform-permission-catalog-page';

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

interface RolePermissionsFixture {
  roleId: string;
  roleCode: string;
  roleName: string;
  isSystem: boolean;
  status: string;
  assignedUserCount: number;
  assignedPermissionCodes: string[];
  assignedPermissionIds: string[];
}

describe('PlatformPermissionCatalogPage', () => {
  let catalogApi: { getPermissionCatalog: ReturnType<typeof vi.fn> };
  let roleApi: {
    getRoles: ReturnType<typeof vi.fn>;
    createRole: ReturnType<typeof vi.fn>;
    getRole: ReturnType<typeof vi.fn>;
    updateRole: ReturnType<typeof vi.fn>;
    getRolePermissions: ReturnType<typeof vi.fn>;
    updateRolePermissions: ReturnType<typeof vi.fn>;
  };

  const catalogResponse = {
    modules: [
      {
        id: 'mod-1',
        code: 'platform_admin',
        name: 'Platform Admin',
        description: 'Platform controls',
        scope: 'platform',
        sortOrder: 1,
        isActive: true,
        features: [
          {
            id: 'feat-1',
            code: 'roles',
            name: 'Platform Roles',
            description: 'Role management',
            sortOrder: 1,
            isActive: true,
            permissions: [
              permission('perm-1', 'platform.roles.view', 'View Platform Roles', 'view', 'platform'),
              permission('perm-2', 'platform.roles.update', 'Update Platform Roles', 'update', 'platform'),
              permission('perm-3', 'platform.roles.permissions.update', 'Update Role Permissions', 'update', 'platform')
            ]
          }
        ]
      },
      {
        id: 'mod-2',
        code: 'tenant_admin',
        name: 'Tenant Admin',
        scope: 'tenant',
        sortOrder: 2,
        isActive: true,
        features: [
          {
            id: 'feat-2',
            code: 'tenant_roles',
            name: 'Tenant Roles',
            sortOrder: 1,
            isActive: true,
            permissions: [permission('perm-4', 'roles.permissions.view', 'View Role Permissions', 'view', 'tenant')]
          }
        ]
      }
    ]
  };

  const authSessionProviders = [
    {
      provide: AuthSessionService,
      useValue: { currentUser: () => createAuthSession().user }
    }
  ];

  async function createComponent(): Promise<ComponentFixture<PlatformPermissionCatalogPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformPermissionCatalogPage],
      providers: [
        ...authSessionProviders,
        { provide: PlatformPermissionCatalogApiService, useValue: catalogApi },
        { provide: PlatformRoleManagementApiService, useValue: roleApi },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'API failed safely' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformPermissionCatalogPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    catalogApi = { getPermissionCatalog: vi.fn() };
    roleApi = {
      getRoles: vi.fn(),
      createRole: vi.fn(),
      getRole: vi.fn(),
      updateRole: vi.fn(),
      getRolePermissions: vi.fn(),
      updateRolePermissions: vi.fn()
    };
    catalogApi.getPermissionCatalog.mockReturnValue(of(catalogResponse));
    roleApi.getRoles.mockReturnValue(of({ roles: [roleSummary()] }));
    roleApi.getRole.mockReturnValue(of(roleDetail()));
    roleApi.getRolePermissions.mockReturnValue(of(rolePermissions()));
    roleApi.updateRole.mockReturnValue(of(roleDetail({ name: 'Support Admin Updated' })));
    roleApi.updateRolePermissions.mockReturnValue(of(rolePermissions()));
    roleApi.createRole.mockReturnValue(of(roleDetail({ id: 'role-2', code: 'cashier', name: 'Cashier' })));
  });

  it('shows loading state while catalog and role requests are pending', async () => {
    catalogApi.getPermissionCatalog.mockReturnValue(new Subject().asObservable());
    roleApi.getRoles.mockReturnValue(new Subject().asObservable());

    await TestBed.configureTestingModule({
      imports: [PlatformPermissionCatalogPage],
      providers: [
        ...authSessionProviders,
        { provide: PlatformPermissionCatalogApiService, useValue: catalogApi },
        { provide: PlatformRoleManagementApiService, useValue: roleApi },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'API failed safely' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformPermissionCatalogPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.state-card.loading')).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading roles and permissions');
  });

  it('renders the two-panel role management UI from real API responses', async () => {
    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(catalogApi.getPermissionCatalog).toHaveBeenCalledOnce();
    expect(roleApi.getRoles).toHaveBeenCalledOnce();
    expect(roleApi.getRole).toHaveBeenCalledWith('role-1');
    expect(roleApi.getRolePermissions).toHaveBeenCalledWith('role-1');
    expect(text).toContain('Roles & Permissions');
    expect(text).toContain('Support Admin');
    expect(text).toContain('Edit Role');
    expect(text).toContain('Available Permissions');
    expect(text).toContain('Preview Impact');
    expect(fixture.nativeElement.querySelector('.roles-panel')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.editor-panel')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.summary-panel')).toBeFalsy();
  });

  it('fills the selected role form and checks assigned permissions', async () => {
    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const description = fixture.nativeElement.querySelector('.description-field textarea') as HTMLTextAreaElement;
    const checkboxes = fixture.nativeElement.querySelectorAll('.permission-row input[type="checkbox"]') as NodeListOf<HTMLInputElement>;

    expect(description.value).toBe('Support team role');
    expect(checkboxes[0].checked).toBe(true);
    expect(text).toContain('Granted');
    expect(text).toContain('1');
  });

  it('filters permissions by search, module, scope, action, and granted state', async () => {
    const fixture = await createComponent();

    fixture.componentInstance.permissionSearchTerm.set('tenant roles');
    fixture.detectChanges();
    expect(treeText(fixture)).toContain('roles.permissions.view');
    expect(treeText(fixture)).not.toContain('platform.roles.update');

    fixture.componentInstance.permissionSearchTerm.set('');
    fixture.componentInstance.onModuleChange('platform_admin');
    fixture.detectChanges();
    expect(treeText(fixture)).toContain('platform.roles.view');
    expect(treeText(fixture)).not.toContain('roles.permissions.view');

    fixture.componentInstance.onModuleChange('');
    fixture.componentInstance.onScopeChange('tenant');
    fixture.detectChanges();
    expect(treeText(fixture)).toContain('roles.permissions.view');
    expect(treeText(fixture)).not.toContain('platform.roles.view');

    fixture.componentInstance.onScopeChange('');
    fixture.componentInstance.onActionFilterChange('update');
    fixture.detectChanges();
    expect(treeText(fixture)).toContain('platform.roles.update');
    expect(treeText(fixture)).not.toContain('platform.roles.view');

    fixture.componentInstance.onActionFilterChange('');
    fixture.componentInstance.onGrantFilterChange('granted');
    fixture.detectChanges();
    expect(treeText(fixture)).toContain('platform.roles.view');
    expect(treeText(fixture)).not.toContain('platform.roles.update');
  });

  it('shows dirty banner and preview impact modal with computed impact', async () => {
    const fixture = await createComponent();

    fixture.componentInstance.togglePermission('platform.roles.update', true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("You have changes that haven't been saved.");

    const previewButton = fixture.nativeElement.querySelector('.preview-button') as HTMLButtonElement;
    previewButton.click();
    fixture.detectChanges();

    const modalText = fixture.nativeElement.querySelector('.preview-modal')?.textContent ?? '';
    expect(modalText).toContain('Preview Impact');
    expect(modalText).toContain('1. Role Summary');
    expect(modalText).toContain('2. Change Impact');
    expect(modalText).toContain('Added Permissions');
    expect(modalText).toContain('+1');
    expect(modalText).toContain('3. Sensitive Permissions');
    expect(modalText).toContain('4. Access Preview');
    expect(modalText).toContain('Can Access');
    expect(modalText).toContain('Cannot Access');
  });

  it('applies read only and full access permission modes', async () => {
    const fixture = await createComponent();

    fixture.componentInstance.setPermissionMode('readOnly');
    fixture.detectChanges();
    expect(fixture.componentInstance.hasPermission('platform.roles.view')).toBe(true);
    expect(fixture.componentInstance.hasPermission('roles.permissions.view')).toBe(true);
    expect(fixture.componentInstance.hasPermission('platform.roles.update')).toBe(false);

    fixture.componentInstance.setPermissionMode('fullAccess');
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedPermissionCodes().size).toBe(4);
  });

  it('resets local changes to the loaded snapshot', async () => {
    const fixture = await createComponent();

    fixture.componentInstance.updateForm('name', 'Changed Name');
    fixture.componentInstance.togglePermission('platform.roles.update', true);
    expect(fixture.componentInstance.isDirty()).toBe(true);

    fixture.componentInstance.resetChanges();
    expect(fixture.componentInstance.form().name).toBe('Support Admin');
    expect(fixture.componentInstance.hasPermission('platform.roles.update')).toBe(false);
  });

  it('saves role edits with PUT role and PUT permissions', async () => {
    const fixture = await createComponent();

    fixture.componentInstance.updateForm('name', 'Support Admin Updated');
    fixture.componentInstance.togglePermission('platform.roles.update', true);
    fixture.componentInstance.saveRole();

    expect(roleApi.updateRole).toHaveBeenCalledWith('role-1', {
      name: 'Support Admin Updated',
      description: 'Support team role',
      status: 'Active'
    });
    expect(roleApi.updateRolePermissions).toHaveBeenCalledWith('role-1', {
      permissionCodes: ['platform.roles.update', 'platform.roles.view']
    });
  });

  it('creates a role with POST then PUT permissions', async () => {
    const fixture = await createComponent();

    fixture.componentInstance.startCreate();
    fixture.componentInstance.updateForm('name', 'Cashier');
    fixture.componentInstance.togglePermission('platform.roles.view', true);
    fixture.componentInstance.saveRole();

    expect(roleApi.createRole).toHaveBeenCalledWith({
      code: 'cashier',
      name: 'Cashier',
      description: '',
      status: 'Active'
    });
    expect(roleApi.updateRolePermissions).toHaveBeenCalledWith('role-2', {
      permissionCodes: ['platform.roles.view']
    });
  });

  it('shows an API error state when the page request fails', async () => {
    catalogApi.getPermissionCatalog.mockReturnValue(throwError(() => new Error('network')));

    const fixture = await createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('API failed safely');
  });
});

function treeText(fixture: ComponentFixture<PlatformPermissionCatalogPage>): string {
  return fixture.nativeElement.querySelector('.catalog-tree')?.textContent ?? '';
}

function permission(id: string, code: string, name: string, action: string, scope: string) {
  return {
    id,
    code,
    name,
    description: `${name} description`,
    action,
    scope,
    sortOrder: 1,
    isActive: true,
    source: scope
  };
}

function roleSummary(overrides: Partial<RoleFixture> = {}): RoleFixture {
  return {
    id: 'role-1',
    code: 'support_admin',
    name: 'Support Admin',
    description: 'Support team role',
    isSystem: false,
    status: 'Active',
    assignedUserCount: 3,
    permissionCount: 1,
    createdAt: '2026-06-23T00:00:00Z',
    updatedAt: '2026-06-23T00:00:00Z',
    ...overrides
  };
}

function roleDetail(overrides: Partial<ReturnType<typeof roleSummary>> = {}) {
  return roleSummary(overrides);
}

function rolePermissions(overrides: Partial<RolePermissionsFixture> = {}): RolePermissionsFixture {
  return {
    roleId: 'role-1',
    roleCode: 'support_admin',
    roleName: 'Support Admin',
    isSystem: false,
    status: 'Active',
    assignedUserCount: 3,
    assignedPermissionCodes: ['platform.roles.view'],
    assignedPermissionIds: ['perm-1'],
    ...overrides
  };
}
