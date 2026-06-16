import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { ApiErrorResponse } from '../models/api-response.model';
import { AuthSession } from '../models/auth-session.model';

const accessTokenRefreshWindowMs = 30_000;
const authClockIntervalMs = 15_000;

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionState = signal<AuthSession | null>(null);
  private readonly currentTime = signal(Date.now());
  private readonly loginNoticeState = signal<string | null>(null);

  readonly session = this.sessionState.asReadonly();
  readonly loginNotice = this.loginNoticeState.asReadonly();
  readonly currentUser = computed(() => this.sessionState()?.user ?? null);
  readonly accessToken = computed(() => this.sessionState()?.accessToken ?? null);
  readonly accessTokenExpired = computed(() => {
    const expiresAt = this.sessionState()?.accessTokenExpiresAt;
    return expiresAt ? this.parseExpiry(expiresAt) <= this.currentTime() : true;
  });
  readonly accessTokenExpiresSoon = computed(() => {
    const expiresAt = this.sessionState()?.accessTokenExpiresAt;

    return expiresAt
      ? this.parseExpiry(expiresAt) <= this.currentTime() + accessTokenRefreshWindowMs
      : false;
  });
  readonly sessionExpired = computed(() => {
    const expiresAt = this.sessionState()?.sessionExpiresAt;
    return expiresAt ? this.parseExpiry(expiresAt) <= this.currentTime() : true;
  });
  readonly isUserActive = computed(
    () => this.sessionState()?.user.status.trim().toLowerCase() === 'active',
  );
  readonly isAuthenticated = computed(() => {
    return (
      this.sessionState() !== null &&
      !this.accessTokenExpired() &&
      !this.sessionExpired() &&
      this.isUserActive()
    );
  });

  constructor() {
    const clockTimer = window.setInterval(
      () => this.currentTime.set(Date.now()),
      authClockIntervalMs,
    );
    this.destroyRef.onDestroy(() => window.clearInterval(clockTimer));
  }

  setSession(session: AuthSession): void {
    this.sessionState.set(session);
    this.currentTime.set(Date.now());
    this.loginNoticeState.set(null);
  }

  clearSession(): void {
    this.sessionState.set(null);
    this.loginNoticeState.set(null);
  }

  shouldRefreshAccessToken(): boolean {
    const session = this.sessionState();

    if (!session || this.hasSessionExpired() || !this.isCurrentUserActive()) {
      return false;
    }

    return (
      this.parseExpiry(session.accessTokenExpiresAt) <= Date.now() + accessTokenRefreshWindowMs
    );
  }

  hasSessionExpired(): boolean {
    const expiresAt = this.sessionState()?.sessionExpiresAt;
    return !expiresAt || this.parseExpiry(expiresAt) <= Date.now();
  }

  isCurrentUserActive(): boolean {
    return this.sessionState()?.user.status.trim().toLowerCase() === 'active';
  }

  terminateSession(error?: unknown): void {
    this.sessionState.set(null);
    this.loginNoticeState.set(this.resolveLoginNotice(error));
  }

  private resolveLoginNotice(error?: unknown): string {
    const errorCode = this.getErrorCode(error);

    switch (errorCode) {
      case 'REFRESH_TOKEN_REUSED':
        return 'For your security, this session was revoked because its refresh token was reused. Please sign in again.';
      case 'SESSION_NOT_ACTIVE':
      case 'INVALID_REFRESH_TOKEN':
        return 'Your session has expired or was revoked. Please sign in again.';
      case 'LOGIN_NOT_ALLOWED':
        return 'Your account is inactive or no longer allowed to sign in. Contact an administrator.';
      default:
        return 'Your session could not be restored. Please sign in again.';
    }
  }

  private getErrorCode(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse) || error.error?.success !== false) {
      return null;
    }

    return (error.error as ApiErrorResponse).errorCode ?? null;
  }

  private parseExpiry(value: string): number {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }
}
