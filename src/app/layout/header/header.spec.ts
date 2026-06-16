import { TestBed } from '@angular/core/testing';

import { AuthSessionService } from '../../core/services/auth-session.service';
import { createAuthSession } from '../../testing/test-fixtures';
import { Header } from './header';

describe('Header', () => {
  it('shows the current user display name from auth session data', async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        { provide: AuthSessionService, useValue: { currentUser: () => createAuthSession().user } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nytroz Platform Admin');
    expect(fixture.componentInstance.initials()).toBe('NP');
  });
});
