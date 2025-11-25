import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { globalLimiter } from './common/middleware/rate-limit.middleware';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const logger = new Logger('Bootstrap');
    const port = process.env.PORT || 3000;

    // ==================== SECURITY MIDDLEWARE ====================

    // 1. Helmet.js - HTTP Security Headers
    app.use(helmet());

    // 2. CORS - Cross-Origin Resource Sharing
    app.enableCors({
      origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    });

    // 3. Global Rate Limiting - Prevents DoS attacks
    // 100 requests per 15 minutes per IP (skip GET requests)
    app.use(globalLimiter);

    // 4. Cookie Parser
    app.use(cookieParser());

    // 5. Global Validation Pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // 6. Global Exception Filter
    app.useGlobalFilters(new AllExceptionsFilter());

    // 7. Global Interceptors
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new ResponseInterceptor(),
    );

    // ==================== SERVER START ====================

    await app.listen(port);
    logger.log(`
      ════════════════════════════════════════════════════
      🚀 Learning Platform Server Started
      ════════════════════════════════════════════════════
      Environment: ${process.env.NODE_ENV || 'development'}
      Port: ${port}
      URL: http://localhost:${port}
      ════════════════════════════════════════════════════
    `);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
