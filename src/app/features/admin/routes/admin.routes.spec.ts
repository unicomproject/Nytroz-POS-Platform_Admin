import { adminRoutes } from './admin.routes';

describe('adminRoutes', () => {
  const pageRoutes = adminRoutes[0]?.children ?? [];
  const paths = pageRoutes.map((route) => route.path).filter(Boolean);

  it('wraps admin pages with canActivateChild permission enforcement', () => {
    expect(adminRoutes).toHaveLength(1);
    expect(adminRoutes[0]?.canActivateChild?.length).toBeGreaterThan(0);
    expect(pageRoutes.length).toBeGreaterThan(0);
  });

  it('does not register platform stub routes', () => {
    expect(paths).not.toContain('outlets');
    expect(paths).not.toContain('tills-devices');
    expect(paths).not.toContain('products');
    expect(paths).not.toContain('alerts');
    expect(paths).not.toContain('reports');
  });

  it('does not register tenant placeholder admin-section routes', () => {
    expect(paths.some((path) => path?.startsWith('tenant/:tenantId/'))).toBe(false);
  });

  it('redirects unknown admin paths to dashboard', () => {
    const wildcard = pageRoutes.find((route) => route.path === '**');
    expect(wildcard?.redirectTo).toBe('dashboard');
  });
});
