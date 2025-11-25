import { RefreshTokens } from './auth.entity';

export const authProviders = [
  {
    provide: 'REFRESH_TOKENS_REPOSITORY',
    useValue: RefreshTokens,
  },
];
