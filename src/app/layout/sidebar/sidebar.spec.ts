import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';

import { AuthSessionService } from '../../core/services/auth-session.service';
import { createAuthSession } from '../../testing/test-fixtures';
import { Sidebar } from './sidebar';

@Component({ standalone: true, template: '' })
class BlankRouteComponent {}

describe('Sidebar', () => {
  it('renders the dashboard menu route and marks it active on /admin/dashboard', async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([{ path: 'admin/dashboard', component: BlankRouteComponent }]),
        {
          provide: AuthSessionService,
          useValue: { currentUser: () => createAuthSession().user }
        }
      ]
    }).compileComponents();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/dashboard');

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    const dashboardLink = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a.menu-item')]
      .find((link) => link.textContent?.includes('Dashboard'));

    expect(dashboardLink?.getAttribute('href')).toBe('/admin/dashboard');
    expect(dashboardLink?.classList.contains('active')).toBe(true);
  });

  it('renders the tenants menu route and marks it active on /admin/tenants', async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([{ path: 'admin/tenants', component: BlankRouteComponent }]),
        {
          provide: AuthSessionService,
          useValue: { currentUser: () => createAuthSession().user }
        }
      ]
    }).compileComponents();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/tenants');

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    const tenantsLink = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a.menu-item')]
      .find((link) => link.textContent?.includes('Tenants'));

    expect(tenantsLink?.getAttribute('href')).toBe('/admin/tenants');
    expect(tenantsLink?.classList.contains('active')).toBe(true);
  });

  it('marks Subscriptions active on /admin/subscriptions/create', async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([{ path: 'admin/subscriptions/create', component: BlankRouteComponent }]),
        {
          provide: AuthSessionService,
          useValue: { currentUser: () => createAuthSession().user }
        }
      ]
    }).compileComponents();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/subscriptions/create');

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    const subscriptionsLink = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a.menu-item')]
      .find((link) => link.textContent?.includes('Subscriptions'));

    expect(subscriptionsLink?.getAttribute('href')).toBe('/admin/subscriptions');
    expect(subscriptionsLink?.classList.contains('active')).toBe(true);
  });

  it('renders only released platform sidebar menu items', async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        {
          provide: AuthSessionService,
          useValue: { currentUser: () => createAuthSession().user }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();

    const menuItems = (fixture.nativeElement as HTMLElement).querySelectorAll('a.menu-item');
    expect(menuItems.length).toBe(9);

    const modulesLink = [...menuItems].find((link) => link.textContent?.includes('Modules & Features'));
    expect(modulesLink?.getAttribute('href')).toBe('/admin/modules');

    const billingLink = [...menuItems].find((link) => link.textContent?.includes('Billing'));
    expect(billingLink?.getAttribute('href')).toBe('/admin/billing');
    const alertsLink = [...menuItems].find((link) => link.textContent?.includes('Alerts Center'));
    expect(alertsLink).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.alert-badge')).toBeNull();
  });

  it('hides menu items when the user lacks required permissions', async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        {
          provide: AuthSessionService,
          useValue: {
            currentUser: () =>
              createAuthSession({
                user: {
                  ...createAuthSession().user,
                  platformPermissions: ['platform.dashboard.view']
                }
              }).user
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();

    const labels = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.menu-label')].map(
      (node) => node.textContent?.trim()
    );

    expect(labels).toContain('Dashboard');
    expect(labels).not.toContain('Tenants');
    expect(labels).not.toContain('Audit Logs');
  });

  it('does not render a sidebar collapse button', async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        {
          provide: AuthSessionService,
          useValue: { currentUser: () => createAuthSession().user }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).not.toContain('Collapse');
    expect(root.querySelector('.collapse-btn, [aria-label="Collapse sidebar"]')).toBeNull();
    expect(root.textContent).toContain('SCS TIX Platform');
    expect(root.textContent).toContain('Version 2.4.0');
  });
});
