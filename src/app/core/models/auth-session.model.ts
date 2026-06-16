import { CurrentUser } from './current-user.model';

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  accessTokenExpiresAt: string;
  sessionExpiresAt: string;
  user: CurrentUser;
}
