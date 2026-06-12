import { CurrentUser } from './current-user.model';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  user: CurrentUser;
}
