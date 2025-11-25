export const appConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  APP_NAME: 'Learning Platform',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
};
