# Brute Force Attack Prevention Architecture

## Quick Answer to Your Question

**Question**: "In the time of login, a hacker tries 20 times in a minute. How to block that?"

**Answer**:
- **First 5 attempts** → Processed, user account gets locked
- **Attempts 6-20** → **BLOCKED** by rate limiter (429 Too Many Requests)
- **Result**: Hacker completely stopped ✅

---

## Visual Flow Diagram

### What Happens When Hacker Tries 20 Login Attempts in 60 Seconds

```
HACKER'S ATTACK FLOW
═══════════════════════════════════════════════════════════════════

TIME    REQ  │  IP RATE LIMIT  │  LOGIN LIMITER  │  ACCOUNT LOCK  │ RESULT
────────────┼─────────────────┼─────────────────┼────────────────┼─────────
00:00   #1  │  1/5 ✅         │  1/5 ✅         │  1/5           │ ✅ Process
00:03   #2  │  2/5 ✅         │  2/5 ✅         │  2/5           │ ✅ Process
00:06   #3  │  3/5 ✅         │  3/5 ✅         │  3/5           │ ✅ Process
00:09   #4  │  4/5 ✅         │  4/5 ✅         │  4/5           │ ✅ Process
00:12   #5  │  5/5 ✅         │  5/5 ✅ LIMIT   │  5/5 LOCKED    │ ✅ Process
────────────┼─────────────────┼─────────────────┼────────────────┼─────────
00:15   #6  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:18   #7  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:21   #8  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:24   #9  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:27  #10  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:30  #11  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:33  #12  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:36  #13  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:39  #14  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:42  #15  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:45  #16  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:48  #17  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:51  #18  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:54  #19  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED
00:57  #20  │  ❌ BLOCK       │  ❌ BLOCK       │  🔴 LOCKED     │ ❌ BLOCKED

WINDOWS:
  IP Rate Limit:  5-minute window (00:00 - 05:00)
  Login Limiter:  5-minute window (00:00 - 05:00)
  Account Lock:   30-minute window (00:12 - 30:12)
```

---

## Detailed Architecture

### Layer 1: Global Rate Limiter (Express Middleware)

```
┌─────────────────────────────────────────────────┐
│  INCOMING REQUEST (from Hacker's IP)            │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  GLOBAL RATE LIMITER (main.ts)                  │
│                                                  │
│  Config: 100 requests / 15 minutes per IP       │
│  Applies to: All non-GET requests               │
│  Current IP Requests: 5                         │
│  Limit: 100                                     │
│  Status: ✅ WITHIN LIMIT (5 < 100)              │
└────────────┬────────────────────────────────────┘
             │
             ▼ (Passes through)
```

### Layer 2: Login Rate Limiter (NestJS Middleware)

```
┌─────────────────────────────────────────────────┐
│  POST /auth/login REQUEST                       │
│  From: 192.168.1.100 (Hacker's IP)             │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  LOGIN RATE LIMITER (auth.module.ts)            │
│                                                  │
│  Config: 5 attempts / 5 minutes per IP          │
│  Current IP Attempts: 5 / 5                     │
│  Status: ❌ LIMIT REACHED                        │
│                                                  │
│  Response Code: 429 Too Many Requests           │
│  Message: "Too many login attempts from this    │
│           IP, please try again after 5 min"     │
└─────────────────────────────────────────────────┘
             │
             ▼
      ❌ REQUEST BLOCKED ❌
      (Never reaches auth service)
```

### Layer 3: Account Lockout (Application Layer)

```
┌─────────────────────────────────────────────────┐
│  LOGIN REQUEST #5 (Passed IP Rate Limit)        │
│  Email: user@example.com                        │
│  Password: wrong123                             │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  AUTH SERVICE (auth.service.ts)                 │
│                                                  │
│  1. Find user by email: ✅ Found                │
│  2. Verify password: ❌ Wrong                    │
│  3. Increment failed attempts: 5                │
│  4. Check if >= 5 failed: ✅ YES                │
│  5. Lock account for 30 minutes                 │
│  6. Update DB:                                  │
│     - failedLoginAttempts: 5                    │
│     - lockedUntil: NOW + 30 minutes             │
└────────────┬────────────────────────────────────┘
             │
             ▼
      User Account LOCKED 🔴
      Future login attempts rejected
```

---

## What Attacker Sees

### Attempt #1-5 Response (Processed)
```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized",
  "timestamp": "2025-11-24T10:00:00Z"
}
```

### Attempt #6-20 Response (BLOCKED by Rate Limiter)
```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 1732434900

{
  "statusCode": 429,
  "message": "Too many login attempts from this IP, please try again after 5 minutes.",
  "error": "Too Many Requests",
  "timestamp": "2025-11-24T10:00:45Z"
}
```

---

## Timeline: Full Attack Scenario

```
═══════════════════════════════════════════════════════════════════

ATTACK TIMELINE (192.168.1.100)
═══════════════════════════════════════════════════════════════════

⏰ 10:00:00 - REQUEST #1: POST /auth/login
   IP Check:     1/5 ✅
   Login Check:  1/5 ✅
   Process:      ✅ (Failed attempt 1/5)
   Response:     401 Unauthorized

⏰ 10:00:03 - REQUEST #2: POST /auth/login
   IP Check:     2/5 ✅
   Login Check:  2/5 ✅
   Process:      ✅ (Failed attempt 2/5)
   Response:     401 Unauthorized

⏰ 10:00:06 - REQUEST #3: POST /auth/login
   IP Check:     3/5 ✅
   Login Check:  3/5 ✅
   Process:      ✅ (Failed attempt 3/5)
   Response:     401 Unauthorized

⏰ 10:00:09 - REQUEST #4: POST /auth/login
   IP Check:     4/5 ✅
   Login Check:  4/5 ✅
   Process:      ✅ (Failed attempt 4/5)
   Response:     401 Unauthorized

⏰ 10:00:12 - REQUEST #5: POST /auth/login
   IP Check:     5/5 ✅ (LIMIT REACHED)
   Login Check:  5/5 ✅ (LIMIT REACHED)
   Process:      ✅ (Failed attempt 5/5)
   Action:       Account LOCKED for 30 min
   Response:     401 "Account locked due to too many failed attempts"

⏰ 10:00:15 - REQUEST #6: POST /auth/login
   IP Check:     ❌ BLOCKED (Exceeded limit)
   Response:     429 Too Many Requests
   Message:      "Too many login attempts from this IP"
   Next Try:     10:05:15 (5 minutes later)

⏰ 10:00:18 - REQUEST #7: POST /auth/login
   IP Check:     ❌ BLOCKED
   Response:     429 Too Many Requests

⏰ 10:00:21 - REQUEST #8: POST /auth/login
   IP Check:     ❌ BLOCKED
   Response:     429 Too Many Requests

[Requests #9-20 similar to #8...]

⏰ 10:01:00 - REQUEST #20: POST /auth/login
   IP Check:     ❌ BLOCKED
   Response:     429 Too Many Requests

ATTACK RESULT: ❌ COMPLETELY BLOCKED ❌
Only 5 requests processed
Remaining 15 requests rejected

═══════════════════════════════════════════════════════════════════
```

---

## Comparison: Before vs After Rate Limiting

### BEFORE (Without Rate Limiting)
```
Attempt 1:  401 ✅ (processed)
Attempt 2:  401 ✅ (processed)
Attempt 3:  401 ✅ (processed)
Attempt 4:  401 ✅ (processed)
Attempt 5:  401 ✅ (processed) → Account locked
Attempt 6:  401 ✅ (processed) → Account locked
Attempt 7:  401 ✅ (processed) → Account locked
...
Attempt 20: 401 ✅ (processed) → Account locked

PROBLEM: All 20 requests processed
Database queries: 20
CPU usage: High
Logs: 20 entries
Password guesses tried: 20
```

### AFTER (With Rate Limiting)
```
Attempt 1:  401 ✅ (processed)
Attempt 2:  401 ✅ (processed)
Attempt 3:  401 ✅ (processed)
Attempt 4:  401 ✅ (processed)
Attempt 5:  401 ✅ (processed) → Account locked
Attempt 6:  429 ❌ (BLOCKED)
Attempt 7:  429 ❌ (BLOCKED)
...
Attempt 20: 429 ❌ (BLOCKED)

BENEFIT: Only 5 requests processed
Database queries: 5
CPU usage: Minimal
Logs: 5 entries
Password guesses tried: 5
Attack prevented: ✅ YES
```

---

## Code Implementation

### File 1: src/common/middleware/rate-limit.middleware.ts
```typescript
import rateLimit from 'express-rate-limit';

// 5 attempts per 5 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 5,                     // 5 attempts
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many login attempts from this IP, please try again after 5 minutes.',
  keyGenerator: (req) => req.ip, // Use IP address as key
});
```

### File 2: src/auth/auth.module.ts
```typescript
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { loginLimiter } from '../common/middleware/rate-limit.middleware';

export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply to POST /auth/login
    consumer.apply(loginLimiter).forRoutes('auth/login');
  }
}
```

### File 3: src/main.ts
```typescript
// Import global rate limiter
import { globalLimiter } from './common/middleware/rate-limit.middleware';

async function bootstrap() {
  // ...
  // Apply global rate limiter (before other middleware)
  app.use(globalLimiter);
  // ...
}
```

---

## Testing the Implementation

### Test Script (cURL)
```bash
#!/bin/bash

echo "Testing Rate Limiting..."
echo ""

for i in {1..10}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong123"}' \
    -w "\nStatus: %{http_code}\n\n"

  sleep 1  # 1 second between attempts
done
```

### Expected Output
```
Attempt 1:
Status: 401

Attempt 2:
Status: 401

Attempt 3:
Status: 401

Attempt 4:
Status: 401

Attempt 5:
Status: 401  (Account locked after this)

Attempt 6:
Status: 429  (RATE LIMITED)

Attempt 7:
Status: 429  (RATE LIMITED)

...

Attempt 10:
Status: 429  (RATE LIMITED - still within 5-min window)
```

---

## Summary

### How It Blocks 20 Attempts in 1 Minute:

1. **IP Rate Limiting** (Layer 2): Only allows 5 login attempts per IP every 5 minutes
2. **Account Lockout** (Layer 3): Locks user account after 5 failed attempts for 30 minutes
3. **Result**:
   - Attempts 1-5: Processed (but account gets locked)
   - Attempts 6-20: **BLOCKED** by rate limiter with 429 response

### Security Benefits:
- ✅ Prevents password brute force attacks
- ✅ Reduces database load (fewer queries)
- ✅ Protects legitimate users (account lockout)
- ✅ Blocks attackers completely (429 response)
- ✅ Minimal performance impact on legitimate traffic

### Files Created:
- `src/common/middleware/rate-limit.middleware.ts` - Rate limiter definitions
- Updated: `src/main.ts` - Global rate limiter
- Updated: `src/auth/auth.module.ts` - Endpoint-specific limiters
