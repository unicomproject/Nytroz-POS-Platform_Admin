import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AccessControlService } from '../services/access-control.service';
import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  function runGuard(canAccess: boolean, requiredPermission = 'platform.audit.view') {
    const router = { createUrlTree: vi.fn((commands: string[]) => ({ commands })) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AccessControlService, useValue: { hasPermission: vi.fn(() => canAccess) } },
        { provide: Router, useValue: router }
      ]
    });

    const route = { data: { requiredPermission } };
    const result = TestBed.runInInjectionContext(() => permissionGuard(route as never, {} as never));
    return { result, router };
  }

  it('allows access when the permission check passes', () => {
    const { result } = runGuard(true);

    expect(result).toBe(true);
  });

  it('fails closed to permission denied when the permission check fails', () => {
    const { result, router } = runGuard(false);

    expect(router.createUrlTree).toHaveBeenCalledWith(['/admin/permission-denied']);
    expect(result).toEqual({ commands: ['/admin/permission-denied'] });
  });

  it('allows access when an alternate permission is granted', () => {
    const router = { createUrlTree: vi.fn((commands: string[]) => ({ commands })) };
    const hasPermission = vi.fn((permission: string) => permission === 'platform.return_policy_templates.manage');

    TestBed.configureTestingModule({
      providers: [
        { provide: AccessControlService, useValue: { hasPermission } },
        { provide: Router, useValue: router }
      ]
    });

    const route = {
      data: {
        requiredPermission: 'platform.return_policy_templates.view',
        alternatePermissions: ['platform.return_policy_templates.manage']
      }
    };
    const result = TestBed.runInInjectionContext(() => permissionGuard(route as never, {} as never));

    expect(result).toBe(true);
  });

  it('allows routes that do not declare a required permission', () => {
    const router = { createUrlTree: vi.fn((commands: string[]) => ({ commands })) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AccessControlService, useValue: { hasPermission: vi.fn(() => false) } },
        { provide: Router, useValue: router }
      ]
    });

    const route = { data: {} };
    const result = TestBed.runInInjectionContext(() => permissionGuard(route as never, {} as never));

    expect(result).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });
});
