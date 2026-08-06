import { routes } from './app.routes';

describe('application routes', () => {
  it('exposes payment access before authenticated admin routes', () => {
    const paymentIndex = routes.findIndex((route) => route.path === 'payment/:accessToken');
    const adminIndex = routes.findIndex((route) => route.path === 'admin');
    expect(paymentIndex).toBeGreaterThanOrEqual(0);
    expect(paymentIndex).toBeLessThan(adminIndex);
    expect(routes[paymentIndex]?.canActivate).toBeUndefined();
  });
});
