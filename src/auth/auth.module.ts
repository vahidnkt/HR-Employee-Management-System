import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { DatabaseModule } from '../db/database.module';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { authProviders } from './auth.provider';
import {
  loginLimiter,
  registerLimiter,
  strictLimiter,
} from '../common/middleware/rate-limit.middleware';

@Module({
  imports: [DatabaseModule, UsersModule],
  providers: [AuthService, ...authProviders],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply login rate limiter to POST /auth/login
    // Limit: 5 attempts per 5 minutes per IP
    consumer.apply(loginLimiter).forRoutes('auth/login');

    // Apply register rate limiter to POST /auth/register
    // Limit: 3 registrations per 1 hour per IP
    consumer.apply(registerLimiter).forRoutes('auth/register');

    // Apply strict rate limiter to POST /auth/refresh
    // Limit: 10 attempts per 15 minutes per IP
    consumer.apply(strictLimiter).forRoutes('auth/refresh');
  }
}
