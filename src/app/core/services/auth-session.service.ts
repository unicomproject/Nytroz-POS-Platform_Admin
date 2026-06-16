import { Injectable, computed, signal } from '@angular/core';

import { AuthSession } from '../models/auth-session.model';

const authSessionStorageKey = 'scs_tix.platform_admin.auth_session';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly sessionState = signal<AuthSession | null>(this.readSession());

  readonly session = this.sessionState.asReadonly();
  readonly currentUser = computed(() => this.sessionState()?.user ?? null);
  readonly accessToken = computed(() => this.sessionState()?.accessToken ?? null);
  readonly isAuthenticated = computed(() => {
    const session = this.sessionState();

    if (!session?.accessToken?.trim()) {
      return false;
    }

    return new Date(session.accessTokenExpiresAt).getTime() > Date.now();
  });

  setSession(session: AuthSession): void {
    this.sessionState.set(session);
    localStorage.setItem(authSessionStorageKey, JSON.stringify(session));
  }

  clearSession(): void {
    this.sessionState.set(null);
    localStorage.removeItem(authSessionStorageKey);
  }

  private readSession(): AuthSession | null {
    const rawSession = localStorage.getItem(authSessionStorageKey);

    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as AuthSession;
    } catch {
      localStorage.removeItem(authSessionStorageKey);
      return null;
    }
  }
}
