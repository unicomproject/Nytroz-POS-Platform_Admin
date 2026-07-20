import { adminRoutes } from './admin.routes';

describe('adminRoutes', () => {
  const paths = adminRoutes.map((route) => route.path).filter(Boolean);

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
    const wildcard = adminRoutes.find((route) => route.path === '**');
    expect(wildcard?.redirectTo).toBe('dashboard');
  });
});
