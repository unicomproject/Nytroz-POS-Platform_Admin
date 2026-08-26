import { routes } from './app.routes';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

describe('application routes', () => {
  it('exposes payment access before authenticated admin routes', () => {
    const paymentIndex = routes.findIndex((route) => route.path === 'payment/:accessToken');
    const adminIndex = routes.findIndex((route) => route.path === 'admin');
    expect(paymentIndex).toBeGreaterThanOrEqual(0);
    expect(paymentIndex).toBeLessThan(adminIndex);
    expect(routes[paymentIndex]?.canActivate).toBeUndefined();
  });

  it('exposes public /reset-password without auth or admin shell', () => {
    const resetIndex = routes.findIndex((route) => route.path === 'reset-password');
    const adminIndex = routes.findIndex((route) => route.path === 'admin');
    const wildcardIndex = routes.findIndex((route) => route.path === '**');
    const resetRoute = routes[resetIndex];

    expect(resetIndex).toBeGreaterThanOrEqual(0);
    expect(resetIndex).toBeLessThan(wildcardIndex);
    expect(resetRoute?.canActivate).toBeUndefined();
    expect(resetRoute?.canActivate).not.toEqual(expect.arrayContaining([authGuard, guestGuard]));
    expect(resetRoute?.loadComponent).toEqual(expect.any(Function));
    expect(adminIndex).toBeGreaterThan(resetIndex);
  });
});
