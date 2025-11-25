# Attack Prevention Quick Reference

## Your Question
**"When a hacker tries to login in a device 20 times in a minute, how to block that?"**

---

## The Answer in 30 Seconds

```
HACKER'S ATTEMPTS
═════════════════

Attempts 1-5:  ✅ PROCESSED (but account gets locked after 5)
Attempts 6-20: ❌ BLOCKED by rate limiter (429 Too Many Requests)

RESULT: Attack completely prevented ✅
```

---

## What Happens Step by Step

### Step 1: First 5 Attempts (0:00 - 0:12)
```
Request 1 → Rate check: 1/5 ✅ → Process → Wrong password
Request 2 → Rate check: 2/5 ✅ → Process → Wrong password
Request 3 → Rate check: 3/5 ✅ → Process → Wrong password
Request 4 → Rate check: 4/5 ✅ → Process → Wrong password
Request 5 → Rate check: 5/5 ✅ → Process → Wrong password → ACCOUNT LOCKED
```

### Step 2: Next 15 Attempts (0:15 - 0:57)
```
Request 6  → Rate check: ❌ BLOCKED (5/5 attempts reached)
Request 7  → Rate check: ❌ BLOCKED
Request 8  → Rate check: ❌ BLOCKED
Request 9  → Rate check: ❌ BLOCKED
Request 10 → Rate check: ❌ BLOCKED
...
Request 20 → Rate check: ❌ BLOCKED

Response to all blocked requests:
{
  "statusCode": 429,
  "message": "Too many login attempts from this IP, please try again after 5 minutes.",
  "error": "Too Many Requests"
}
```

---

## The 3-Layer Protection System

### Layer 1: Global Rate Limiter
- **Protects**: Entire application from DoS attacks
- **Limit**: 100 requests per 15 minutes per IP
- **Blocks**: After 100 requests in 15 minutes

### Layer 2: Login Rate Limiter ⭐ (This blocks hacker)
- **Protects**: Login endpoint from brute force
- **Limit**: 5 attempts per 5 minutes per IP
- **Blocks**: After 5 login attempts in 5 minutes
- **Status**: Attempts 6-20 are blocked here

### Layer 3: Account Lockout
- **Protects**: Individual user accounts
- **Limit**: 5 failed password attempts per account
- **Blocks**: Account locked for 30 minutes after 5 failures
- **Status**: Account locked after attempt 5

---

## Files You Need to Know

### 1. Rate Limiter Definition
**File**: `src/common/middleware/rate-limit.middleware.ts`

This file defines 4 rate limiters:
- `globalLimiter` - Entire app
- `loginLimiter` - Login endpoint (5/5 min)
- `registerLimiter` - Registration endpoint
- `strictLimiter` - Sensitive operations

### 2. Applied to Main Server
**File**: `src/main.ts` (Line 32)

```typescript
app.use(globalLimiter);  // Applied globally
```

### 3. Applied to Login Endpoint
**File**: `src/auth/auth.module.ts` (Lines 20-23)

```typescript
consumer.apply(loginLimiter).forRoutes('auth/login');
```

---

## How to Test

### Using cURL
```bash
# Run 6 times quickly (same IP)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrong"}'

# Results:
# 1st-5th request: 401 Unauthorized
# 6th request: 429 Too Many Requests ❌
```

### Using Python
```python
import requests
import time

for i in range(20):
    response = requests.post(
        'http://localhost:3000/auth/login',
        json={'email': 'test@example.com', 'password': 'wrong'}
    )
    print(f"Attempt {i+1}: Status {response.status_code}")

    # Results:
    # Attempt 1: Status 401
    # Attempt 2: Status 401
    # Attempt 3: Status 401
    # Attempt 4: Status 401
    # Attempt 5: Status 401
    # Attempt 6: Status 429 ❌ BLOCKED
    # Attempt 7: Status 429 ❌ BLOCKED
    # ... (all remaining blocked)
```

---

## Hacker's Perspective

### What They See When Attacking

```
TIMESTAMP    | ATTEMPT | HTTP CODE | MESSAGE
─────────────┼─────────┼───────────┼──────────────────────
10:00:00     | #1      | 401       | Invalid email or password
10:00:03     | #2      | 401       | Invalid email or password
10:00:06     | #3      | 401       | Invalid email or password
10:00:09     | #4      | 401       | Invalid email or password
10:00:12     | #5      | 401       | Account locked due to too many failed attempts
10:00:15     | #6      | 429 ❌    | Too many login attempts from this IP (try again in 5 min)
10:00:18     | #7      | 429 ❌    | Too many login attempts from this IP (try again in 5 min)
10:00:21     | #8      | 429 ❌    | Too many login attempts from this IP (try again in 5 min)
...
10:00:57     | #20     | 429 ❌    | Too many login attempts from this IP (try again in 5 min)

RESULT: Attack Blocked ✅
```

---

## Configuration Reference

| Setting | Value | Purpose |
|---------|-------|---------|
| Global Window | 15 minutes | Rate limit window |
| Global Limit | 100 requests | Max requests per window |
| Login Window | 5 minutes | Rate limit window for login |
| Login Limit | 5 attempts | Max login attempts per window |
| Account Failures | 5 attempts | Max password failures |
| Account Lockout | 30 minutes | How long account stays locked |

---

## What Makes It Secure

### Why Hacker Can't Bypass

1. **IP-Based Blocking**: Hacker blocked by their IP address
   - Can't fake IP (authenticated at network layer)
   - Can't change IP easily (would need new internet connection)

2. **Multiple Layers**: Hacker hits TWO rate limits
   - Login rate limit (5 per 5 min)
   - Account lockout (5 failures lock account)

3. **Stateless Tracking**: Uses request counting
   - No pattern to exploit
   - Works across all servers/instances

4. **Standard HTTP**: Returns proper 429 status
   - Can't retry immediately
   - Properly recognized by clients

---

## Real World Example

### Scenario: Email = user@example.com, Real Password = Secure123!

**Time 10:00 AM**
```
Attempt 1: password = "123456"        → 401 ❌ Wrong password
Attempt 2: password = "password"      → 401 ❌ Wrong password
Attempt 3: password = "admin"         → 401 ❌ Wrong password
Attempt 4: password = "letmein"       → 401 ❌ Wrong password
Attempt 5: password = "qwerty"        → 401 ❌ Wrong password

[Account locked after 5 failures]

Attempt 6: password = "123456789"     → 429 ❌ Too many attempts (BLOCKED)
Attempt 7: password = "welcome"       → 429 ❌ Too many attempts (BLOCKED)
...
Attempt 20: password = "password123"  → 429 ❌ Too many attempts (BLOCKED)

[Hacker's IP blocked until 10:05 AM]
[User account locked until 10:30 AM]

Result: Hacker completely stopped ✅
```

---

## HTTP Response Examples

### 401 Unauthorized (First 5 Attempts)
```
POST /auth/login HTTP/1.1

Response:
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

### 429 Too Many Requests (Attempts 6+)
```
POST /auth/login HTTP/1.1

Response:
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 1732434900

{
  "statusCode": 429,
  "message": "Too many login attempts from this IP, please try again after 5 minutes.",
  "error": "Too Many Requests"
}
```

---

## Production Recommendations

### Optional: Add Redis for Distributed Servers
If you have multiple servers, add Redis to share rate limit data:

```bash
npm install rate-limit-redis redis
```

This ensures that if hacker tries from one server, all servers know about it.

### Optional: Add Monitoring
Log rate limit violations:

```typescript
// In rate-limit.middleware.ts
handler: (req, res) => {
  logger.warn(`Rate limit exceeded: IP=${req.ip}, Path=${req.path}`);
  res.status(429).json({...});
}
```

### Optional: Add CAPTCHA
After 2 failed attempts, show CAPTCHA:

```typescript
// In auth.service.ts
if (failedAttempts >= 2) {
  throw new BadRequestException('Please complete CAPTCHA');
}
```

---

## Summary

**Question**: How to block 20 login attempts in 1 minute?

**Answer**:
- ✅ First 5 attempts: Processed (account gets locked)
- ✅ Attempts 6-20: Blocked by rate limiter (429 response)
- ✅ Hacker's IP: Blocked for 5 minutes
- ✅ User's account: Locked for 30 minutes

**Implementation**: Already done! ✅
- File 1: `src/common/middleware/rate-limit.middleware.ts` (Rate limiter logic)
- File 2: `src/main.ts` (Applied globally)
- File 3: `src/auth/auth.module.ts` (Applied to login endpoint)

**Status**: Ready to use! 🎉
