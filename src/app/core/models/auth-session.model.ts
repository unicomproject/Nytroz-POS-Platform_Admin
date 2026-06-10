import { CurrentUser } from './current-user.model';

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  user: CurrentUser;
}
