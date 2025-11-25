# SECURITY CHECKLIST - Complete Guide

**Question:** Is WhatsApp integration (and overall API) secure?

**Answer:** YES, but only if you follow these security practices. This document covers all security concerns.

---

## TABLE OF CONTENTS

1. [WhatsApp Security Risks & Mitigations](#whatsapp-security)
2. [API Security Risks & Mitigations](#api-security)
3. [Database Security Risks & Mitigations](#database-security)
4. [Authentication & Authorization Risks](#auth-security)
5. [Third-Party Integration Security](#third-party-security)
6. [Infrastructure Security](#infrastructure-security)
7. [Data Privacy & Compliance](#data-privacy)
8. [Security Testing Checklist](#security-testing)
9. [Monitoring & Alerts](#monitoring-alerts)
10. [Incident Response Plan](#incident-response)

---

## WHATSAPP SECURITY

### Risk 1: Twilio API Credentials Exposed ⚠️

**Risk Level:** CRITICAL

**What Can Happen:**
- Attacker gets TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
- Attacker can send unlimited WhatsApp messages on your account
- Your Twilio bill could spike to thousands of dollars
- Attacker can impersonate your service

**How to Prevent:**

#### ❌ WRONG:
```env
# NEVER hardcode in code
TWILIO_ACCOUNT_SID=AC12345678901234567890
TWILIO_AUTH_TOKEN=abc123def456ghi789jkl

// NEVER log credentials
console.log(`Twilio SID: ${process.env.TWILIO_ACCOUNT_SID}`);
```

#### ✅ CORRECT:
```env
# Only in .env file (never commit to Git)
TWILIO_ACCOUNT_SID=AC12345678901234567890
TWILIO_AUTH_TOKEN=abc123def456ghi789jkl

# .env is in .gitignore
```

**Implementation:**

```typescript
// src/config/twilio.config.ts

import { Injectable } from '@nestjs/common';

@Injectable()
export class TwilioConfig {
  readonly accountSid = process.env.TWILIO_ACCOUNT_SID;
  readonly authToken = process.env.TWILIO_AUTH_TOKEN;
  readonly whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  // Validate on startup
  validateConfig() {
    if (!this.accountSid || !this.authToken) {
      throw new Error('Missing Twilio credentials in environment variables');
    }
  }
}

// src/common/filters/exception.filter.ts
// NEVER expose credentials in error messages

@Catch()
export class AllExceptionsFilter {
  catch(exception: any, host: HttpArgumentsHost) {
    // ❌ WRONG
    // console.log(`Error: ${exception.message}`); // Might leak secrets

    // ✅ CORRECT
    // Log only safe information
    console.log(`Error occurred at ${new Date().toISOString()}`);

    // Don't expose stack trace to client
    const response = {
      success: false,
      statusCode: 500,
      message: 'Internal server error',
      // ❌ NEVER return this to client:
      // error: exception.message,
      // stack: exception.stack,
    };
  }
}
```

**Action Plan:**
- [ ] Create `.env` file (never commit to Git)
- [ ] Create `.env.example` with dummy values (commit this)
- [ ] Add `.env` to `.gitignore`
- [ ] Never hardcode secrets
- [ ] Use environment variables only
- [ ] Rotate credentials every 90 days
- [ ] Use AWS Secrets Manager or HashiCorp Vault for production

**.gitignore (example):**
```
.env
.env.local
.env.*.local
node_modules/
dist/
*.log
```

---

### Risk 2: Twilio Webhook Not Verified ⚠️

**Risk Level:** HIGH

**What Can Happen:**
- Attacker sends fake webhook to your endpoint
- Attacker updates notification status to "delivered" for unsent messages
- Your database has wrong delivery status
- You think a message was sent but it wasn't

**How to Prevent:**

**Always verify Twilio requests with Twilio Signature:**

```typescript
// src/notifications/webhook.controller.ts

import * as crypto from 'crypto';

@Controller('notifications')
export class WebhookController {
  @Post('webhook')
  @Public() // No JWT needed (Twilio can't authenticate)
  async handleTwilioWebhook(@Body() body: any, @Req() req: Request) {
    // STEP 1: Verify Twilio signature
    const isValid = this.verifyTwilioSignature(req, body);

    if (!isValid) {
      // Reject fake request
      throw new UnauthorizedException('Invalid Twilio signature');
    }

    // STEP 2: Process only if verified
    return this.notificationsService.handleDeliveryStatus(body);
  }

  private verifyTwilioSignature(req: Request, body: any): boolean {
    // Get Twilio signature from header
    const signature = req.headers['x-twilio-signature'] as string;

    if (!signature) {
      return false;
    }

    // Construct URL with full query string
    const url = `${process.env.TWILIO_WEBHOOK_URL}`; // Your webhook URL

    // Construct data from POST body
    const data = new URLSearchParams(body).toString();

    // Hash with your Auth Token
    const hash = crypto
      .createHmac('sha1', process.env.TWILIO_AUTH_TOKEN)
      .update(url + data)
      .digest('base64');

    // Compare signatures
    return hash === signature;
  }
}
```

**Action Plan:**
- [ ] Implement signature verification
- [ ] Test with invalid signature (should reject)
- [ ] Set webhook URL in Twilio console
- [ ] Use HTTPS only (not HTTP)
- [ ] Log all webhook calls for audit trail

---

### Risk 3: Phone Numbers Exposed in Logs ⚠️

**Risk Level:** MEDIUM

**What Can Happen:**
- Phone numbers end up in server logs, database logs, error messages
- Attacker scrapes logs and gets user phone numbers
- Privacy breach - phone numbers are PII (Personally Identifiable Information)
- GDPR/legal violations

**How to Prevent:**

```typescript
// src/common/utils/logger.util.ts

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerUtil {
  private logger = new Logger();

  // ❌ WRONG
  logWrongWay(phone: string, message: string) {
    this.logger.log(`Sending to ${phone}: ${message}`);
    // Result in logs: "Sending to +91XXXXXXXXXX: ..."
    // Phone number is exposed!
  }

  // ✅ CORRECT
  maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return '****';
    const start = phone.substring(0, 2);
    const end = phone.substring(phone.length - 2);
    return `${start}****${end}`;
  }

  logCorrectWay(phone: string, message: string) {
    const maskedPhone = this.maskPhone(phone);
    this.logger.log(`Sending to ${maskedPhone}: message sent`);
    // Result in logs: "Sending to +1****XX: message sent"
    // Phone number is masked!
  }

  maskSensitiveData(data: any) {
    return {
      ...data,
      phone: this.maskPhone(data.phone),
      email: data.email?.replace(/^(.)(.*)(.@.*)$/, '$1****$3'), // m****@example.com
      password: '****',
      // Keep only safe fields
    };
  }
}

// Usage in WhatsApp Service
@Injectable()
export class WhatsAppService {
  constructor(private logger: LoggerUtil) {}

  async sendMessage(phoneNumber: string, message: string) {
    const maskedPhone = this.logger.maskPhone(phoneNumber);
    this.logger.log(`Sending WhatsApp to ${maskedPhone}`);

    try {
      const result = await this.client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${phoneNumber}`, // Real phone in actual request
        body: message,
      });

      this.logger.log(`Message sent to ${maskedPhone}, SID: ${result.sid}`);
      return result;
    } catch (error) {
      // ❌ WRONG: this.logger.error(`Failed to send to ${phoneNumber}`);
      // ✅ CORRECT:
      this.logger.error(`Failed to send to ${maskedPhone}`, error.message);
      throw error;
    }
  }
}
```

**Action Plan:**
- [ ] Implement phone masking in all logs
- [ ] Never log full phone numbers
- [ ] Never log passwords, tokens
- [ ] Review existing logs for exposed data
- [ ] Set up log retention policy (delete after 30 days)
- [ ] Encrypt sensitive data in database

---

### Risk 4: Rate Limiting on WhatsApp Sending ⚠️

**Risk Level:** MEDIUM

**What Can Happen:**
- Attacker triggers notifications for all users
- Twilio account gets rate-limited
- Messages don't send
- User experience degrades
- Bill increases

**How to Prevent:**

```typescript
// src/notifications/services/whatsapp.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class WhatsAppService {
  // Rate limits
  private readonly MAX_MESSAGES_PER_HOUR = 1000; // Per account
  private readonly MAX_MESSAGES_PER_USER_PER_DAY = 10; // Per user
  private readonly MESSAGE_QUEUE_DELAY = 1000; // 1 second delay between messages

  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private logger: LoggerUtil
  ) {}

  async sendMessage(phoneNumber: string, message: string, userId: number) {
    // Check rate limits
    await this.checkRateLimits(userId);

    try {
      // Send with delay to avoid rate limiting
      await this.delay(this.MESSAGE_QUEUE_DELAY);

      const result = await this.client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${phoneNumber}`,
        body: message,
      });

      // Increment counter
      await this.incrementUserMessageCount(userId);

      return result;
    } catch (error) {
      if (error.status === 429) {
        // Twilio is rate limiting
        throw new BadRequestException('Too many messages, please try again later');
      }
      throw error;
    }
  }

  private async checkRateLimits(userId: number) {
    // Check user's message count today
    const userKey = `whatsapp:user:${userId}:today`;
    const userCount = await this.cache.get(userKey) || 0;

    if (userCount >= this.MAX_MESSAGES_PER_USER_PER_DAY) {
      throw new BadRequestException(
        `User limit reached: max ${this.MAX_MESSAGES_PER_USER_PER_DAY} messages per day`
      );
    }

    // Check account's total message count per hour
    const accountKey = 'whatsapp:account:hour';
    const accountCount = await this.cache.get(accountKey) || 0;

    if (accountCount >= this.MAX_MESSAGES_PER_HOUR) {
      throw new BadRequestException(
        'Account rate limit reached, please try again later'
      );
    }
  }

  private async incrementUserMessageCount(userId: number) {
    const key = `whatsapp:user:${userId}:today`;
    const count = (await this.cache.get(key) || 0) + 1;
    await this.cache.set(key, count, 24 * 60 * 60 * 1000); // 24 hour expiry
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Action Plan:**
- [ ] Set rate limits per user per day (10 messages)
- [ ] Set rate limits per account per hour (1000 messages)
- [ ] Use Redis for rate limit tracking
- [ ] Add delay between messages (1 second)
- [ ] Monitor Twilio usage in real-time
- [ ] Set Twilio account rate limits

---

## API SECURITY

### Risk 5: SQL Injection ⚠️

**Risk Level:** CRITICAL

**What Can Happen:**
- Attacker injects SQL code in request
- Attacker can read/modify/delete database
- Complete data breach
- System compromise

**How to Prevent:**

#### ❌ WRONG - Never use string concatenation:
```typescript
// NEVER DO THIS
const phoneNumber = req.body.phone; // "+91'; DROP TABLE users; --"
const query = `SELECT * FROM users WHERE phone = '${phoneNumber}'`;
// Result: SELECT * FROM users WHERE phone = '+91'; DROP TABLE users; --'
// This DROPS the entire users table!
```

#### ✅ CORRECT - Use parameterized queries:
```typescript
// Use Sequelize (already uses parameterized queries)
const user = await User.findOne({
  where: {
    phone: phoneNumber, // Safe - parameterized
  },
});

// Or with raw queries (if absolutely necessary):
const user = await sequelize.query(
  'SELECT * FROM users WHERE phone = ?',
  {
    replacements: [phoneNumber], // Parameters safe
    type: QueryTypes.SELECT,
  }
);
```

**Action Plan:**
- [ ] Use Sequelize ORM (already parameterized)
- [ ] Never use raw SQL string concatenation
- [ ] Validate input types and lengths
- [ ] Use class-validator for input validation
- [ ] Implement Web Application Firewall (WAF)

---

### Risk 6: XSS (Cross-Site Scripting) ⚠️

**Risk Level:** HIGH

**What Can Happen:**
- Attacker injects JavaScript in request
- JavaScript runs in other users' browsers
- Steal session cookies, tokens
- Redirect users to phishing sites
- Steal personal data

**How to Prevent:**

#### ❌ WRONG - Never trust user input:
```html
<!-- Frontend - WRONG -->
<div>${userMessage}</div>
<!-- If userMessage = "<img src=x onerror='alert(document.cookie)'>",
     the script runs when HTML is rendered! -->
```

#### ✅ CORRECT - Sanitize and escape:

**Backend:**
```typescript
// src/common/pipes/sanitization.pipe.ts
import * as xss from 'xss';
import * as mongoSanitize from 'express-mongo-sanitize';

// In main.ts
app.use(mongoSanitize()); // Sanitize MongoDB operators
app.use(xss()); // Sanitize XSS

// Or custom sanitization
export class SanitizationPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') {
      return xss(value); // Remove dangerous HTML
    }
    return value;
  }
}
```

**Frontend:**
```typescript
// Use framework's built-in escaping
// Angular: {{ message }} - auto-escapes
// React: {message} - auto-escapes
// Vue: {{ message }} - auto-escapes

// Never use innerHTML with user data
// ❌ Wrong: element.innerHTML = userMessage;
// ✅ Correct: element.textContent = userMessage;
```

**Action Plan:**
- [ ] Install xss package
- [ ] Add sanitization middleware
- [ ] Use framework's built-in escaping
- [ ] Never use innerHTML with user data
- [ ] Validate input types and formats
- [ ] Implement Content Security Policy (CSP)

---

### Risk 7: CSRF (Cross-Site Request Forgery) ⚠️

**Risk Level:** MEDIUM

**What Can Happen:**
- Attacker tricks user into clicking malicious link
- User's browser makes unwanted request to your server
- User doesn't know what's happening
- Attacker can delete data, change settings, etc.

**How to Prevent:**

```typescript
// src/common/middleware/csrf.middleware.ts

import { Injectable } from '@nestjs/common';
import { NestMiddleware } from '@nestjs/common';
import * as csrf from 'csurf';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private csrfProtection = csrf({ cookie: true });

  use(req: Request, res: Response, next: NextFunction) {
    this.csrfProtection(req, res, next);
  }
}

// In main.ts
import * as cookieParser from 'cookie-parser';

app.use(cookieParser()); // Required for CSRF
app.use(new CsrfMiddleware());

// In controller - return CSRF token on login
@Post('login')
async login(@Res() res: Response) {
  const token = req.csrfToken();
  res.json({
    token: token, // Return CSRF token
  });
}

// Frontend must include CSRF token in requests
// Fetch request with CSRF token
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken, // Include CSRF token
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

**Action Plan:**
- [ ] Install csurf package
- [ ] Add CSRF middleware in main.ts
- [ ] Return CSRF token on login
- [ ] Require CSRF token on state-changing operations (POST, PUT, DELETE)
- [ ] Store CSRF token securely (httpOnly cookie or localStorage)

---

### Risk 8: Broken Authentication ⚠️

**Risk Level:** CRITICAL

**What Can Happen:**
- Attacker bypasses authentication
- Attacker accesses other users' data
- Unauthorized data modification
- Complete account takeover

**How to Prevent:**

```typescript
// src/auth/auth.service.ts

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async login(email: string, password: string) {
    // STEP 1: Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // ❌ WRONG: throw new Error(`User ${email} not found`);
      // This tells attacker if email exists!

      // ✅ CORRECT: Generic message
      throw new BadRequestException('Invalid email or password');
    }

    // STEP 2: Validate password (always check)
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // ❌ WRONG: throw new Error('Password incorrect');
      // ✅ CORRECT: Same generic message
      throw new BadRequestException('Invalid email or password');
    }

    // STEP 3: Check if account is active
    if (!user.isActive) {
      throw new ForbiddenException('Account is disabled');
    }

    // STEP 4: Check for account lockout (brute force protection)
    const failedAttempts = await this.getFailedLoginAttempts(user.id);
    if (failedAttempts >= 5) {
      throw new TooManyRequestsException(
        'Too many failed login attempts. Account locked for 30 minutes.'
      );
    }

    // STEP 5: Generate JWT tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // STEP 6: Store refresh token in database (secure)
    await this.storeRefreshToken(user.id, refreshToken);

    // STEP 7: Return tokens
    return {
      accessToken, // Short-lived (15 minutes)
      refreshToken, // Long-lived (7 days)
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  private generateAccessToken(user: User): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles,
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRY || '15m', // Short expiry
        algorithm: 'HS256',
      }
    );
  }

  private generateRefreshToken(user: User): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh', // Mark as refresh token
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
        algorithm: 'HS256',
      }
    );
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    // STEP 1: Validate refresh token
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // STEP 2: Check if refresh token exists in database (revoke control)
      const stored = await this.getStoredRefreshToken(payload.sub);
      if (!stored || stored.token !== refreshToken) {
        throw new UnauthorizedException('Refresh token invalid or revoked');
      }

      // STEP 3: Generate new access token
      const user = await this.usersService.findById(payload.sub);
      return this.generateAccessToken(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: number, refreshToken: string) {
    // STEP 1: Revoke refresh token
    await this.revokeRefreshToken(userId, refreshToken);

    // STEP 2: Clear client-side tokens (frontend responsibility)
    return { message: 'Logged out successfully' };
  }
}
```

**Action Plan:**
- [ ] Use bcrypt for password hashing (10+ rounds)
- [ ] Generate strong JWT (32+ character secret)
- [ ] Use short expiry for access token (15 minutes)
- [ ] Use longer expiry for refresh token (7 days)
- [ ] Store refresh tokens in database (for revocation)
- [ ] Implement account lockout after 5 failed attempts
- [ ] Lock for 30 minutes
- [ ] Send email alerts on suspicious logins
- [ ] Implement MFA (Multi-Factor Authentication)
- [ ] Never expose if user exists or not

---

### Risk 9: Insecure Direct Object References (IDOR) ⚠️

**Risk Level:** HIGH

**What Can Happen:**
- Attacker changes ID in request to access other users' data
- Attacker can read/modify other users' records
- Privacy breach
- Data theft

**How to Prevent:**

#### ❌ WRONG - Trust user input:
```typescript
@Get(':id')
async findOne(@Param('id') id: number) {
  // User 1 requests GET /schools/5
  // Attacker requests GET /schools/999 (not their school)
  // If no check, attacker gets school 999's data!
  return this.schoolsService.findOne(id);
}
```

#### ✅ CORRECT - Verify ownership:
```typescript
@Get(':id')
@UseGuards(JwtGuard)
async findOne(
  @Param('id') id: number,
  @Req() req: Request // Get current user from JWT
) {
  // Get current user from JWT
  const currentUserId = req.user.id;

  // Find the resource
  const school = await this.schoolsService.findOne(id);

  // Verify ownership
  if (school.adminId !== currentUserId) {
    throw new ForbiddenException('You do not have access to this school');
  }

  return school;
}

// Or in service
async findOne(id: number, userId: number) {
  const school = await this.schoolsRepository.findOne({
    where: {
      id,
      adminId: userId, // Only return if belongs to this user
    },
  });

  if (!school) {
    throw new NotFoundException('School not found');
  }

  return school;
}
```

**Action Plan:**
- [ ] Always verify resource ownership
- [ ] Check user's roles/permissions
- [ ] Use resource IDs from authenticated context
- [ ] Never trust URL parameters alone
- [ ] Test with different user accounts

---

## DATABASE SECURITY

### Risk 10: Unencrypted Sensitive Data ⚠️

**Risk Level:** HIGH

**What Can Happen:**
- Database breach exposes phone numbers, emails
- Attacker can use phone numbers for SIM swapping
- Attacker can spam or phish users
- GDPR violations

**How to Prevent:**

```typescript
// src/users/entities/users.entity.ts

import * as crypto from 'crypto';

@Table
export class Users extends Model {
  @Column
  email: string;

  @Column
  passwordHash: string; // Never store plain password

  // Encrypt phone number
  private encryptionKey = process.env.ENCRYPTION_KEY; // 32 character key

  @Column(DataType.TEXT)
  encryptedPhone: string; // Store encrypted

  get phone(): string {
    if (!this.encryptedPhone) return null;
    // Decrypt on retrieval
    return this.decrypt(this.encryptedPhone);
  }

  set phone(value: string) {
    this.encryptedPhone = this.encrypt(value);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey),
      iv
    );
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey),
      iv
    );
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

**Action Plan:**
- [ ] Encrypt phone numbers in database
- [ ] Encrypt SSN, ID proofs
- [ ] Use AES-256 encryption
- [ ] Store encryption key in AWS Secrets Manager
- [ ] Hash passwords with bcrypt (one-way encryption)
- [ ] Never store credit card numbers (use Razorpay tokens)
- [ ] Enable database encryption at rest (PostgreSQL)
- [ ] Use SSL/TLS for database connections

---

### Risk 11: No Audit Trail ⚠️

**Risk Level:** MEDIUM

**What Can Happen:**
- Attacker deletes data with no trace
- You can't investigate security incidents
- No proof of who did what
- Compliance violations (GDPR requires audit trail)

**How to Prevent:**

```typescript
// src/common/decorators/audit.decorator.ts

export const Audit = (action: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const user = this.getCurrentUser(); // Get from JWT
      const result = await originalMethod.apply(this, args);

      // Log the action
      await AuditLog.create({
        userId: user.id,
        action, // 'CREATE_SCHOOL', 'UPDATE_USER', 'DELETE_CLASS'
        resource: propertyKey, // 'schools', 'users', 'classes'
        resourceId: result?.id,
        changes: JSON.stringify(result),
        timestamp: new Date(),
        ipAddress: this.req.ip,
        userAgent: this.req.get('user-agent'),
      });

      return result;
    };

    return descriptor;
  };
};

// Usage
@Injectable()
export class SchoolsService {
  @Audit('CREATE_SCHOOL')
  async create(dto: CreateSchoolDto) {
    return this.schoolsRepository.create(dto);
  }

  @Audit('UPDATE_SCHOOL')
  async update(id: number, dto: UpdateSchoolDto) {
    return this.schoolsRepository.update(dto, { where: { id } });
  }

  @Audit('DELETE_SCHOOL')
  async delete(id: number) {
    return this.schoolsRepository.destroy({ where: { id } });
  }
}
```

**Action Plan:**
- [ ] Create audit_logs table
- [ ] Log all CRUD operations
- [ ] Include: user, action, resource, changes, timestamp, IP
- [ ] Keep audit logs for 1+ years
- [ ] Make audit logs immutable (never delete)
- [ ] Review logs regularly

---

## AUTHENTICATION & AUTHORIZATION SECURITY

### Risk 12: Weak JWT Secrets ⚠️

**Risk Level:** CRITICAL

**What Can Happen:**
- Attacker cracks JWT secret
- Attacker can forge JWTs for any user
- Attacker can impersonate users
- Complete authentication bypass

**How to Prevent:**

#### ❌ WRONG:
```env
# Weak secrets
JWT_SECRET=password
JWT_SECRET=12345678
JWT_SECRET=secret
```

#### ✅ CORRECT:
```env
# Strong secrets (32+ characters, random)
JWT_SECRET=aKxWp9mL2nQ7rT4sU6vY8zB1cD3eF5gH7jK9lM0nO2pQ4rS
JWT_REFRESH_SECRET=bLyXq0nR3oPv8wS5tU7xY9zA2cE4gF6hI8jL1mN3pO5rQ7sT
```

**Action Plan:**
- [ ] Generate secrets with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Use 32+ characters
- [ ] Rotate secrets annually
- [ ] Store in AWS Secrets Manager (not in .env)
- [ ] Different secrets for different environments (dev, staging, prod)

---

### Risk 13: No Role-Based Access Control ⚠️

**Risk Level:** HIGH

**What Can Happen:**
- Regular users can access admin functions
- Users can modify other users' data
- Users can delete accounts, content
- Authorization bypass

**How to Prevent:**

```typescript
// src/common/decorators/roles.decorator.ts

export const Roles = (...roles: string[]) => {
  return Reflect.metadata('roles', roles);
};

// src/common/guards/roles.guard.ts

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No role required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JWT

    if (!user || !user.roles) {
      throw new ForbiddenException('User has no roles');
    }

    const hasRole = requiredRoles.some(role => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `This action requires one of these roles: ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }
}

// Usage
@Controller('schools')
export class SchoolsController {
  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin') // Only admin can create
  async create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto);
  }

  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superadmin') // Admin or superadmin can delete
  async delete(@Param('id') id: number) {
    return this.schoolsService.delete(id);
  }

  @Get(':id')
  @UseGuards(JwtGuard) // Any authenticated user
  async findOne(@Param('id') id: number) {
    return this.schoolsService.findOne(id);
  }

  @Post('register')
  @Public() // No authentication needed
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
```

**Action Plan:**
- [ ] Define roles: admin, teacher, student, superadmin
- [ ] Implement RolesGuard
- [ ] Use @Roles decorator on protected routes
- [ ] Validate roles on every request
- [ ] Test with different user roles

---

## THIRD-PARTY INTEGRATION SECURITY

### Risk 14: Twilio Integration Vulnerabilities ⚠️

**Risk Level:** MEDIUM

**What Can Happen:**
- Twilio account compromised
- Attacker sends messages on your behalf
- Your Twilio bill increases drastically
- Service reputation damaged

**How to Prevent:**

```typescript
// src/notifications/services/whatsapp.service.ts

@Injectable()
export class WhatsAppService {
  private client;

  constructor(
    private config: TwilioConfig,
    private logger: LoggerUtil,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {
    // Validate config on initialization
    this.config.validateConfig();

    // Create Twilio client
    this.client = twilio(
      this.config.accountSid,
      this.config.authToken
    );
  }

  async sendMessage(phoneNumber: string, message: string): Promise<any> {
    // SECURITY CHECK 1: Validate phone format
    if (!this.isValidPhoneNumber(phoneNumber)) {
      throw new BadRequestException('Invalid phone number format');
    }

    // SECURITY CHECK 2: Validate message length
    if (message.length > 1600) {
      throw new BadRequestException('Message too long (max 1600 chars)');
    }

    // SECURITY CHECK 3: Check rate limits
    const userKey = `whatsapp:${phoneNumber}:day`;
    const count = await this.cache.get(userKey) || 0;
    if (count >= 10) {
      throw new BadRequestException('User message limit reached');
    }

    // SECURITY CHECK 4: Sanitize message (no dangerous content)
    const sanitizedMessage = this.sanitizeMessage(message);

    try {
      const result = await this.client.messages.create({
        from: this.config.whatsappNumber,
        to: `whatsapp:${phoneNumber}`,
        body: sanitizedMessage,
      });

      // SECURITY CHECK 5: Log with masked phone
      const maskedPhone = this.logger.maskPhone(phoneNumber);
      this.logger.log(`WhatsApp sent to ${maskedPhone}, SID: ${result.sid}`);

      // SECURITY CHECK 6: Increment rate limit counter
      await this.cache.set(userKey, (count + 1), 24 * 60 * 60 * 1000);

      return result;
    } catch (error) {
      this.logger.error(`Twilio error: ${error.message}`);

      // SECURITY CHECK 7: Handle specific Twilio errors
      if (error.code === 21608) {
        // Invalid phone number in Twilio system
        throw new BadRequestException('Phone number not supported');
      }
      if (error.code === 21610) {
        // Account suspended
        throw new ServiceUnavailableException('WhatsApp service temporarily unavailable');
      }

      throw new InternalServerErrorException('Failed to send message');
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Valid format: +91XXXXXXXXXX or +1XXXXXXXXXX
    return /^\+\d{1,3}\d{9,14}$/.test(phone);
  }

  private sanitizeMessage(message: string): string {
    // Remove dangerous characters
    return message
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/\n\n\n+/g, '\n\n') // Limit newlines
      .trim();
  }
}
```

**Action Plan:**
- [ ] Validate phone numbers before sending
- [ ] Validate message content
- [ ] Implement rate limiting
- [ ] Monitor Twilio usage and costs
- [ ] Set up Twilio webhook signature verification
- [ ] Rotate Twilio credentials periodically
- [ ] Use Twilio account alerts
- [ ] Implement fallback to email if WhatsApp fails

---

### Risk 15: Razorpay Payment Integration Vulnerabilities ⚠️

**Risk Level:** CRITICAL

**What Can Happen:**
- Attacker bypasses payment
- Attacker gets free premium subscription
- Revenue loss
- Payment fraud

**How to Prevent:**

```typescript
// src/subscriptions/services/razorpay.service.ts

@Injectable()
export class RazorpayService {
  private client;

  constructor() {
    this.client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });
  }

  async createOrder(amount: number, userId: number): Promise<any> {
    // SECURITY CHECK 1: Validate amount
    if (amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    try {
      const order = await this.client.orders.create({
        amount: Math.round(amount * 100), // Razorpay expects paise
        currency: 'INR',
        receipt: `order_${userId}_${Date.now()}`,
        notes: {
          userId,
          // Never include sensitive data here
        },
      });

      return order;
    } catch (error) {
      throw new InternalServerErrorException('Failed to create order');
    }
  }

  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
    userId: number
  ): Promise<boolean> {
    // SECURITY CHECK 1: Verify signature
    // This ensures the payment actually came from Razorpay
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      // ⚠️ IMPORTANT: This payment is fake!
      this.logger.error(
        `Signature mismatch for user ${userId}. Payment ${paymentId} rejected.`
      );
      throw new BadRequestException('Payment verification failed');
    }

    // SECURITY CHECK 2: Fetch payment from Razorpay (verify it's real)
    try {
      const payment = await this.client.payments.fetch(paymentId);

      // SECURITY CHECK 3: Verify amount is correct
      if (payment.amount !== expectedAmount * 100) {
        throw new BadRequestException('Payment amount mismatch');
      }

      // SECURITY CHECK 4: Verify payment status
      if (payment.status !== 'captured') {
        throw new BadRequestException('Payment not captured');
      }

      // SECURITY CHECK 5: Verify order exists and matches
      const order = await this.client.orders.fetch(orderId);
      if (order.user_id !== userId) {
        throw new ForbiddenException('Payment does not belong to this user');
      }

      return true;
    } catch (error) {
      this.logger.error(`Razorpay verification error: ${error.message}`);
      throw new InternalServerErrorException('Payment verification failed');
    }
  }

  async updateSubscription(userId: number, planId: string): Promise<void> {
    // Only after verified payment
    await Subscriptions.update(
      {
        status: 'active',
        planId,
        startDate: new Date(),
      },
      {
        where: { userId },
      }
    );
  }
}

// Usage in controller
@Post('payments/verify')
@UseGuards(JwtGuard)
async verifyPayment(
  @Body() dto: VerifyPaymentDto,
  @Req() req: Request
) {
  const userId = req.user.id;

  // Verify payment with Razorpay
  const isValid = await this.razorpayService.verifyPayment(
    dto.orderId,
    dto.paymentId,
    dto.signature,
    userId
  );

  if (!isValid) {
    throw new BadRequestException('Payment verification failed');
  }

  // ONLY then update subscription
  await this.razorpayService.updateSubscription(userId, dto.planId);

  return { message: 'Payment successful' };
}
```

**Action Plan:**
- [ ] Verify Razorpay signature on every payment
- [ ] Fetch payment from Razorpay to verify it's real
- [ ] Check payment amount matches order
- [ ] Check payment status is "captured"
- [ ] Store payment details in database
- [ ] Never give subscription without verified payment
- [ ] Store Razorpay credentials in AWS Secrets Manager
- [ ] Monitor for payment fraud
- [ ] Implement PCI compliance (don't store card numbers)

---

## INFRASTRUCTURE SECURITY

### Risk 16: No HTTPS ⚠️

**Risk Level:** CRITICAL

**What Can Happen:**
- Attacker intercepts traffic
- Attacker steals JWTs, credentials
- Attacker modifies requests
- MITM (Man-in-the-Middle) attacks

**How to Prevent:**

```typescript
// main.ts

// Enable HTTPS in production
const httpsOptions = process.env.NODE_ENV === 'production' ? {
  key: fs.readFileSync('./certs/private-key.pem'),
  cert: fs.readFileSync('./certs/certificate.pem'),
} : undefined;

const app = await NestFactory.create(AppModule, {
  httpsOptions,
});

// Or use proxy (recommended)
// Deploy on Nginx with SSL certificate
// Nginx handles HTTPS, proxies to Node.js on localhost
```

**Action Plan:**
- [ ] Use HTTPS in production (SSL/TLS certificate)
- [ ] Get free certificate from Let's Encrypt
- [ ] Use Nginx/Apache as reverse proxy
- [ ] Enable HSTS (HTTP Strict Transport Security)
- [ ] Redirect HTTP to HTTPS

---

### Risk 17: No Rate Limiting ⚠️

**Risk Level:** HIGH

**What Can Happen:**
- Attacker brute forces passwords
- Attacker performs DDoS attacks
- Attacker scrapes data
- Service goes down

**How to Prevent:**

```typescript
// main.ts

import { ThrottlerModule } from '@nestjs/throttler';

// In AppModule
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 15 * 60 * 1000, // 15 minutes
        limit: 100, // 100 requests per 15 minutes globally
      },
    ]),
  ],
})
export class AppModule {}

// For specific endpoints
@Controller('auth')
export class AuthController {
  @Post('login')
  @UseGuards(ThrottleGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  // Max 5 login attempts per 15 minutes
  async login(@Body() dto: LoginDto) {
    // ...
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } })
  // Max 3 requests per hour
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    // ...
  }
}
```

**Action Plan:**
- [ ] Set global rate limit: 100 req/15min per IP
- [ ] Set login rate limit: 5 attempts/15min per user
- [ ] Set password reset limit: 3 attempts/hour per user
- [ ] Use Redis for distributed rate limiting
- [ ] Monitor rate limit breaches
- [ ] Block IPs that exceed limits

---

## DATA PRIVACY & COMPLIANCE

### Risk 18: GDPR Violations ⚠️

**Risk Level:** CRITICAL

**What Can Happen:**
- Legal fines (up to 4% of global revenue)
- Account suspension
- Reputation damage
- User lawsuits

**How to Prevent:**

```typescript
// Implement these features:

// 1. Right to Access - Users can download their data
@Get('my-data')
@UseGuards(JwtGuard)
async downloadMyData(@Req() req: Request) {
  const userId = req.user.id;
  const data = await this.userService.exportUserData(userId);
  // Return as JSON file
}

// 2. Right to be Forgotten - Users can delete their account
@Delete('my-account')
@UseGuards(JwtGuard)
async deleteAccount(@Req() req: Request) {
  const userId = req.user.id;
  // Delete all user data
  await this.userService.deleteAllUserData(userId);
  // Keep only: audit logs, payment records (legal requirement)
}

// 3. Consent Management - Track user consents
@Table
export class Consents extends Model {
  @Column
  userId: number;

  @Column
  consentType: string; // 'marketing', 'data_sharing', 'cookies'

  @Column
  isGiven: boolean;

  @Column
  givenAt: Date;

  @Column
  expiredAt: Date; // 2 year expiry
}

// 4. Data Processing Agreement - Sign DPA with all vendors
// Twilio DPA: https://www.twilio.com/legal/dpa
// SendGrid DPA: https://sendgrid.com/legal/dpa

// 5. Privacy Policy - Have a clear privacy policy
// 6. Terms of Service - Have clear terms
// 7. Consent on signup - Ask for consent explicitly
```

**Action Plan:**
- [ ] Create Privacy Policy page
- [ ] Create Terms of Service page
- [ ] Get explicit consent on signup
- [ ] Allow users to download their data
- [ ] Allow users to delete their account
- [ ] Keep audit logs for 3 years
- [ ] Sign DPAs with all vendors (Twilio, SendGrid, Razorpay)
- [ ] Implement data expiry (delete old data after 2 years)

---

## SECURITY TESTING CHECKLIST

Use this checklist to test your implementation:

### Authentication Tests
- [ ] Login with correct credentials → 200 OK
- [ ] Login with wrong password → 401 Unauthorized (generic message)
- [ ] Login with wrong email → 401 Unauthorized (generic message)
- [ ] 6 failed login attempts → Account locked for 30 min
- [ ] Expired JWT → 401 Unauthorized
- [ ] Invalid JWT → 401 Unauthorized
- [ ] No JWT → 401 Unauthorized
- [ ] Refresh token expired → 401 Unauthorized
- [ ] Refresh token revoked (after logout) → 401 Unauthorized

### Authorization Tests
- [ ] Admin route without admin role → 403 Forbidden
- [ ] User route as admin → 200 OK
- [ ] Delete other user's data → 403 Forbidden
- [ ] Access other user's school → 403 Forbidden

### Input Validation Tests
- [ ] Empty string in name field → 400 Bad Request
- [ ] Email without @ → 400 Bad Request
- [ ] Phone with invalid format → 400 Bad Request
- [ ] XSS payload in message → Stripped/escaped
- [ ] SQL injection in email → Parameterized query prevents it
- [ ] Very long input (>1000 chars) → Truncated or rejected

### Rate Limiting Tests
- [ ] 101 requests in 15 minutes → 429 Too Many Requests
- [ ] 6 login attempts in 15 minutes → Account locked
- [ ] 4 password reset attempts in 1 hour → 429 Too Many Requests

### Twilio Tests
- [ ] Send WhatsApp with valid phone → Message queued
- [ ] Send WhatsApp with invalid phone → 400 Bad Request
- [ ] Fake Twilio webhook → 401 Unauthorized
- [ ] Real Twilio webhook → Delivery status updated

### CSRF Tests
- [ ] POST without CSRF token → 403 Forbidden
- [ ] POST with valid CSRF token → 200 OK
- [ ] CSRF token from different origin → 403 Forbidden

### Database Tests
- [ ] Phone numbers encrypted in database → Yes (select phone column shows encrypted)
- [ ] Passwords hashed (not plain) → Yes
- [ ] Passwords not logged → Check logs (should not contain passwords)
- [ ] Phone not logged (masked) → Check logs (should be masked like +1****XX)

### HTTPS Tests
- [ ] Access http://... → Redirected to https://...
- [ ] HSTS header present → Yes (check response headers)
- [ ] Certificate valid → Yes (no browser warnings)

---

## MONITORING & ALERTS

### Set Up Alerts For:

1. **Failed Login Attempts**
   - Alert when: 3+ failed attempts in 5 minutes
   - Action: Lock account, notify user

2. **Unusual Activity**
   - Alert when: User logs in from new location
   - Alert when: User's IP country changes in < 1 hour
   - Action: Send verification email

3. **API Errors**
   - Alert when: Error rate > 1%
   - Alert when: Database connection fails
   - Action: Page on-call engineer

4. **Security Events**
   - Alert when: SQL injection attempt detected
   - Alert when: Webhook signature verification fails
   - Alert when: Rate limit breached by same IP

5. **Twilio Issues**
   - Alert when: Message delivery fails
   - Alert when: Twilio account reaches 90% usage
   - Action: Scale up limits

6. **Database Issues**
   - Alert when: Slow queries (> 1s)
   - Alert when: Connection pool exhausted
   - Action: Optimize or scale

---

## INCIDENT RESPONSE PLAN

**If Security Incident Occurs:**

1. **Immediately:**
   - [ ] Disable compromised account
   - [ ] Revoke all active tokens
   - [ ] Stop all API access if needed

2. **Within 1 hour:**
   - [ ] Investigate root cause
   - [ ] Determine what data was exposed
   - [ ] Notify affected users

3. **Within 24 hours:**
   - [ ] Deploy fix/patch
   - [ ] Update credentials (Twilio, Razorpay, JWT secrets)
   - [ ] Notify data protection authority (GDPR requires within 72 hours)

4. **Follow-up:**
   - [ ] Post-mortem analysis
   - [ ] Update security procedures
   - [ ] Security audit
   - [ ] Staff training

---

## SECURITY SUMMARY

### Critical Risks (Must Fix Before Production)
1. ❌ Hardcoded secrets → ✅ Use .env file
2. ❌ No JWT verification → ✅ Use JwtGuard
3. ❌ No HTTPS → ✅ Use SSL certificate
4. ❌ No Twilio signature verification → ✅ Verify signatures
5. ❌ No Razorpay signature verification → ✅ Verify signatures
6. ❌ No rate limiting → ✅ Implement rate limits
7. ❌ SQL injection risk → ✅ Use Sequelize (parameterized)
8. ❌ No RBAC → ✅ Implement RolesGuard
9. ❌ No CSRF protection → ✅ Implement CSRF middleware
10. ❌ Exposed phone numbers → ✅ Encrypt and mask

### High Risks (Fix Before Going Live)
- [ ] No input sanitization → Add sanitization pipe
- [ ] No exception filtering → Add global exception filter
- [ ] No logging → Add Winston logger
- [ ] No audit trail → Add audit logs table
- [ ] No account lockout → Add after 5 failed attempts
- [ ] Weak JWT secrets → Use 32+ character secrets
- [ ] No CORS restriction → Whitelist origins
- [ ] No HSTS headers → Enable via Helmet

### Medium Risks (Fix Within 1 Month)
- [ ] No MFA → Add TOTP
- [ ] No webhook retries → Add job retries
- [ ] No monitoring → Set up alerts
- [ ] No backup → Set up database backups
- [ ] No rate limiting on webhooks → Add rate limiting

---

**Next Steps:**

1. Review this security checklist
2. Implement the critical 10 security measures
3. Run the security testing checklist
4. Do a security audit before production
5. Have a lawyer review Privacy Policy and Terms

Ready to start implementation? 🔒
