import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthSessionService } from '../services/auth-session.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  function runGuard(isAuthenticated: boolean) {
    const router = { createUrlTree: vi.fn((commands: string[]) => ({ commands })) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSessionService, useValue: { isAuthenticated: vi.fn(() => isAuthenticated) } },
        { provide: Router, useValue: router }
      ]
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    return { result, router };
  }

  it('allows a valid non-expired session', () => {
    const { result } = runGuard(true);

    expect(result).toBe(true);
  });

  it('redirects missing or expired sessions to login', () => {
    const { result, router } = runGuard(false);

    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual({ commands: ['/login'] });
  });
});
