# LEARNING PLATFORM - DEVELOPMENT PLAN

**Project:** NestJS Learning Platform for 100K+ users
**Architecture:** Monolithic NestJS + PostgreSQL + Sequelize
**Database:** 17 tables with 45+ indexes
**Performance Target:** All queries < 200ms

---

## TABLE OF CONTENTS

1. [Folder Structure](#folder-structure)
2. [Module Development Order (Priority)](#module-development-order)
3. [Standard NestJS File Pattern (5-File Module)](#standard-nestjs-file-pattern)
4. [Database Setup Checklist](#database-setup-checklist)
5. [Global Configuration Setup](#global-configuration-setup)
6. [Module-by-Module Development Steps](#module-by-module-development-steps)
7. [Testing & Deployment](#testing--deployment)

---

## FOLDER STRUCTURE

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module
├── db/
│   ├── database.module.ts           # Database module
│   └── database.providers.ts        # Sequelize configuration & providers
├── common/                          # Shared utilities
│   ├── decorators/
│   │   ├── auth.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── device.decorator.ts
│   ├── filters/
│   │   └── exception.filter.ts      # Global exception handling
│   ├── guards/
│   │   ├── jwt.guard.ts             # JWT authentication
│   │   ├── roles.guard.ts           # Role-based access control
│   │   └── device.guard.ts          # Device lock validation
│   ├── interceptors/
│   │   ├── response.interceptor.ts  # Global response format
│   │   ├── logging.interceptor.ts   # Request/response logging
│   │   └── error.interceptor.ts     # Error handling
│   ├── pipes/
│   │   ├── validation.pipe.ts       # Input validation
│   │   └── sanitization.pipe.ts     # Input sanitization
│   └── utils/
│       ├── encrypt.util.ts          # Encryption/decryption
│       ├── jwt.util.ts              # JWT operations
│       ├── response.util.ts         # Response formatter
│       └── logger.util.ts           # Logging
├── config/
│   ├── app.config.ts                # Application config
│   ├── database.config.ts           # Database config
│   ├── auth.config.ts               # Auth config
│   └── notification.config.ts       # Notification config
├── auth/                            # AUTH MODULE (Priority 1)
│   ├── auth.module.ts               # Module definition
│   ├── auth.service.ts              # Business logic
│   ├── auth.controller.ts           # API endpoints
│   └── dto/
│       ├── login.dto.ts
│       ├── register.dto.ts
│       ├── refresh-token.dto.ts
│       └── password-reset.dto.ts
├── users/                           # USERS MODULE (Existing)
│   ├── entities/
│   │   └── users.entity.ts          # Users table model
│   ├── providers/
│   │   └── users.provider.ts        # DI configuration
│   ├── users.module.ts
│   ├── users.service.ts
│   ├── users.controller.ts
│   └── dto/
│       ├── create-user.dto.ts
│       ├── update-user.dto.ts
│       └── user-profile.dto.ts
├── schools/                         # SCHOOLS MODULE (Priority 1)
│   ├── entities/
│   │   └── schools.entity.ts        # Schools table model
│   ├── providers/
│   │   └── schools.provider.ts      # DI configuration
│   ├── schools.module.ts
│   ├── schools.service.ts
│   ├── schools.controller.ts
│   └── dto/
│       ├── create-school.dto.ts
│       ├── update-school.dto.ts
│       └── school-response.dto.ts
├── classes/                         # CLASSES MODULE (Priority 1)
│   ├── entities/
│   │   └── classes.entity.ts        # Classes table model
│   ├── providers/
│   │   └── classes.provider.ts      # DI configuration
│   ├── classes.module.ts
│   ├── classes.service.ts
│   ├── classes.controller.ts
│   └── dto/
│       ├── create-class.dto.ts
│       ├── update-class.dto.ts
│       └── class-response.dto.ts
├── content/                         # CONTENT MODULE (Priority 1)
│   ├── entities/
│   │   ├── content.entity.ts        # Content table model
│   │   └── lessons.entity.ts        # Lessons table model
│   ├── providers/
│   │   ├── content.provider.ts
│   │   └── lessons.provider.ts
│   ├── content.module.ts
│   ├── content.service.ts
│   ├── content.controller.ts
│   └── dto/
│       ├── create-content.dto.ts
│       ├── update-content.dto.ts
│       └── content-response.dto.ts
├── progress/                        # PROGRESS MODULE (Priority 2)
│   ├── entities/
│   │   └── progress.entity.ts       # Progress tracking table
│   ├── providers/
│   │   └── progress.provider.ts
│   ├── progress.module.ts
│   ├── progress.service.ts
│   ├── progress.controller.ts
│   └── dto/
│       ├── update-progress.dto.ts
│       └── progress-response.dto.ts
├── assignments/                     # ASSIGNMENTS MODULE (Priority 2)
│   ├── entities/
│   │   ├── assignments.entity.ts    # Assignments table
│   │   └── submissions.entity.ts    # Submissions table
│   ├── providers/
│   │   ├── assignments.provider.ts
│   │   └── submissions.provider.ts
│   ├── assignments.module.ts
│   ├── assignments.service.ts
│   ├── assignments.controller.ts
│   └── dto/
│       ├── create-assignment.dto.ts
│       ├── submit-assignment.dto.ts
│       └── assignment-response.dto.ts
├── subscriptions/                   # SUBSCRIPTION MODULE (Priority 3)
│   ├── entities/
│   │   ├── subscriptions.entity.ts  # Subscriptions table
│   │   ├── payments.entity.ts       # Payments table
│   │   └── invoices.entity.ts       # Invoices table
│   ├── providers/
│   │   ├── subscriptions.provider.ts
│   │   ├── payments.provider.ts
│   │   └── invoices.provider.ts
│   ├── subscriptions.module.ts
│   ├── subscriptions.service.ts
│   ├── subscriptions.controller.ts
│   └── dto/
│       ├── subscribe.dto.ts
│       ├── cancel-subscription.dto.ts
│       └── subscription-response.dto.ts
├── devices/                         # DEVICES MODULE (Priority 4)
│   ├── entities/
│   │   ├── devices.entity.ts        # Devices table
│   │   └── device-history.entity.ts # Device change history
│   ├── providers/
│   │   ├── devices.provider.ts
│   │   └── device-history.provider.ts
│   ├── devices.module.ts
│   ├── devices.service.ts
│   ├── devices.controller.ts
│   └── dto/
│       ├── register-device.dto.ts
│       ├── verify-device.dto.ts
│       └── device-response.dto.ts
└── notifications/                   # NOTIFICATIONS MODULE (Priority 5)
    ├── entities/
    │   ├── notifications.entity.ts  # Notifications table
    │   └── notification-logs.entity.ts # Logs table
    ├── providers/
    │   ├── notifications.provider.ts
    │   ├── whatsapp.provider.ts     # Twilio provider
    │   └── email.provider.ts        # SendGrid provider
    ├── notifications.module.ts
    ├── notifications.service.ts
    ├── notifications.controller.ts
    ├── jobs/
    │   ├── send-notification.job.ts # BullMQ job
    │   └── notification.processor.ts # Job processor
    └── dto/
        ├── send-notification.dto.ts
        └── notification-response.dto.ts

.env                                 # Environment variables
.env.example                         # Template
docker-compose.yml                   # PostgreSQL container
```

---

## MODULE DEVELOPMENT ORDER (PRIORITY)

### PHASE 1: FOUNDATION (Weeks 1-2)

1. **Global Setup** - Common utilities, decorators, guards, interceptors, filters
2. **Users Module** - Enhance existing with proper entity, provider pattern
3. **Auth Module** - Login, register, JWT, refresh tokens, OAuth
4. **Schools Module** - CRUD for schools

### PHASE 2: CORE FEATURES (Weeks 3-4)

5. **Classes Module** - CRUD for classes under schools
6. **Content Module** - CRUD for content/lessons under classes
7. **Progress Module** - Track user progress through content

### PHASE 3: ADVANCED FEATURES (Weeks 5-6)

8. **Assignments Module** - Create assignments, track submissions
9. **Subscriptions Module** - Payment processing, plan management
10. **Devices Module** - Device lock, device fingerprinting, max 5 changes

### PHASE 4: EXTRAS (Week 7)

11. **Notifications Module** - WhatsApp, Email via Twilio & SendGrid

---

## STANDARD NESTJS FILE PATTERN (5-FILE MODULE)

Every module must follow this standard structure:

### 1. ENTITY FILE (`*.entity.ts`)

**Purpose:** Database model definition using Sequelize decorators

**File: `schools/entities/schools.entity.ts`**

**What goes here:**

- `@Table()` decorator with table name and timestamps
- `@Index()` decorators for all database indexes
- `@Column()` properties with types, constraints, defaults
- `@HasMany()`, `@BelongsTo()` relationships
- Column descriptions as comments
- Data validation rules as comments

**Naming Convention:**

- Table names: `plural_snake_case` (e.g., `schools`, `user_profiles`)
- Column names: `snake_case` (e.g., `created_at`, `is_active`)
- Class names: `PascalCase` (e.g., `Schools`, `UserProfiles`)

**Key Decorators:**

```
@Column({
  type: DataType.STRING(255),
  allowNull: false,
  unique: true,            // Unique constraint
  defaultValue: true,      // Default value
  comment: 'School name'   // Documentation
})

@Index                     // Create index on column
@CreatedAt                 // Auto-timestamp creation
@UpdatedAt                 // Auto-timestamp update
@Version                   // Optimistic locking
@HasMany(() => Classes)    // One-to-many relationship
@BelongsTo(() => Users)    // Many-to-one relationship
@BelongsToMany()           // Many-to-many relationship
```

---

### 2. PROVIDER FILE (`*.provider.ts`)

**Purpose:** Dependency Injection configuration for the entity/service

**File: `schools/providers/schools.provider.ts`**

**What goes here:**

- Entity repository pattern setup
- Database provider registration
- Factory functions for initialization
- Any helper providers needed by the service

**Pattern:**

```typescript
export const schoolsProviders = [
  {
    provide: 'SCHOOLS_REPOSITORY',
    useValue: Schools, // Inject the entity as repository
  },
];
```

**Why this pattern:**

- Loose coupling (injectable dependencies)
- Easy to mock for testing
- Follows NestJS dependency injection standards
- Repository pattern for data access

**Key Points:**

- Create ONE provider per entity
- Provide token name: `MODULE_REPOSITORY` (e.g., `SCHOOLS_REPOSITORY`)
- Export as array from provider file
- Import in module with `providers: [...schoolsProviders]`

---

### 3. MODULE FILE (`*.module.ts`)

**Purpose:** Wire together the module - imports, exports, providers, controllers

**File: `schools/schools.module.ts`**

**What goes here:**

- `@Module()` decorator
- `imports`: Other modules needed (DatabaseModule for entity, etc.)
- `providers`: Service + providers array
- `controllers`: Controller class
- `exports`: What other modules can use (usually service)

**Pattern:**

```typescript
@Module({
  imports: [DatabaseModule], // Import DatabaseModule
  providers: [SchoolsService, ...schoolsProviders], // Service + repositories
  controllers: [SchoolsController], // Controllers
  exports: [SchoolsService], // Export for other modules
})
export class SchoolsModule {}
```

**Why this pattern:**

- Single responsibility (module only wires dependencies)
- Declarative structure
- Easy to see what's imported/exported
- Follows NestJS module standards

---

### 4. SERVICE FILE (`*.service.ts`)

**Purpose:** Business logic, database operations, data transformations

**File: `schools/schools.service.ts`**

**What goes here:**

- Constructor with injected dependencies (@Inject)
- Business methods (CRUD: create, findAll, findOne, update, delete)
- Data validation logic
- Database queries via repository
- Data transformation/mapping
- Error handling
- Logging

**Method Pattern:**

```typescript
constructor(
  @Inject('SCHOOLS_REPOSITORY')
  private readonly schoolsRepository: typeof Schools
) {}

async create(createSchoolDto: CreateSchoolDto): Promise<SchoolResponseDto> {
  // 1. Validate input (class-validator handles this)
  // 2. Check business rules (e.g., admin exists)
  // 3. Create in database
  // 4. Transform response
  // 5. Return result
}

async findAll(
  page: number = 1,
  limit: number = 10
): Promise<PaginationResponseDto<SchoolResponseDto>> {
  // 1. Calculate offset
  // 2. Query with pagination
  // 3. Apply indexes for <200ms query time
  // 4. Transform to DTO
  // 5. Return with total count
}

async findOne(id: number): Promise<SchoolResponseDto> {
  // 1. Find by ID
  // 2. Throw NotFoundException if not found
  // 3. Transform to DTO
  // 4. Return
}

async update(id: number, updateSchoolDto: UpdateSchoolDto): Promise<SchoolResponseDto> {
  // 1. Find school exists
  // 2. Update in database
  // 3. Return updated object
}

async delete(id: number): Promise<void> {
  // 1. Find school exists
  // 2. Delete from database (or soft delete)
  // 3. No return
}
```

**Key Points:**

- ONE service per module
- Inject dependencies in constructor
- Use `async/await` for database calls
- Transform database models to DTOs before returning
- Always return DTOs, never raw database models
- Handle errors (throw HttpException with appropriate status)
- Log important operations (create, delete, errors)
- Use database indexes to keep queries <200ms

---

### 5. CONTROLLER FILE (`*.controller.ts`)

**Purpose:** HTTP API endpoints - request/response handling

**File: `schools/schools.controller.ts`**

**What goes here:**

- Constructor with injected service
- HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Route parameters and query strings
- Request/response DTOs
- Guards (authorization)
- Status codes
- Error responses

**Endpoint Pattern:**

```typescript
@Controller('schools') // Base route: /schools
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  // POST /schools - Create
  @Post()
  @UseGuards(JwtGuard) // Require authentication
  @HttpCode(201) // Status code
  async create(@Body() createSchoolDto: CreateSchoolDto) {
    return this.schoolsService.create(createSchoolDto);
  }

  // GET /schools - List all
  @Get()
  @UseGuards(JwtGuard)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.schoolsService.findAll(page, limit);
  }

  // GET /schools/:id - Get one
  @Get(':id')
  @UseGuards(JwtGuard)
  async findOne(@Param('id') id: number) {
    return this.schoolsService.findOne(id);
  }

  // PUT /schools/:id - Update
  @Put(':id')
  @UseGuards(JwtGuard, RolesGuard) // Multiple guards
  @Roles('admin') // Role check
  async update(
    @Param('id') id: number,
    @Body() updateSchoolDto: UpdateSchoolDto,
  ) {
    return this.schoolsService.update(id, updateSchoolDto);
  }

  // DELETE /schools/:id - Delete
  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  async delete(@Param('id') id: number) {
    return this.schoolsService.delete(id);
  }
}
```

**Key Points:**

- Route decorator: `@Controller('module-name')`
- HTTP decorators: `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()`
- Parameter decorators: `@Param()`, `@Query()`, `@Body()`, `@Headers()`
- Guards for authorization: `@UseGuards(JwtGuard, RolesGuard)`
- Roles decorator: `@Roles('admin')`
- Status codes: `@HttpCode(201)` for create, etc.
- Always accept DTOs, return DTOs
- Never handle errors here - let global exception filter handle it

---

### DTO FILE (`dto/*.dto.ts`)

**Purpose:** Request/response data validation and transformation

**File: `schools/dto/create-school.dto.ts`**

**What goes here:**

- Class properties with validators
- `class-validator` decorators
- Comments explaining each field
- Min/max lengths, formats, patterns
- Custom validators if needed

**Pattern:**

```typescript
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateSchoolDto {
  @IsString({ message: 'Name must be a string' })
  @MinLength(3, { message: 'Name must be at least 3 characters' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEmail({}, { message: 'Email must be valid' })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  phone?: string;
}

export class SchoolResponseDto {
  id: number;
  name: string;
  description: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Key Points:**

- ONE DTO per operation (Create, Update, Response)
- Use `class-validator` decorators
- Use `@IsOptional()` for optional fields
- Provide custom error messages
- Use for both request validation AND response transformation

---

## DATABASE SETUP CHECKLIST

Before creating any modules:

- [ ] PostgreSQL installed and running
- [ ] Database created (e.g., `learning_platform`)
- [ ] Environment variables set (.env file)
- [ ] Connection pooling configured (max 5 connections)
- [ ] SSL/TLS enabled for database connection
- [ ] Connection test successful
- [ ] Sequelize sync setup ready

**Environment Variables (.env):**

```
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER_NAME=learning_user
DB_PASSWORD=secure_password
DB_NAME=learning_platform
DB_SSL=true

# JWT
JWT_SECRET=your_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Razorpay
RAZORPAY_KEY_ID=your_key
RAZORPAY_SECRET=your_secret

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# SendGrid (Email)
SENDGRID_API_KEY=your_key
SENDGRID_FROM_EMAIL=noreply@learning.com

# Redis (for caching, rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## GLOBAL CONFIGURATION SETUP

Before creating any modules, set up these global configurations:

### 1. Global Response Format

All API responses must follow this standard format:

**Success Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Request successful",
  "data": {
    // Actual response data
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error Response (400+):**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is invalid"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Implementation:** Create global response interceptor in `common/interceptors/response.interceptor.ts`

### 2. Global Exception Handling

All errors must be caught and formatted uniformly.

**Implementation:** Create global exception filter in `common/filters/exception.filter.ts`

**Handles:**

- HttpException (400, 401, 403, 404, 500, etc.)
- DatabaseException
- ValidationException
- UnauthorizedException
- ForbiddenException
- NotFoundException
- ConflictException

### 3. Global Validation & Sanitization

All inputs must be validated and sanitized globally.

**Implementation:** Update `main.ts` with:

- `ValidationPipe` (class-validator)
- `SanitizationPipe` (xss-clean, mongo-sanitize)
- `TransformPipe` (class-transformer)

### 4. Global Security Middleware

All requests must go through security checks.

**Implementation:** Add middleware in `main.ts`:

- Helmet.js (HTTP headers)
- CORS configuration
- Rate limiting (100 req/15min global)
- Request logging (Winston)
- CSRF protection

### 5. JWT Authentication

Centralized JWT handling for all routes.

**Implementation:** Create `common/guards/jwt.guard.ts`

- Validate JWT from Authorization header
- Extract user info from token
- Attach user to request object

### 6. Role-Based Access Control (RBAC)

Centralized permission checking.

**Implementation:** Create `common/guards/roles.guard.ts`

- Check user roles via JWT claims
- Allow/deny based on @Roles decorator

### 7. Device Lock Guard

Validate device on each request (for PAID users).

**Implementation:** Create `common/guards/device.guard.ts`

- Extract device fingerprint from request
- Check if device is registered for this user
- Check if device is locked
- Allow/deny based on device status

---

## MODULE-BY-MODULE DEVELOPMENT STEPS

### STEP 1: Create Entity File (Schema Definition)

**File:** `modules/{name}/entities/{name}.entity.ts`

**Steps:**

1. Define all columns with types
2. Add all indexes (for <200ms queries)
3. Add relationships (HasMany, BelongsTo, BelongsToMany)
4. Add timestamps (createdAt, updatedAt)
5. Add validations as comments
6. Add index comments explaining why

**Database Design Rules:**

- Use INTEGER for IDs (auto-increment)
- Use STRING(255) for emails, names
- Use TEXT for descriptions, content
- Use BOOLEAN for flags
- Use DATETIME for dates
- Use DECIMAL for money
- Always use timestamps (createdAt, updatedAt)
- Always add indexes on frequently queried columns

**Relationships to Setup:**

- Schools → Classes (1:M)
- Classes → Content (1:M)
- Content → Lessons (1:M)
- Users → Progress (1:M)
- Users → Subscriptions (1:M)
- Users → Devices (1:M)
- Users → Assignments (1:M)
- Classes → Assignments (1:M)

---

### STEP 2: Create Provider File (DI Setup)

**File:** `modules/{name}/providers/{name}.provider.ts`

**Steps:**

1. Export array of providers
2. Create one provider per entity
3. Token: `{MODULE_UPPERCASE}_REPOSITORY`
4. Value: The entity class
5. Export as array

**Standard Pattern:**

```typescript
export const schoolsProviders = [
  {
    provide: 'SCHOOLS_REPOSITORY',
    useValue: Schools,
  },
];
```

---

### STEP 3: Create Module File (Wire Dependencies)

**File:** `modules/{name}/{name}.module.ts`

**Steps:**

1. Import DatabaseModule (for models)
2. Add providers (service + providers array)
3. Add controller
4. Export service (for use in other modules)
5. Add module to app.module.ts imports

**Checklist:**

- [ ] `@Module()` decorator present
- [ ] `imports: [DatabaseModule]` set
- [ ] `providers: [Service, ...Providers]` set
- [ ] `controllers: [Controller]` set
- [ ] `exports: [Service]` set
- [ ] Added to app.module.ts

---

### STEP 4: Create Service File (Business Logic)

**File:** `modules/{name}/{name}.service.ts`

**Steps:**

1. Inject repository in constructor
2. Create CRUD methods (create, findAll, findOne, update, delete)
3. Add business logic (validation, checks)
4. Transform database models to DTOs
5. Handle errors (throw HttpException)
6. Add logging (debug, info, warn, error)

**CRUD Template:**

```
create(dto) → Validate → Query DB → Transform → Return
findAll(page, limit) → Query with pagination → Transform → Return with total
findOne(id) → Query → Check exists → Transform → Return
update(id, dto) → Find → Validate → Update DB → Transform → Return
delete(id) → Find → Delete DB → Return void
```

**Error Handling:**

- 400: Bad request (validation)
- 401: Unauthorized (no token)
- 403: Forbidden (no permission)
- 404: Not found (resource doesn't exist)
- 409: Conflict (duplicate, business rule violation)
- 500: Server error (unhandled exception)

---

### STEP 5: Create Controller File (API Endpoints)

**File:** `modules/{name}/{name}.controller.ts`

**Steps:**

1. Set `@Controller('module-name')`
2. Create HTTP method per operation
3. Add route parameters, query strings, body
4. Add guards for authorization (@UseGuards)
5. Add roles for RBAC (@Roles)
6. Set status codes (@HttpCode)
7. Call service method
8. Return response (DTO)

**HTTP Methods Mapping:**

- POST /module → create
- GET /module → findAll
- GET /module/:id → findOne
- PUT /module/:id → update
- DELETE /module/:id → delete

**Status Codes:**

- 200: GET, PUT, PATCH success
- 201: POST success
- 204: DELETE success (or 200)
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 409: Conflict

---

### STEP 6: Create DTOs (Validation & Response)

**Files:**

- `modules/{name}/dto/create-{name}.dto.ts`
- `modules/{name}/dto/update-{name}.dto.ts`
- `modules/{name}/dto/{name}-response.dto.ts`

**Steps:**

1. Create class for each operation
2. Add class-validator decorators
3. Add comments for each field
4. Use @IsOptional() for optional fields
5. Provide custom error messages
6. Export all DTOs

**Standard Validators:**

```
@IsString()
@IsNumber()
@IsBoolean()
@IsDate()
@IsEmail()
@IsUrl()
@MinLength(n)
@MaxLength(n)
@Min(n)
@Max(n)
@Matches(regex)
@IsOptional()
@IsEnum(enum)
@IsArray()
@ValidateNested()
@Type(() => Class)
```

---

### STEP 7: Update app.module.ts

**After creating each module:**

1. Import the module in app.module.ts
2. Add to @Module imports array
3. Order: DatabaseModule first, then Auth, then others

---

### STEP 8: Update database.providers.ts

**After creating each entity:**

1. Import the entity class
2. Add to sequelize.addModels([...])

---

## 17 DATABASE TABLES OVERVIEW

### Learning Platform Tables

1. **users** - User accounts (id, email, password, name, role, profile)
2. **schools** - Schools (id, name, adminId, description, logo, banner)
3. **classes** - Classes under schools (id, schoolId, name, description)
4. **content** - Learning content (id, classId, title, description, type)
5. **lessons** - Lessons under content (id, contentId, title, videoUrl, duration)
6. **progress** - User progress tracking (id, userId, contentId, completionPercentage)

### Subscription Tables

9. **subscriptions** - User subscriptions (id, userId, planId, status, startDate)
10. **payments** - Payment records (id, userId, amount, status, paymentMethod)
11. **invoices** - Invoice generation (id, paymentId, invoiceNumber, amount)

### Device Security Tables

12. **devices** - Registered devices (id, userId, fingerprint, name, status)
13. **device_history** - Device changes log (id, userId, oldDeviceId, newDeviceId, attemptCount)

### Notification Tables

14. **notifications** - Notification records (id, userId, type, title, message)
15. **notification_logs** - Notification delivery logs (id, notificationId, channel, status)

### System Tables

16. **sessions** - JWT sessions (id, userId, token, expiresAt)
17. **audit_logs** - Security audit trail (id, userId, action, resource, changes)

---

## TESTING & DEPLOYMENT

### Testing Strategy

1. **Unit Tests** - Service methods (jest)
2. **Integration Tests** - Controller → Service → Database
3. **E2E Tests** - Full API workflows

### Deployment Steps

1. Build: `npm run build`
2. Run migrations
3. Sync database schema
4. Start server: `npm start`

---

## CODING STANDARDS

### Naming Conventions

- **Files:** `kebab-case.ts` (e.g., `schools.service.ts`)
- **Classes:** `PascalCase` (e.g., `SchoolsService`)
- **Functions/Methods:** `camelCase` (e.g., `findAllSchools`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_SCHOOLS`)
- **Database Tables:** `snake_case` plural (e.g., `schools`, `user_profiles`)
- **Database Columns:** `snake_case` (e.g., `created_at`, `is_active`)

### Import Organization

```typescript
// 1. NestJS imports
import { Injectable } from '@nestjs/common';

// 2. Third-party imports
import { Sequelize } from 'sequelize-typescript';

// 3. Local imports
import { Schools } from './entities/schools.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
```

### Code Structure

```typescript
// 1. Decorators
@Injectable()
export class SchoolsService {
  // 2. Constructor with DI
  constructor(
    @Inject('SCHOOLS_REPOSITORY')
    private readonly schoolsRepository: typeof Schools,
  ) {}

  // 3. Public methods (CRUD first, then helpers)
  async create() {}
  async findAll() {}
  async findOne() {}
  async update() {}
  async delete() {}

  // 4. Private helper methods
  private validateInput() {}
  private transformResponse() {}
}
```

### Error Handling Template

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

throw new HttpException(
  {
    success: false,
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'School not found',
    errors: [],
  },
  HttpStatus.BAD_REQUEST,
);
```

### Logging Template

```typescript
import { Logger } from '@nestjs/common';

export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);

  async create(dto: CreateSchoolDto) {
    this.logger.debug(`Creating school: ${dto.name}`);
    try {
      // ... logic
      this.logger.log(`School created: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to create school: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
```

---

## SUMMARY

**Total Modules to Create:** 9

- Auth, Users, Schools, Classes, Content, Progress, Subscriptions, Devices, Notifications

**Total Files to Create:** 70+

- 9 modules × 5 files = 45 files
- Plus: 20+ DTOs, global configuration files, etc.

**Development Timeline:** 6-8 weeks

- Week 1-2: Foundation + Auth + Users + Schools
- Week 3-4: Classes + Content + Progress
- Week 5-6: Assignments + Subscriptions + Devices
- Week 7: Notifications + Testing

**Key Success Factors:**

1. Follow the 5-file module pattern strictly
2. Always create entity → provider → module → service → controller (in order)
3. Use DTOs for all requests/responses
4. Keep all queries under 200ms (use indexes)
5. Handle errors globally
6. Log important operations
7. Test each module before moving to next
8. Update app.module.ts and database.providers.ts as you go

---

**Next Step:** Review this plan. When ready, let me know which module you want to start building with (Auth, Schools, or Users), and we'll follow this plan exactly, creating each file in order.
