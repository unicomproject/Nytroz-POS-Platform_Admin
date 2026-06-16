import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';

import { AccessControlService } from '../../core/services/access-control.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { Sidebar } from './sidebar';

@Component({ standalone: true, template: '' })
class BlankRouteComponent {}

describe('Sidebar', () => {
  it('renders the dashboard menu route and marks it active on /admin/dashboard', async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([{ path: 'admin/dashboard', component: BlankRouteComponent }]),
        { provide: AccessControlService, useValue: { canAccess: () => true } },
        { provide: TenantContextService, useValue: { selectedTenant: () => null } }
      ]
    }).compileComponents();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/dashboard');

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    const dashboardLink = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')]
      .find((link) => link.textContent?.includes('Dashboard'));

    expect(dashboardLink?.getAttribute('href')).toBe('/admin/dashboard');
    expect(dashboardLink?.classList.contains('active')).toBe(true);
  });
});
