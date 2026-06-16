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
});
