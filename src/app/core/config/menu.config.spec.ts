import { platformMenuConfig } from './menu.config';

describe('platformMenuConfig', () => {
  const labels = platformMenuConfig.flatMap((section) => section.items.map((item) => item.label));

  it('excludes out-of-scope stub navigation items', () => {
    expect(labels).not.toContain('Outlets');
    expect(labels).not.toContain('Tills & Devices');
    expect(labels).not.toContain('Products');
    expect(labels).not.toContain('Alerts Center');
    expect(labels).not.toContain('Reports');
  });

  it('retains Release 1 platform navigation items', () => {
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Tenants');
    expect(labels).toContain('Return Policy Templates');
    expect(labels).toContain('Billing');
    expect(labels).toContain('Platform Login Audit');
  });
});
