# Rate Limiting & Brute Force Protection Guide

## Problem Statement
A hacker tries to login 20 times in 1 minute. Without rate limiting, they could crack your password through brute force attacks. This guide explains how the system blocks such attacks.

---

## Solution: 3-Layer Rate Limiting Strategy

### Layer 1: Global Rate Limiter (All Requests)
**File**: `src/common/middleware/rate-limit.middleware.ts`

**Configuration**:
```
- Limit: 100 requests per 15 minutes per IP
- Applies to: All non-GET requests (POST, PUT, PATCH, DELETE)
- Purpose: Prevent general DoS attacks
- Skip: GET requests (read-only operations)
```

**How it works**:
1. User's IP address is extracted from request headers
2. System tracks number of requests from that IP in 15-minute window
3. After 100 requests, all subsequent requests are blocked for 15 minutes
4. Each minute that passes, the counter resets for that window

**Example**:
```
Time 00:00 - Request 1 ✅
Time 00:15 - Request 50 ✅
Time 00:30 - Request 100 ✅ (limit reached)
Time 00:31 - Request 101 ❌ (BLOCKED: "Too many requests")
Time 15:00 - Request 101 ✅ (new 15-min window starts)
```

---

### Layer 2: Login Rate Limiter (Login Endpoint)
**File**: `src/common/middleware/rate-limit.middleware.ts`
**Applied in**: `src/auth/auth.module.ts`

**Configuration**:
```
Endpoint: POST /auth/login
Limit: 5 attempts per 5 minutes per IP
Purpose: Prevent brute force password guessing
Counts: Only failed attempts (successful logins don't count)
```

**How it blocks 20 attempts in 1 minute**:
```
TIME        | ATTEMPT | STATUS | REASON
00:00       | 1       | ✅     | Allowed
00:10       | 2       | ✅     | Allowed
00:20       | 3       | ✅     | Allowed
00:30       | 4       | ✅     | Allowed
00:40       | 5       | ✅     | Allowed (limit reached)
00:50       | 6       | ❌     | BLOCKED (too many attempts)
01:00       | 7       | ❌     | BLOCKED
02:00       | 8       | ❌     | BLOCKED (still in 5-min window)
05:01       | 9       | ✅     | Allowed (new 5-min window)
```

**Response when blocked**:
```json
{
  "statusCode": 429,
  "message": "Too many login attempts from this IP, please try again after 5 minutes.",
  "error": "Too Many Requests"
}
```

---

### Layer 3: Account Lockout (Per User)
**File**: `src/auth/auth.service.ts`

**Configuration**:
```
- Limit: 5 failed login attempts
- Lockout duration: 30 minutes
- Purpose: Protect individual user accounts
- Blocks: All login attempts for that user account
```

**How it works**:
```
LOGIN ATTEMPT | PASSWORD CORRECT | FAILED ATTEMPTS | ACCOUNT STATUS
1             | ❌               | 1               | 🟢 Active
2             | ❌               | 2               | 🟢 Active
3             | ❌               | 3               | 🟢 Active
4             | ❌               | 4               | 🟢 Active
5             | ❌               | 5               | 🔴 LOCKED (30 min)
6             | ✅ (correct)     | 5               | 🔴 LOCKED (account locked, no access)
After 30 min  | ✅ (correct)     | 0 (reset)       | 🟢 Active
```

---

## Combined Security Flow

When a hacker tries to login 20 times in 1 minute:

```
REQUEST 1  (00:00) → Rate Limit Check ✅ → Login Service → Failed Attempt (1/5)
REQUEST 2  (00:03) → Rate Limit Check ✅ → Login Service → Failed Attempt (2/5)
REQUEST 3  (00:06) → Rate Limit Check ✅ → Login Service → Failed Attempt (3/5)
REQUEST 4  (00:09) → Rate Limit Check ✅ → Login Service → Failed Attempt (4/5)
REQUEST 5  (00:12) → Rate Limit Check ✅ → Login Service → Failed Attempt (5/5) → Account LOCKED
REQUEST 6  (00:15) → Rate Limit Check ❌ BLOCKED (IP limit) ← HACKER STOPPED HERE
REQUEST 7  (00:18) → Rate Limit Check ❌ BLOCKED
...
REQUEST 20 (00:57) → Rate Limit Check ❌ BLOCKED
```

**Result**:
- Requests 1-5 processed but account locked
- Requests 6-20 blocked immediately at rate limiter
- Hacker gets 429 "Too Many Requests" response
- IP address blocked for 5 minutes
- User account locked for 30 minutes

---

## Configuration Details

### src/common/middleware/rate-limit.middleware.ts

```typescript
// Global Limiter - Applied in main.ts
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                    // 100 requests per IP
  skip: (req) => req.method === 'GET',  // Skip read-only
});

// Login Limiter - Applied in auth.module.ts
export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,   // 5 minutes
  max: 5,                      // 5 attempts per IP
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Register Limiter - Applied in auth.module.ts
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,                      // 3 registrations per IP
});

// Strict Limiter - Applied in auth.module.ts
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                     // 10 attempts per IP
});
```

### src/auth/auth.module.ts

```typescript
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply loginLimiter to POST /auth/login
    consumer.apply(loginLimiter).forRoutes('auth/login');

    // Apply registerLimiter to POST /auth/register
    consumer.apply(registerLimiter).forRoutes('auth/register');

    // Apply strictLimiter to POST /auth/refresh
    consumer.apply(strictLimiter).forRoutes('auth/refresh');
  }
}
```

---

## Testing Rate Limiting

### Test 1: Block 5 Login Attempts in 5 Minutes

**Using cURL**:
```bash
# Attempt 1
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrong"}'
# Status: 401 Unauthorized

# Attempt 2-4 (same)
# Status: 401 Unauthorized

# Attempt 5
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrong"}'
# Status: 401 Unauthorized

# Attempt 6 (within 5-minute window)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrong"}'
# Status: 429 Too Many Requests
# Response:
# {
#   "statusCode": 429,
#   "message": "Too many login attempts from this IP, please try again after 5 minutes.",
#   "error": "Too Many Requests"
# }
```

### Test 2: Verify Account Lockout After 5 Failures

**Steps**:
1. Make 5 failed login attempts for a specific user account
2. After 5th attempt: User gets "Account locked due to too many failed attempts"
3. Even with correct password: "Account is locked. Try again later"
4. After 30 minutes: Account unlocks automatically

---

## Attack Prevention Summary

| Attack Type | Layer | Limit | Window | Response |
|---|---|---|---|---|
| Brute Force (IP-based) | Global | 100 | 15 min | 429 Too Many |
| Brute Force (Login) | Login | 5 | 5 min | 429 Too Many |
| Account Takeover | Account Lock | 5 | 30 min | 401 Account Locked |
| Registration Spam | Register | 3 | 1 hour | 429 Too Many |
| Token Abuse | Strict | 10 | 15 min | 429 Too Many |

---

## Real-World Scenario: Hacker Attack

**Scenario**: Attacker tries to crack password for user@example.com

```
00:00 - Hacker makes attempt 1  ✅ Processed (Account: 1/5 failures)
00:03 - Hacker makes attempt 2  ✅ Processed (Account: 2/5 failures)
00:06 - Hacker makes attempt 3  ✅ Processed (Account: 3/5 failures)
00:09 - Hacker makes attempt 4  ✅ Processed (Account: 4/5 failures)
00:12 - Hacker makes attempt 5  ✅ Processed (Account: 5/5 failures = LOCKED)
00:15 - Hacker makes attempt 6  ❌ BLOCKED by IP rate limit (5 attempts/5 min exceeded)
00:18 - Hacker makes attempt 7  ❌ BLOCKED
...
00:59 - Hacker makes attempt 20 ❌ BLOCKED (Still within 5-min window)
05:17 - Hacker makes attempt 21 ✅ New rate limit window (but account still locked for 30 min)
35:17 - Hacker makes attempt 22 ✅ Account unlock window reached
```

**Result**: Hacker completely stopped. Attack prevented. ✅

---

## Production Recommendations

### 1. Use Redis for Distributed Rate Limiting (Multiple Servers)

**Why**: If you have 10 servers, each counts independently. A hacker could make 50 requests across all servers (5 per server).

**Solution**: Use Redis store:
```bash
npm install rate-limit-redis redis
```

**Implementation**:
```typescript
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient();

export const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:global:', // rate-limit prefix
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

### 2. Whitelist Trusted IPs (Admin, Internal)

```typescript
export const globalLimiter = rateLimit({
  skip: (req) => {
    const trustedIPs = ['127.0.0.1', '::1']; // localhost
    return trustedIPs.includes(req.ip);
  },
  // ... other config
});
```

### 3. Custom Error Messages

```typescript
message: (req, res) => {
  return `You have exceeded ${req.rateLimit.limit} requests in ${req.rateLimit.windowMs / 1000 / 60} minutes. Please try again later.`;
}
```

### 4. Log Rate Limit Events

```typescript
handler: (req, res, next, options) => {
  logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
  res.status(options.statusCode).json({
    statusCode: options.statusCode,
    message: options.message,
    retryAfter: req.rateLimit.resetTime,
  });
}
```

---

## Files Modified/Created

1. ✅ **Created**: `src/common/middleware/rate-limit.middleware.ts` (Rate limiter definitions)
2. ✅ **Updated**: `src/main.ts` (Added global rate limiter)
3. ✅ **Updated**: `src/auth/auth.module.ts` (Added endpoint-specific limiters)

---

## Security Checklist

- ✅ Global rate limiting: 100 requests/15 min per IP
- ✅ Login rate limiting: 5 attempts/5 min per IP
- ✅ Account lockout: 5 failures/30 min per user
- ✅ Registration spam protection: 3/hour per IP
- ✅ Token refresh protection: 10 attempts/15 min per IP
- ✅ IP-based identification (using request.ip)
- ✅ Proper HTTP 429 response codes
- ✅ Clear error messages for users

---

## Next Steps (Phase 2)

### For Production Deployment:
1. Install Redis for distributed rate limiting
2. Add IP whitelist for internal services
3. Log rate limit violations to security monitoring
4. Add email notification when account is locked
5. Create admin dashboard to view rate limit incidents
6. Implement CAPTCHA after 3 failed attempts (optional)

### For Enhanced Security:
1. Implement device fingerprinting (Phase 4)
2. Add geographic blocking (optional)
3. Implement behavior analysis (advanced)
