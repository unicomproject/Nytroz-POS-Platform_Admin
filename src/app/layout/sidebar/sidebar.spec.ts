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

  it('renders all 13 platform sidebar menu items', async () => {
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

    const menuItems = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a.menu-item')];
    expect(menuItems).toHaveLength(13);
  });

  it('renders Alerts Center without a numeric badge', async () => {
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

    const alertsLink = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a.menu-item')]
      .find((link) => link.textContent?.includes('Alerts Center'));

    expect(alertsLink).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.alert-badge')).toBeNull();
    expect(alertsLink?.textContent).not.toMatch(/\b12\b/);
  });
});
