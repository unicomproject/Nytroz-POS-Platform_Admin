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

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nytroz Platform Admin');
    expect(fixture.componentInstance.initials()).toBe('NP');
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
});
