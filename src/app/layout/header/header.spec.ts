import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';

import { AuthSessionService } from '../../core/services/auth-session.service';
import { createAuthSession } from '../../testing/test-fixtures';
import { Header } from './header';

@Component({ standalone: true, template: '' })
class BlankRouteComponent {}

describe('Header', () => {
  it('shows the current user display name from auth session data', async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: { currentUser: () => createAuthSession().user } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('OneVerz Platform Admin');
    expect(fixture.componentInstance.initials()).toBe('OP');
  });

  it('shows the global tenant search bar on /admin/tenants', async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([{ path: 'admin/tenants', component: BlankRouteComponent }]),
        { provide: AuthSessionService, useValue: { currentUser: () => createAuthSession().user } }
      ]
    }).compileComponents();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/tenants');

    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    await fixture.whenStable();

    const searchInput = (fixture.nativeElement as HTMLElement).querySelector('.global-search input');
    expect(searchInput).toBeTruthy();
    expect(searchInput?.getAttribute('placeholder')).toBe('Search tenants, owners, email...');
  });

  it('shows breadcrumb and system status on /admin/subscriptions/create without hamburger menu', async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([{ path: 'admin/subscriptions/create', component: BlankRouteComponent }]),
        { provide: AuthSessionService, useValue: { currentUser: () => createAuthSession().user } }
      ]
    }).compileComponents();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/subscriptions/create');

    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const breadcrumb = root.querySelector('.header-breadcrumb');

    expect(breadcrumb?.textContent).toContain('Subscriptions');
    expect(breadcrumb?.textContent).toContain('Create Plan');
    expect(root.textContent).toContain('All Systems Operational');
    expect(root.querySelector('.menu-toggle, .hamburger, [aria-label="Open menu"]')).toBeNull();
    expect(root.querySelector('.help')).toBeNull();
    expect(root.querySelector('.settings')).toBeNull();
  });
});
