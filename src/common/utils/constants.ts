export const CONSTANTS = {
  JWT: {
    SECRET: process.env.JWT_SECRET,
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    EXPIRY: process.env.JWT_EXPIRY || '15m',
    REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  RATE_LIMIT: {
    GLOBAL: 100,
    WINDOW: 15 * 60 * 1000,
    LOGIN: 5,
    PASSWORD_RESET: 3,
  },
  DEVICE: {
    MAX_DEVICES_PAID: 5,
    WARNING_ATTEMPT: 3,
    LOCK_ATTEMPT: 6,
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },
  USER_ROLES: {
    ADMIN: 'admin',
    USER: 'user',
  },
};
