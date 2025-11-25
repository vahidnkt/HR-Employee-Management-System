# SECURITY & GLOBAL MIDDLEWARE - COMPLETE SETUP GUIDE

**Purpose:** Define all global security middleware, guards, interceptors, and filters that protect the entire application.

**Implementation Location:** `src/main.ts`, `src/common/` directory

**When to Create:** BEFORE any modules are created (Phase 1 - Foundation)

---

## TABLE OF CONTENTS

1. [Security Middleware Stack](#security-middleware-stack)
2. [File Structure for Common Utilities](#file-structure)
3. [Global Middleware Setup (main.ts)](#main-ts-setup)
4. [Global Guards Implementation](#global-guards)
5. [Global Interceptors Implementation](#global-interceptors)
6. [Global Filters Implementation](#global-filters)
7. [Global Pipes Implementation](#global-pipes)
8. [Decorators Implementation](#decorators)
9. [Configuration Files](#configuration-files)
10. [NPM Packages to Install](#npm-packages)

---

## SECURITY MIDDLEWARE STACK

### Request Flow (Top to Bottom)

```
1. Helmet.js                 → Security HTTP headers
2. CORS                      → Cross-Origin Resource Sharing
3. Rate Limiting             → 100 req/15min per IP
4. Request Logging           → Winston logger
5. Request Sanitization      → XSS, Mongo injection protection
6. JWT Guard                 → Authentication (JWT validation)
7. Roles Guard               → Authorization (Role checking)
8. Device Guard              → Device lock validation (PAID users)
9. Validation Pipe           → Input validation (class-validator)
10. Transform Pipe           → Data transformation (class-transformer)
11. Request Interceptor      → Logging, timing
12. Route Handler            → Controller method
13. Response Interceptor     → Format response, add metadata
14. Exception Filter         → Handle errors uniformly
15. Response                 → JSON with standard format
```

---

## FILE STRUCTURE

```
src/
├── main.ts                          # Application bootstrap with all middleware
├── common/                          # Shared utilities for entire app
│   ├── decorators/
│   │   ├── auth.decorator.ts        # @Auth() - Mark route as requiring authentication
│   │   ├── roles.decorator.ts       # @Roles('admin') - Specify required roles
│   │   ├── device.decorator.ts      # @Device() - Device lock validation
│   │   └── public.decorator.ts      # @Public() - Skip authentication
│   ├── filters/
│   │   └── exception.filter.ts      # Catch all exceptions and format response
│   ├── guards/
│   │   ├── jwt.guard.ts             # JWT authentication guard
│   │   ├── roles.guard.ts           # Role-based access control guard
│   │   ├── device.guard.ts          # Device lock validation guard
│   │   └── throttle.guard.ts        # Rate limiting guard (if custom needed)
│   ├── interceptors/
│   │   ├── response.interceptor.ts  # Format all responses to standard format
│   │   ├── logging.interceptor.ts   # Log all requests/responses
│   │   ├── error.interceptor.ts     # Log errors
│   │   └── transform.interceptor.ts # Transform data before response
│   ├── pipes/
│   │   ├── validation.pipe.ts       # Custom validation pipe (if needed)
│   │   └── parse-int.pipe.ts        # Parse string to integer
│   ├── utils/
│   │   ├── encrypt.util.ts          # Encryption/decryption functions
│   │   ├── jwt.util.ts              # JWT creation, validation, refresh
│   │   ├── response.util.ts         # Response formatting utility
│   │   ├── logger.util.ts           # Logger wrapper
│   │   └── constants.ts             # App constants
│   └── config/
│       ├── app.config.ts            # Application configuration
│       ├── auth.config.ts           # JWT, OAuth configuration
│       └── security.config.ts       # Security settings
├── config/
│   ├── env.ts                       # Environment variable loading
│   └── database.config.ts           # Database configuration
└── ... (modules)
```

---

## MAIN.TS SETUP

**File:** `src/main.ts`

**Order of Middleware (IMPORTANT - order matters!):**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // ========== SECURITY MIDDLEWARE (Order Matters!) ==========

  // 1. HELMET.JS - HTTP Security Headers (FIRST)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny', // Prevent clickjacking
    },
    noSniff: true, // Prevent MIME type sniffing
    xssFilter: true, // Enable XSS protection
  }));

  // 2. CORS - Cross-Origin Resource Sharing
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Number'],
    optionsSuccessStatus: 200,
  });

  // 3. COOKIE PARSER - Parse cookies from requests
  app.use(cookieParser());

  // 4. GLOBAL VALIDATION PIPE (Transform + Validate)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Strip unknown properties
      forbidNonWhitelisted: true,   // Throw error if unknown properties
      transform: true,              // Transform to DTO classes
      transformOptions: {
        enableImplicitConversion: true, // Auto-convert types
      },
      stopAtFirstError: false,      // Show all validation errors
    }),
  );

  // 5. GLOBAL EXCEPTION FILTER (Catch all errors)
  app.useGlobalFilters(new AllExceptionsFilter());

  // 6. GLOBAL INTERCEPTORS (Order matters - request → response)
  app.useGlobalInterceptors(
    new LoggingInterceptor(),       // Log requests/responses
    new ResponseInterceptor(),      // Format response
  );

  // ========== SERVER START ==========
  const port = process.env.PORT || 3000;
  const env = process.env.NODE_ENV || 'development';

  try {
    await app.listen(port);
    logger.log(`
      ════════════════════════════════════════════════════
      🚀 Application started successfully!
      ════════════════════════════════════════════════════
      Environment: ${env}
      Port: ${port}
      URL: http://localhost:${port}
      ════════════════════════════════════════════════════
    `);
  } catch (error) {
    logger.error(`Failed to start application: ${error.message}`, error.stack);
    process.exit(1);
  }
}

bootstrap();
```

---

## GLOBAL GUARDS

Guards handle authorization - they run BEFORE route handlers.

### 1. JWT Guard (`common/guards/jwt.guard.ts`)

**Purpose:** Validate JWT token from Authorization header

**When:** Every protected route (add @UseGuards(JwtGuard))

**Responsibility:**
- Extract JWT from Authorization header
- Validate JWT signature
- Check expiry
- Attach user info to request
- Throw 401 if invalid

**File Structure:**
```
guards/jwt.guard.ts
├── JwtGuard class
├── Extends: AuthGuard('jwt')
├── Methods:
│   ├── canActivate() - Check if JWT is valid
│   └── getRequest() - Extract user from JWT payload
└── Errors:
    └── 401 Unauthorized - Invalid/missing JWT
```

---

### 2. Roles Guard (`common/guards/roles.guard.ts`)

**Purpose:** Check if user has required roles

**When:** Protected routes with role requirements (add @Roles('admin'))

**Responsibility:**
- Get required roles from @Roles decorator
- Get user roles from JWT payload
- Check if user has at least one required role
- Allow/deny based on role match

**File Structure:**
```
guards/roles.guard.ts
├── RolesGuard class
├── Implements: CanActivate
├── Constructor:
│   └── Inject Reflector for reading decorators
├── Methods:
│   ├── canActivate() - Check roles
│   └── getRequest() - Extract user from request
└── Errors:
    └── 403 Forbidden - User doesn't have required role
```

---

### 3. Device Guard (`common/guards/device.guard.ts`)

**Purpose:** Validate device lock (for PAID users only)

**When:** Protected routes (add @UseGuards(DeviceGuard))

**Responsibility:**
- Get device fingerprint from request headers
- Check if user is PAID subscription
- If PAID: validate device is registered and not locked
- If FREE: allow all devices
- Throw error if device is locked

**File Structure:**
```
guards/device.guard.ts
├── DeviceGuard class
├── Implements: CanActivate
├── Dependency Injection:
│   ├── Inject DevicesService
│   └── Inject SubscriptionsService
├── Methods:
│   ├── canActivate() - Main validation
│   ├── getDeviceFingerprint() - Extract from headers
│   └── checkDeviceLock() - Check status in database
└── Errors:
    └── 403 Forbidden - Device is locked/not registered
```

---

## GLOBAL INTERCEPTORS

Interceptors wrap request/response handling - they run BEFORE and AFTER route handlers.

### 1. Response Interceptor (`common/interceptors/response.interceptor.ts`)

**Purpose:** Format ALL responses to standard format

**When:** Applied globally in main.ts

**Standard Response Format:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Request successful",
  "data": { /* actual response */ },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**File Structure:**
```
response.interceptor.ts
├── ResponseInterceptor class
├── Implements: NestInterceptor
├── Methods:
│   ├── intercept() - Main method
│   └── formatResponse() - Transform to standard format
├── Handles:
│   ├── Success responses (200-299)
│   └── Add metadata (timestamp, statusCode)
└── Output:
    └── Observable with formatted response
```

---

### 2. Logging Interceptor (`common/interceptors/logging.interceptor.ts`)

**Purpose:** Log all requests and responses for debugging/monitoring

**When:** Applied globally in main.ts

**What to Log:**
- Request method + path
- Request headers (excluding sensitive)
- Request body (excluding passwords)
- Response time (ms)
- Status code
- Response size
- Errors

**File Structure:**
```
logging.interceptor.ts
├── LoggingInterceptor class
├── Implements: NestInterceptor
├── Dependency Injection:
│   └── Inject Logger
├── Methods:
│   ├── intercept() - Main method
│   ├── logRequest() - Log incoming request
│   ├── logResponse() - Log outgoing response
│   └── maskSensitiveData() - Hide passwords, tokens
└── Output:
    └── Observable with timing data
```

---

### 3. Error Interceptor (`common/interceptors/error.interceptor.ts`) [OPTIONAL]

**Purpose:** Catch and log errors before exception filter

**When:** Applied globally in main.ts (if custom error logging needed)

**File Structure:**
```
error.interceptor.ts
├── ErrorInterceptor class
├── Implements: NestInterceptor
├── Methods:
│   ├── intercept() - Wrap with try-catch
│   └── logError() - Log to monitoring service
└── Behavior:
    └── Re-throw error to exception filter
```

---

## GLOBAL EXCEPTION FILTERS

Filters catch exceptions and format error responses.

### All Exceptions Filter (`common/filters/exception.filter.ts`)

**Purpose:** Catch ALL exceptions and return formatted error response

**When:** Applied globally in main.ts

**Handles These Exceptions:**
```
├── HttpException
│   ├── BadRequestException (400)
│   ├── UnauthorizedException (401)
│   ├── ForbiddenException (403)
│   ├── NotFoundException (404)
│   ├── ConflictException (409)
│   └── InternalServerErrorException (500)
├── DatabaseException
├── ValidationException
├── QueryFailedError (from Sequelize)
└── Unknown Error (catch-all)
```

**Error Response Format:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Bad Request",
  "errors": [
    {
      "field": "email",
      "message": "Email is invalid"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**File Structure:**
```
exception.filter.ts
├── AllExceptionsFilter class
├── Implements: ExceptionFilter
├── Dependency Injection:
│   └── Inject Logger
├── Methods:
│   ├── catch() - Main handler
│   ├── handleHttpException() - Format HTTP errors
│   ├── handleDatabaseException() - Format DB errors
│   ├── handleValidationException() - Format validation errors
│   └── formatErrorResponse() - Create standard format
└── Error Handling:
    ├── Never expose stack traces in production
    ├── Log full error internally
    └── Send generic message to client
```

---

## GLOBAL PIPES

Pipes transform and validate data.

### 1. Validation Pipe (Built-in)

**Purpose:** Validate request body against DTO

**When:** Applied globally in main.ts

**Configuration:**
```typescript
new ValidationPipe({
  whitelist: true,              // Remove unknown properties
  forbidNonWhitelisted: true,   // Throw if unknown properties exist
  transform: true,              // Convert to DTO class instance
  transformOptions: {
    enableImplicitConversion: true, // Auto convert string → number
  },
  stopAtFirstError: false,      // Show all errors (not just first)
})
```

**Flow:**
- Request body arrives
- Validate against DTO class
- If invalid: throw BadRequestException
- If valid: transform to DTO instance
- Pass to controller

---

### 2. Parse Int Pipe (Built-in)

**Purpose:** Convert route parameter to integer

**When:** Route parameters that are IDs (auto-used)

**Example:**
```typescript
@Get(':id')
async findOne(@Param('id', ParseIntPipe) id: number) {}
```

---

## DECORATORS

Decorators mark routes with metadata for guards and interceptors.

### 1. Auth Decorator (`common/decorators/auth.decorator.ts`)

**Purpose:** Mark route as requiring authentication

**Usage:**
```typescript
@Controller('schools')
export class SchoolsController {
  @Get()
  @Auth()  // Requires JWT authentication
  async findAll() {}
}
```

**What it does:**
- Applied before @UseGuards(JwtGuard)
- Metadata used by global setup
- Simpler than @UseGuards on every route

**File Structure:**
```
auth.decorator.ts
├── Export Auth() decorator function
├── Uses: Reflect.setMetadata()
├── Sets: 'isAuth': true
└── Name: 'auth'
```

---

### 2. Roles Decorator (`common/decorators/roles.decorator.ts`)

**Purpose:** Specify which roles can access a route

**Usage:**
```typescript
@Controller('schools')
export class SchoolsController {
  @Post()
  @Auth()
  @Roles('admin', 'teacher')  // Only admin or teacher
  async create(@Body() dto: CreateSchoolDto) {}
}
```

**What it does:**
- Sets metadata with allowed roles
- Used by RolesGuard to check
- Automatic enforcement via guard

**File Structure:**
```
roles.decorator.ts
├── Export Roles(...roles: string[]) decorator function
├── Uses: Reflect.setMetadata()
├── Sets: 'roles': ['admin', 'teacher']
└── Name: 'roles'
```

---

### 3. Device Decorator (`common/decorators/device.decorator.ts`)

**Purpose:** Mark route for device lock validation (PAID users)

**Usage:**
```typescript
@Controller('content')
export class ContentController {
  @Get()
  @Auth()
  @Device()  // Validate device for PAID users
  async findAll() {}
}
```

**What it does:**
- Check device fingerprint
- Validate device is not locked
- Only enforced for PAID users

---

### 4. Public Decorator (`common/decorators/public.decorator.ts`)

**Purpose:** Skip authentication for public routes

**Usage:**
```typescript
@Controller('auth')
export class AuthController {
  @Post('register')
  @Public()  // No authentication required
  async register(@Body() dto: RegisterDto) {}
}
```

**What it does:**
- Skip JwtGuard for this route
- No authentication check
- Used for login, register, public content

---

## CONFIGURATION FILES

### 1. Environment Variables (.env)

**File:** `.env` (in project root)

**Content:**
```env
# Application
NODE_ENV=development
PORT=3000
APP_NAME=LearningPlatform
APP_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER_NAME=learning_user
DB_PASSWORD=secure_password
DB_NAME=learning_platform
DB_SSL=true
DB_POOL_MAX=5
DB_POOL_MIN=0

# JWT
JWT_SECRET=your_secret_key_minimum_32_characters_long
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters_long
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_SECRET=your_razorpay_secret

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# SendGrid (Email)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@learning.com
SENDGRID_FROM_NAME=Learning Platform

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# Security
BCRYPT_ROUNDS=10
SESSION_SECRET=your_session_secret_32_chars
ENCRYPTION_KEY=your_encryption_key_32_chars
```

---

### 2. Security Config (`config/security.config.ts`)

**Purpose:** Centralized security settings

**Content:**
```typescript
// Rate limiting
export const RATE_LIMIT = {
  GLOBAL: 100,           // 100 requests
  WINDOW: 15 * 60 * 1000, // 15 minutes
  LOGIN: 5,              // 5 login attempts
  PASSWORD_RESET: 3,     // 3 password reset attempts
  FORGOT_PASSWORD_WINDOW: 60 * 60 * 1000, // 1 hour
};

// JWT
export const JWT_CONFIG = {
  EXPIRY: process.env.JWT_EXPIRY || '15m',
  REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  ALGORITHM: 'HS256',
};

// Password
export const PASSWORD_CONFIG = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL: true,
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS) || 10,
};

// Device Security
export const DEVICE_CONFIG = {
  MAX_DEVICES_PAID: 5,
  WARNING_ATTEMPT: 3,
  LOCK_ATTEMPT: 6,
  FINGERPRINT_VERSION: 1,
};

// CORS
export const CORS_CONFIG = {
  ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  CREDENTIALS: true,
  METHODS: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
};
```

---

## NPM PACKAGES TO INSTALL

Run these commands to install all required security packages:

```bash
# Core NestJS
npm install @nestjs/core @nestjs/common @nestjs/jwt @nestjs/passport

# Security
npm install helmet cors bcryptjs jsonwebtoken passport-jwt
npm install class-validator class-transformer

# Database
npm install sequelize sequelize-typescript pg

# Caching & Rate Limiting
npm install redis @nestjs/throttler

# Logging
npm install winston morgan

# Sanitization
npm install xss express-mongo-sanitize

# Other utilities
npm install dotenv cookie-parser uuid

# Development
npm install -D @types/express @types/node @types/bcryptjs typescript
```

---

## IMPLEMENTATION CHECKLIST

**Order of Creation (BEFORE any modules):**

- [ ] Create `src/common/decorators/` directory
  - [ ] auth.decorator.ts
  - [ ] roles.decorator.ts
  - [ ] device.decorator.ts
  - [ ] public.decorator.ts

- [ ] Create `src/common/guards/` directory
  - [ ] jwt.guard.ts
  - [ ] roles.guard.ts
  - [ ] device.guard.ts

- [ ] Create `src/common/interceptors/` directory
  - [ ] response.interceptor.ts
  - [ ] logging.interceptor.ts
  - [ ] error.interceptor.ts (optional)

- [ ] Create `src/common/filters/` directory
  - [ ] exception.filter.ts

- [ ] Create `src/common/pipes/` directory
  - [ ] validation.pipe.ts (if custom needed)

- [ ] Create `src/common/utils/` directory
  - [ ] encrypt.util.ts
  - [ ] jwt.util.ts
  - [ ] response.util.ts
  - [ ] logger.util.ts
  - [ ] constants.ts

- [ ] Create `src/common/config/` directory
  - [ ] app.config.ts
  - [ ] auth.config.ts
  - [ ] security.config.ts

- [ ] Create `src/config/` directory
  - [ ] env.ts
  - [ ] database.config.ts

- [ ] Update `src/main.ts` with all middleware

- [ ] Create `.env` file with all variables

- [ ] Create `.env.example` file (no secrets)

- [ ] Test: Run `npm start` and check for errors

---

## TESTING THE SECURITY SETUP

After implementation, test each component:

### Test 1: JWT Authentication
```bash
# Without token (should 401)
curl http://localhost:3000/schools

# With token (should work)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/schools
```

### Test 2: Rate Limiting
```bash
# Make 101 requests quickly (should get 429 after 100)
for i in {1..110}; do curl http://localhost:3000/schools; done
```

### Test 3: CORS
```bash
# From different origin (should check CORS headers)
curl -H "Origin: http://example.com" http://localhost:3000/schools
```

### Test 4: Input Validation
```bash
# With invalid data (should 400)
curl -X POST http://localhost:3000/schools \
  -H "Content-Type: application/json" \
  -d '{"name": ""}' # Empty name should fail
```

### Test 5: Error Handling
```bash
# Request non-existent route (should 404 with standard format)
curl http://localhost:3000/nonexistent
```

---

## SUMMARY

**Total Files to Create:** 15-20
- 4 decorators
- 3 guards
- 3 interceptors
- 1 exception filter
- 1-2 pipes
- 5+ utility files
- 3+ config files
- Updated main.ts

**Security Layers:** 8
1. Helmet.js (HTTP headers)
2. CORS (Origin validation)
3. Rate Limiting (DDoS protection)
4. JWT Guard (Authentication)
5. Roles Guard (Authorization)
6. Device Guard (Device lock)
7. Validation Pipe (Input validation)
8. Exception Filter (Error handling)

**Performance Impact:** Minimal (<5ms per request for all security checks)

**Coverage:** 100% of requests go through this security stack

---

**Next Step:** Create these files following this guide, then proceed with module development using DEVELOPMENT_PLAN.md
