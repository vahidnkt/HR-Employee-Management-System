export const securityConfig = {
  RATE_LIMIT_GLOBAL: 100,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,
  RATE_LIMIT_LOGIN: 5,
  RATE_LIMIT_PASSWORD_RESET: 3,
  ACCOUNT_LOCK_DURATION: 30 * 60 * 1000, // 30 minutes
  PASSWORD_RESET_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars-min',
};
