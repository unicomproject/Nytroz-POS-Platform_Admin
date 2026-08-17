import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  createPlatformRoleListResponse,
  createPlatformUserDetail,
  createPlatformUserListResponse
} from '../../../../testing/test-fixtures';
import { PlatformRoleManagementApiService } from '../../services/platform-role-management-api.service';
import { PlatformUserApiService } from '../../services/platform-user-api.service';
import { PlatformUsersPage } from './platform-users-page';

describe('PlatformUsersPage', () => {
  let userApi: {
    getUsers: ReturnType<typeof vi.fn>;
    getUserById: ReturnType<typeof vi.fn>;
    createUser: ReturnType<typeof vi.fn>;
    updateUser: ReturnType<typeof vi.fn>;
    assignRoles: ReturnType<typeof vi.fn>;
    initiatePasswordReset: ReturnType<typeof vi.fn>;
  };
  let roleApi: { getRoles: ReturnType<typeof vi.fn> };

  async function createComponent(): Promise<ComponentFixture<PlatformUsersPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformUsersPage],
      providers: [
        { provide: PlatformUserApiService, useValue: userApi },
        { provide: PlatformRoleManagementApiService, useValue: roleApi },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Users failed safely' } },
        {
          provide: AccessControlService,
          useValue: {
            hasPermission: () => true
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformUsersPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    userApi = {
      getUsers: vi.fn(),
      getUserById: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      assignRoles: vi.fn(),
      initiatePasswordReset: vi.fn()
    };
    roleApi = { getRoles: vi.fn() };
  });

  it('shows loading state while users are loading', async () => {
    userApi.getUsers.mockReturnValue(new Subject().asObservable());
    roleApi.getRoles.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading platform users');
  });

  it('renders users returned by the backend', async () => {
    userApi.getUsers.mockReturnValue(of(createPlatformUserListResponse()));
    roleApi.getRoles.mockReturnValue(of(createPlatformRoleListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Platform Users');
    expect(text).toContain('staff@nytroz.local');
    expect(text).toContain('Support Admin');
  });

  it('shows empty state when no users are returned', async () => {
    userApi.getUsers.mockReturnValue(of({ users: [] }));
    roleApi.getRoles.mockReturnValue(of(createPlatformRoleListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No platform users found');
  });

  it('shows error state with retry when API fails', async () => {
    userApi.getUsers.mockReturnValue(throwError(() => new Error('network')));
    roleApi.getRoles.mockReturnValue(of(createPlatformRoleListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Platform users could not be loaded');
    expect(text).toContain('Try again');
  });

  it('loads role options from backend when opening create editor', async () => {
    userApi.getUsers.mockReturnValue(of(createPlatformUserListResponse()));
    roleApi.getRoles.mockReturnValue(of(createPlatformRoleListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openCreate();
    fixture.componentInstance.dropdownOpen.set(true);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Add Platform User');
    expect(text).toContain('Support Admin');
    expect(text).toContain('support_admin');
  });

  it('creates a platform user through the backend API', async () => {
    userApi.getUsers.mockReturnValue(of(createPlatformUserListResponse()));
    roleApi.getRoles.mockReturnValue(of(createPlatformRoleListResponse()));
    userApi.createUser.mockReturnValue(
      of(
        createPlatformUserDetail({
          id: 'user-2',
          displayName: 'New User',
          email: 'new@nytroz.local',
          invitePending: true
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openCreate();
    fixture.componentInstance.createForm.setValue({ fullName: 'New User', email: 'new@nytroz.local', phone: '1234567890' });
    fixture.componentInstance.toggleRole('role-1', true);
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(userApi.createUser).toHaveBeenCalledWith({
      fullName: 'New User',
      email: 'new@nytroz.local',
      phone: '1234567890',
      roleIds: ['role-1']
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Platform user New User created.');
  });

  it('loads user detail and saves status on edit', async () => {
    userApi.getUsers.mockReturnValue(of(createPlatformUserListResponse()));
    roleApi.getRoles.mockReturnValue(of(createPlatformRoleListResponse()));
    userApi.getUserById.mockReturnValue(of(createPlatformUserDetail({ status: 'ACTIVE' })));
    userApi.updateUser.mockReturnValue(of(createPlatformUserDetail({ status: 'LOCKED' })));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openEdit(createPlatformUserListResponse().users[0]!);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(userApi.getUserById).toHaveBeenCalledWith('user-1');

    fixture.componentInstance.editStatus.set('LOCKED');
    fixture.componentInstance.saveStatus('user-1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(userApi.updateUser).toHaveBeenCalledWith('user-1', { status: 'LOCKED' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Platform user status updated.');
  });

  it('assigns roles through the backend API on edit', async () => {
    userApi.getUsers.mockReturnValue(of(createPlatformUserListResponse()));
    roleApi.getRoles.mockReturnValue(
      of(
        createPlatformRoleListResponse({
          roles: [
            createPlatformRoleListResponse().roles[0]!,
            {
              id: 'role-2',
              code: 'billing_admin',
              name: 'Billing Admin',
              description: null,
              isSystem: false,
              status: 'Active',
              assignedUserCount: 0,
              permissionCount: 8,
              createdAt: '2026-07-01T00:00:00Z',
              updatedAt: '2026-07-01T00:00:00Z'
            }
          ]
        })
      )
    );
    userApi.getUserById.mockReturnValue(of(createPlatformUserDetail()));
    userApi.assignRoles.mockReturnValue(
      of(
        createPlatformUserDetail({
          roleCodes: ['support_admin', 'billing_admin'],
          roleNames: ['Support Admin', 'Billing Admin']
        })
      )
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openEdit(createPlatformUserListResponse().users[0]!);
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.toggleRole('role-2', true);
    fixture.componentInstance.saveRoles('user-1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(userApi.assignRoles).toHaveBeenCalledWith('user-1', { roleIds: ['role-1', 'role-2'] });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Platform user roles updated.');
  });

  it('initiates password reset through the backend API after confirmation', async () => {
    userApi.getUsers.mockReturnValue(of(createPlatformUserListResponse()));
    roleApi.getRoles.mockReturnValue(of(createPlatformRoleListResponse()));
    userApi.getUserById.mockReturnValue(of(createPlatformUserDetail({ status: 'ACTIVE', invitePending: false })));
    userApi.initiatePasswordReset.mockReturnValue(
      of({
        userId: 'user-1',
        email: 'staff@nytroz.local',
        expiresAt: '2026-08-14T12:00:00Z',
        deliveryMode: 'email',
        resetUrl: null,
        message: 'A password reset email has been sent to the user.'
      })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openEdit(createPlatformUserListResponse().users[0]!);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Send Password Reset');

    fixture.componentInstance.openResetConfirm();
    fixture.componentInstance.confirmPasswordReset();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(userApi.initiatePasswordReset).toHaveBeenCalledWith('user-1');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'A password reset email has been sent to the user.'
    );
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Copy Link');
  });

  it('shows the secure link only when the backend returns admin_secure_link', async () => {
    userApi.getUsers.mockReturnValue(of(createPlatformUserListResponse()));
    roleApi.getRoles.mockReturnValue(of(createPlatformRoleListResponse()));
    userApi.getUserById.mockReturnValue(of(createPlatformUserDetail({ status: 'ACTIVE' })));
    userApi.initiatePasswordReset.mockReturnValue(
      of({
        userId: 'user-1',
        email: 'staff@nytroz.local',
        expiresAt: '2026-08-14T12:00:00Z',
        deliveryMode: 'admin_secure_link',
        resetUrl: 'http://localhost:4200/reset-password?token=one-time-reset-token-fixture',
        message: 'Copy this secure link and share it with the user through your approved channel.'
      })
    );

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openEdit(createPlatformUserListResponse().users[0]!);
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.componentInstance.confirmPasswordReset();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Copy Link');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Open Link');
  });

  it('renders R1 main-content create form on Add Platform User CTA click and excludes legacy drawer fields', async () => {
    userApi.getUsers.mockReturnValue(of(createPlatformUserListResponse()));
    roleApi.getRoles.mockReturnValue(of(createPlatformRoleListResponse()));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    // Click the Add Platform User button
    const addButton = (fixture.nativeElement as HTMLElement).querySelector('header.page-heading button') as HTMLButtonElement;
    addButton.click();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const textContent = element.textContent ?? '';

    // R1 Form fields must be present
    expect(element.querySelector('#fullName')).toBeTruthy();
    expect(element.querySelector('#email')).toBeTruthy();
    expect(element.querySelector('#phone')).toBeTruthy();
    expect(textContent).toContain('Platform Role(s) *');
    expect(textContent).toContain('An invitation email will be sent');
    expect(textContent).toContain('Save & Send Invite');
    expect(textContent).toContain('Cancel');

    // Legacy drawer & fields must be absent from create
    expect(element.querySelector('select[formControlName="status"]')).toBeFalsy();
    expect(element.querySelector('input[type="password"]')).toBeFalsy();
    expect(textContent).not.toContain('Confirm Password');
    
    const editorPanelHeader = element.querySelector('.editor-panel h2');
    if (editorPanelHeader) {
      expect(editorPanelHeader.textContent).not.toContain('Add Platform User');
    }
  });
});
