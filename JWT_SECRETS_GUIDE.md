# JWT SECRETS - COMPLETE GUIDE

## Question: How do you get the JWT secret and refresh secret?

**Answer:** You generate strong random secrets and store them in environment variables (.env file).

---

## 1. GENERATE STRONG JWT SECRETS

### Method 1: Using Node.js (Recommended)

Run this command in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Output example:**
```
aKxWp9mL2nQ7rT4sU6vY8zB1cD3eF5gH7jK9lM0nO2pQ4rS6tU8vW0xY2zA4bC6d
```

**Do this TWICE** to get two different secrets:

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: aKxWp9mL2nQ7rT4sU6vY8zB1cD3eF5gH7jK9lM0nO2pQ4rS6tU8vW0xY2zA4bC6d

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: bLyXq0nR3oPv8wS5tU7xY9zA2cE4gF6hI8jL1mN3pO5rQ7sT9uV1wX3yZ5aB7cD
```

### Method 2: Using OpenSSL

```bash
openssl rand -hex 32
```

### Method 3: Using Python

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 2. STORE SECRETS IN .env FILE

Open your `.env` file and add the generated secrets:

**File: `.env`**

```env
# JWT Secrets (CHANGE THESE VALUES!)
JWT_SECRET=aKxWp9mL2nQ7rT4sU6vY8zB1cD3eF5gH7jK9lM0nO2pQ4rS6tU8vW0xY2zA4bC6d
JWT_REFRESH_SECRET=bLyXq0nR3oPv8wS5tU7xY9zA2cE4gF6hI8jL1mN3pO5rQ7sT9uV1wX3yZ5aB7cD

# Other secrets (keep as is for now)
ENCRYPTION_KEY=aKxWp9mL2nQ7rT4sU6vY8zB1cD3eF5gH
SESSION_SECRET=aKxWp9mL2nQ7rT4sU6vY8zB1cD3eF5gH7jK9lM0nO2pQ4rS
```

---

## 3. USE SECRETS IN YOUR CODE

### In app.module.ts

```typescript
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,  // ← Uses from .env
      signOptions: { expiresIn: process.env.JWT_EXPIRY || '15m' },
    }),
  ],
})
export class AppModule {}
```

### In auth.service.ts (when you create it)

```typescript
async login(email: string, password: string) {
  // ... validation ...

  const accessToken = this.jwtService.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.role,
    },
    {
      secret: process.env.JWT_SECRET,  // ← Uses from .env
      expiresIn: process.env.JWT_EXPIRY || '15m',
    },
  );

  const refreshToken = this.jwtService.sign(
    {
      sub: user.id,
      type: 'refresh',
    },
    {
      secret: process.env.JWT_REFRESH_SECRET,  // ← Uses from .env
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    },
  );

  return { accessToken, refreshToken };
}
```

---

## 4. HOW JWT WORKS (Simple Explanation)

### Access Token (Short-lived - 15 minutes)

```
Generated with JWT_SECRET:
  Header: { alg: 'HS256', typ: 'JWT' }
  Payload: { sub: 'user-uuid', email: 'user@example.com', roles: 'user', iat: 1234567890, exp: 1234569690 }
  Signature: HMACSHA256(base64(header) + '.' + base64(payload), JWT_SECRET)

Result: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Used for:** Every API request (sent in Authorization header)
**Expires:** 15 minutes (user logs out automatically)
**Secret:** JWT_SECRET

### Refresh Token (Long-lived - 7 days)

```
Generated with JWT_REFRESH_SECRET:
  Header: { alg: 'HS256', typ: 'JWT' }
  Payload: { sub: 'user-uuid', type: 'refresh', iat: 1234567890, exp: 1234999890 }
  Signature: HMACSHA256(base64(header) + '.' + base64(payload), JWT_REFRESH_SECRET)

Result: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE1MTYyMzkwMjJ9.abcdefghijklmnopqrstuvwxyz
```

**Used for:** Getting new access token (sent once every 15 min)
**Expires:** 7 days (user needs to login again)
**Secret:** JWT_REFRESH_SECRET

---

## 5. EXAMPLE FLOW

```
1. User logs in with email/password
   POST /auth/login
   Body: { email: "user@example.com", password: "password123" }

2. Backend validates password
   ✓ Password is correct

3. Backend generates tokens
   ✓ Access Token (15 min expiry) with JWT_SECRET
   ✓ Refresh Token (7 day expiry) with JWT_REFRESH_SECRET

4. Backend returns tokens
   Response: {
     accessToken: "eyJhbGci...",  (use in Authorization header)
     refreshToken: "eyJhbGci...", (store in httpOnly cookie or secure storage)
   }

5. Frontend makes API request
   GET /users/me
   Headers: {
     Authorization: "Bearer eyJhbGci..."  (access token)
   }

6. Backend verifies token
   ✓ Extract secret: process.env.JWT_SECRET
   ✓ Verify signature with secret
   ✓ Check expiry (still valid: 14 min remaining)
   ✓ Extract user ID from payload
   ✓ Return user data

7. After 15 minutes, access token expires
   GET /users/me
   Headers: {
     Authorization: "Bearer eyJhbGci..."  (EXPIRED)
   }
   Response: 401 Unauthorized - Token expired

8. Frontend uses refresh token to get new access token
   POST /auth/refresh
   Body: { refreshToken: "eyJhbGci..." }

9. Backend verifies refresh token
   ✓ Extract secret: process.env.JWT_REFRESH_SECRET
   ✓ Verify signature with refresh secret
   ✓ Check expiry (still valid: 6 days remaining)
   ✓ Extract user ID from payload

10. Backend returns new access token
    Response: {
      accessToken: "eyJhbGci..."  (NEW - fresh 15 min)
    }

11. Frontend uses new access token for next 15 minutes
    GET /users/me
    Headers: {
      Authorization: "Bearer eyJhbGci..."  (NEW TOKEN)
    }
    ✓ Success
```

---

## 6. SECURITY BEST PRACTICES

### ✅ DO:

1. **Generate strong secrets** (32+ characters, random)
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Store in .env file** (never hardcode)
   ```env
   JWT_SECRET=aKxWp9mL2nQ7rT4sU6vY8zB1cD3eF5gH7jK9lM0nO2pQ4rS6tU8vW0xY2zA4bC6d
   ```

3. **Add .env to .gitignore** (never commit secrets)
   ```
   .env
   .env.local
   ```

4. **Use different secrets** for access and refresh tokens
   ```env
   JWT_SECRET=aKxWp9...          (access token)
   JWT_REFRESH_SECRET=bLyXq0...  (refresh token)
   ```

5. **Rotate secrets periodically** (every 90 days)
   - Generate new secret
   - Update in .env
   - Existing tokens still work until expiry

6. **Store in environment variables in production**
   - AWS Secrets Manager
   - Azure Key Vault
   - Heroku Config Vars
   - Never hardcode in code

### ❌ DON'T:

1. ❌ Use weak secrets
   ```
   JWT_SECRET=password
   JWT_SECRET=12345678
   JWT_SECRET=secret
   ```

2. ❌ Hardcode secrets in code
   ```typescript
   // WRONG!
   secret: 'my-secret-key'
   ```

3. ❌ Commit .env to Git
   ```bash
   # Add to .gitignore
   .env
   ```

4. ❌ Use same secret for access and refresh
   ```env
   JWT_SECRET=aKxWp9...
   JWT_REFRESH_SECRET=aKxWp9...  // SAME - bad!
   ```

5. ❌ Log or expose secrets
   ```typescript
   // WRONG!
   console.log(process.env.JWT_SECRET)
   ```

---

## 7. YOUR CURRENT .env

Your `.env` file already has placeholder secrets:

```env
JWT_SECRET=aKxWp9mL2nQ7rT4sU6vY8zB1cD3eF5gH7jK9lM0nO2pQ4rS6tU8vW0xY2zA4bC6d
JWT_REFRESH_SECRET=bLyXq0nR3oPv8wS5tU7xY9zA2cE4gF6hI8jL1mN3pO5rQ7sT9uV1wX3yZ5aB7cD
```

**These are OK for development**, but:
- ✅ For development/testing: Use as is
- ⚠️ For production: Generate new ones!

---

## 8. GENERATE NEW SECRETS FOR PRODUCTION

When deploying to production, generate fresh secrets:

```bash
# Generate Production JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Production JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then:
1. Add to production .env file (in your server)
2. Never commit to Git
3. Store in secrets manager (AWS/Azure/etc)

---

## 9. TESTING JWT FLOW

### Decode JWT (see what's inside)

Go to https://jwt.io and paste your token:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Decoded:**
```json
Header: {
  "alg": "HS256",
  "typ": "JWT"
}

Payload: {
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022
}

Signature: (verified with secret)
```

---

## 10. QUICK REFERENCE

| Variable | Purpose | Length | Generated How |
|----------|---------|--------|---|
| `JWT_SECRET` | Sign access tokens | 32+ chars | `crypto.randomBytes(32).toString('hex')` |
| `JWT_REFRESH_SECRET` | Sign refresh tokens | 32+ chars | `crypto.randomBytes(32).toString('hex')` |
| `JWT_EXPIRY` | Access token lifetime | N/A | Set to `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime | N/A | Set to `7d` |

---

## Summary

1. **Generate secrets:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. **Store in .env:** `JWT_SECRET=...` and `JWT_REFRESH_SECRET=...`
3. **Use in code:** `process.env.JWT_SECRET` and `process.env.JWT_REFRESH_SECRET`
4. **Never hardcode** secrets in code
5. **Never commit** .env to Git
6. **Rotate periodically** (every 90 days for production)

Your current secrets in `.env` are fine for development. For production, generate new ones!
