# Auth Design: VimTrainer
**Version**: 1.0
**Last Updated**: 2026-06-16
**Author**: Backend Architect
**Status**: Production-Ready

---

## Overview

VimTrainer uses JWT-based authentication implemented entirely in Go. There is no Supabase Auth, no social OAuth in V1, and no external identity provider. The auth system has two token types: a short-lived access token (15 minutes) and a long-lived stateless refresh token (30 days stored in an httpOnly cookie). Guest sessions receive a special guest JWT that grants access to practice endpoints only.

---

## 1. JWT Token Structure

### 1.1 Access Token

**Algorithm**: HS256 (HMAC-SHA256)  
**Signing secret**: `JWT_SECRET` environment variable, minimum 32 bytes  
**Expiry**: 15 minutes  
**Transport**: `Authorization: Bearer <token>` request header

**Claims**:
```json
{
  "iss": "vimtrainer-api",
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "type": "access",
  "is_guest": false,
  "iat": 1750067200,
  "exp": 1750068100
}
```

| Claim | Type | Description |
|---|---|---|
| `iss` | string | Issuer. Always `"vimtrainer-api"`. Validated on every request. |
| `sub` | string (UUID) | User ID from the `users` table. |
| `type` | string | Always `"access"` for access tokens. Prevents refresh tokens from being used as access tokens. |
| `is_guest` | bool | `true` for guest users. Controls which endpoints are accessible. |
| `iat` | int64 | Issued at (Unix timestamp). |
| `exp` | int64 | Expiry (Unix timestamp). Validated by the JWT library. |

**Go struct**:
```go
// internal/auth/jwt.go
type AccessClaims struct {
    Type    string `json:"type"`
    IsGuest bool   `json:"is_guest"`
    jwt.RegisteredClaims
}
```

### 1.2 Refresh Token

**Algorithm**: HS256  
**Signing secret**: Same `JWT_SECRET` as access tokens  
**Expiry**: 30 days  
**Transport**: httpOnly cookie named `refresh_token`

**Cookie attributes**:
```
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000
```

| Attribute | Value | Reason |
|---|---|---|
| `HttpOnly` | yes | Prevents JavaScript from reading the cookie. XSS resistance. |
| `Secure` | yes | Cookie only sent over HTTPS. Never over HTTP. |
| `SameSite=Strict` | yes | Cookie not sent on cross-site requests. CSRF resistance. |
| `Path=/api/v1/auth` | scoped | Cookie only sent to the `/api/v1/auth` path. Limits exposure. |
| `Max-Age=2592000` | 30 days | Persistent across browser sessions. |

**Claims**:
```json
{
  "iss": "vimtrainer-api",
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "type": "refresh",
  "is_guest": false,
  "iat": 1750067200,
  "exp": 1752659200
}
```

**Go struct**:
```go
// internal/auth/jwt.go
type RefreshClaims struct {
    Type    string `json:"type"`
    IsGuest bool   `json:"is_guest"`
    jwt.RegisteredClaims
}
```

### 1.3 Guest Token

Guest tokens are access tokens with `is_guest: true` and `type: "access"`. They expire in 24 hours (not 15 minutes, to support longer guest sessions without requiring refresh). No refresh token is issued for guest sessions.

```json
{
  "iss": "vimtrainer-api",
  "sub": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "type": "access",
  "is_guest": true,
  "iat": 1750067200,
  "exp": 1750153600
}
```

### 1.4 Token Generation

```go
// internal/auth/jwt.go

const (
    AccessTokenExpiry  = 15 * time.Minute
    RefreshTokenExpiry = 30 * 24 * time.Hour
    GuestTokenExpiry   = 24 * time.Hour
)

func GenerateAccessToken(userID uuid.UUID, isGuest bool, secret string) (string, error) {
    now := time.Now().UTC()
    claims := AccessClaims{
        Type:    "access",
        IsGuest: isGuest,
        RegisteredClaims: jwt.RegisteredClaims{
            Issuer:    "vimtrainer-api",
            Subject:   userID.String(),
            IssuedAt:  jwt.NewNumericDate(now),
            ExpiresAt: jwt.NewNumericDate(now.Add(AccessTokenExpiry)),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}

func GenerateRefreshToken(userID uuid.UUID, isGuest bool, secret string) (string, error) {
    now := time.Now().UTC()
    claims := RefreshClaims{
        Type:    "refresh",
        IsGuest: isGuest,
        RegisteredClaims: jwt.RegisteredClaims{
            Issuer:    "vimtrainer-api",
            Subject:   userID.String(),
            IssuedAt:  jwt.NewNumericDate(now),
            ExpiresAt: jwt.NewNumericDate(now.Add(RefreshTokenExpiry)),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}

func GenerateGuestToken(userID uuid.UUID, secret string) (string, error) {
    now := time.Now().UTC()
    claims := AccessClaims{
        Type:    "access",
        IsGuest: true,
        RegisteredClaims: jwt.RegisteredClaims{
            Issuer:    "vimtrainer-api",
            Subject:   userID.String(),
            IssuedAt:  jwt.NewNumericDate(now),
            ExpiresAt: jwt.NewNumericDate(now.Add(GuestTokenExpiry)),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}

func ValidateAccessToken(tokenStr string, secret string) (*AccessClaims, error) {
    token, err := jwt.ParseWithClaims(tokenStr, &AccessClaims{}, func(t *jwt.Token) (interface{}, error) {
        if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
        }
        return []byte(secret), nil
    })
    if err != nil {
        return nil, err
    }
    claims, ok := token.Claims.(*AccessClaims)
    if !ok || !token.Valid {
        return nil, fmt.Errorf("invalid token claims")
    }
    if claims.Issuer != "vimtrainer-api" {
        return nil, fmt.Errorf("invalid issuer")
    }
    if claims.Type != "access" {
        return nil, fmt.Errorf("wrong token type: expected access, got %s", claims.Type)
    }
    return claims, nil
}

func ValidateRefreshToken(tokenStr string, secret string) (*RefreshClaims, error) {
    token, err := jwt.ParseWithClaims(tokenStr, &RefreshClaims{}, func(t *jwt.Token) (interface{}, error) {
        if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
        }
        return []byte(secret), nil
    })
    if err != nil {
        return nil, err
    }
    claims, ok := token.Claims.(*RefreshClaims)
    if !ok || !token.Valid {
        return nil, fmt.Errorf("invalid token claims")
    }
    if claims.Issuer != "vimtrainer-api" {
        return nil, fmt.Errorf("invalid issuer")
    }
    if claims.Type != "refresh" {
        return nil, fmt.Errorf("wrong token type: expected refresh, got %s", claims.Type)
    }
    return claims, nil
}
```

---

## 2. Guest Mode Design

### 2.1 Guest User Creation

When a user visits VimTrainer without an account, the frontend calls `POST /api/v1/auth/guest`. The server:

1. Generates a new UUID for the guest user
2. Generates a cryptographically random `guest_token` UUID (used as a stable identifier, different from the JWT)
3. Inserts a row into `users` with `is_guest = TRUE`, `email = NULL`, `password_hash = NULL`
4. Returns a 24-hour guest JWT containing the new user's `id` as the `sub` claim

The guest JWT is stored in the browser's memory (not localStorage — the frontend holds it in React state and re-fetches on page reload via the refresh endpoint if needed, but for guests there is no refresh mechanism — they simply get a new guest token on reload after expiry).

### 2.2 Guest Session Behavior

Guest users have full access to:
- `POST /sessions` — create practice sessions
- `POST /sessions/:id/attempts` — record attempts
- `POST /sessions/:id/complete` — complete sessions
- `GET /keymaps/builtin` — access built-in Vim motions
- `POST /keymaps/upload` — upload config file (preview only; cannot confirm/persist)
- `POST /keymaps/github` — GitHub import (preview only)

Guest users cannot access:
- `POST /keymaps/upload/confirm` — requires registered account
- All analytics endpoints
- Settings endpoints
- Achievement endpoints
- Queue endpoints
- User profile endpoints

The `GuestOrAuthMiddleware` inspects the `is_guest` claim and sets a context value `isGuest: true`. Handlers that require registration check this value and return `403 Forbidden` with code `REGISTRATION_REQUIRED`.

### 2.3 Guest Data Storage

Guest practice sessions and SRS records are stored in the same tables as registered users, using the guest's `user_id` (which is a real UUID in the `users` table). There is no separate guest data model. This simplifies the migration path and allows the SRS algorithm to operate uniformly.

Guest data lifetime: 24 hours. A scheduled cleanup job (Cloud Scheduler → Cloud Run) runs every hour:

```sql
-- Delete guest users and cascade to all related data
DELETE FROM users
WHERE is_guest = TRUE
  AND created_at < NOW() - INTERVAL '24 hours';
```

CASCADE rules handle the child table cleanup automatically.

### 2.4 Guest to Registered Account Migration

The `POST /api/v1/auth/guest/migrate` endpoint converts a guest session to a registered account. The JWT guest token must be in the Authorization header.

**Migration transaction** (atomic):

```go
// internal/services/auth_service.go

func (s *authService) MigrateGuestToRegistered(ctx context.Context, guestUserID uuid.UUID, email, password, displayName string) (*MigrateResult, error) {
    // 1. Verify guest user exists and is not expired
    guestUser, err := s.userRepo.GetByID(ctx, guestUserID)
    if err != nil || !guestUser.IsGuest {
        return nil, apperrors.ErrGuestSessionExpired
    }

    // 2. Check email not taken
    existing, _ := s.userRepo.GetByEmail(ctx, email)
    if existing != nil {
        return nil, apperrors.ErrEmailTaken
    }

    // 3. Hash password
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return nil, fmt.Errorf("hash password: %w", err)
    }

    // 4. Atomically update the user record in-place
    // This preserves all foreign key references (sessions, SRS records, etc.)
    // without needing to re-assign rows to a new user_id
    err = s.userRepo.ConvertGuestToRegistered(ctx, guestUserID, ConvertGuestInput{
        Email:        email,
        PasswordHash: string(hash),
        DisplayName:  displayName,
    })
    if err != nil {
        return nil, fmt.Errorf("convert guest: %w", err)
    }

    // 5. Fetch counts for response
    sessionCount, _ := s.sessionRepo.CountByUserID(ctx, guestUserID)
    srsCount, _ := s.srsRepo.CountByUserID(ctx, guestUserID)

    return &MigrateResult{
        UserID:              guestUserID,
        MigratedSessions:   sessionCount,
        MigratedSRSRecords: srsCount,
    }, nil
}
```

The `ConvertGuestToRegistered` repository method executes:
```sql
UPDATE users
SET
    is_guest      = FALSE,
    email         = $2,
    password_hash = $3,
    display_name  = $4,
    guest_token   = NULL,
    updated_at    = NOW()
WHERE id = $1
  AND is_guest = TRUE
  AND deleted_at IS NULL;
```

Because all related data (sessions, SRS records) reference `user_id` which does not change, no data migration is needed. The user_id remains the same UUID; only the user row fields are updated.

---

## 3. Middleware Definitions

### 3.1 JWTAuthMiddleware

Used on endpoints that require a registered user. Rejects guest tokens.

**File**: `internal/middleware/jwt_auth.go`

```go
func JWTAuth(secret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrUnauthorized))
            c.Abort()
            return
        }

        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
            c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrInvalidTokenFormat))
            c.Abort()
            return
        }

        claims, err := auth.ValidateAccessToken(parts[1], secret)
        if err != nil {
            if errors.Is(err, jwt.ErrTokenExpired) {
                c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrTokenExpired))
            } else {
                c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrInvalidToken))
            }
            c.Abort()
            return
        }

        // Reject guest tokens on registered-only endpoints
        if claims.IsGuest {
            c.JSON(http.StatusForbidden, errorResponse(apperrors.ErrRegistrationRequired))
            c.Abort()
            return
        }

        userID, err := uuid.Parse(claims.Subject)
        if err != nil {
            c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrInvalidToken))
            c.Abort()
            return
        }

        c.Set("user_id", userID)
        c.Set("is_guest", false)
        c.Next()
    }
}
```

**Context values set**:
- `user_id`: `uuid.UUID` — the authenticated user's ID
- `is_guest`: `bool` — always `false` after this middleware

### 3.2 GuestOrAuthMiddleware

Used on endpoints accessible to both guest and registered users (practice endpoints, preview imports). Accepts either a registered JWT or a guest JWT. Rejects entirely absent or invalid tokens.

**File**: `internal/middleware/guest_auth.go`

```go
func GuestOrAuth(secret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrUnauthorized))
            c.Abort()
            return
        }

        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
            c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrInvalidTokenFormat))
            c.Abort()
            return
        }

        claims, err := auth.ValidateAccessToken(parts[1], secret)
        if err != nil {
            if errors.Is(err, jwt.ErrTokenExpired) {
                if claims != nil && claims.IsGuest {
                    c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrGuestSessionExpired))
                } else {
                    c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrTokenExpired))
                }
            } else {
                c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrInvalidToken))
            }
            c.Abort()
            return
        }

        userID, err := uuid.Parse(claims.Subject)
        if err != nil {
            c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrInvalidToken))
            c.Abort()
            return
        }

        c.Set("user_id", userID)
        c.Set("is_guest", claims.IsGuest)
        c.Next()
    }
}
```

**Context values set**:
- `user_id`: `uuid.UUID` — valid for both guest and registered users
- `is_guest`: `bool` — `true` for guest tokens, `false` for registered tokens

### 3.3 AuthRequiredMiddleware (Guest-blocking check within handlers)

Some endpoints accept guest tokens at the middleware level but then need to reject guests inside the handler (e.g., confirm import). Rather than a separate middleware, handlers call a helper:

```go
// internal/handlers/util.go

// extractIdentity reads user_id and is_guest from the Gin context.
// Must be called after GuestOrAuth or JWTAuth middleware.
func extractIdentity(c *gin.Context) (userID uuid.UUID, isGuest bool) {
    userID = c.MustGet("user_id").(uuid.UUID)
    isGuest = c.MustGet("is_guest").(bool)
    return
}

// requireRegistered returns false and writes a 403 response if the user is a guest.
// Handlers should return immediately if this returns false.
func requireRegistered(c *gin.Context) bool {
    _, isGuest := extractIdentity(c)
    if isGuest {
        c.JSON(http.StatusForbidden, errorResponse(apperrors.ErrRegistrationRequired))
        return false
    }
    return true
}
```

---

## 4. Password Security

### 4.1 Hashing

**Algorithm**: bcrypt  
**Cost factor**: 12  
**Implementation**: `golang.org/x/crypto/bcrypt`

Cost 12 produces a hash in approximately 250ms on a modern server CPU. This is intentionally slow — it makes brute-force attacks computationally expensive. Do not lower this below 12 without a security review.

```go
// internal/auth/password.go

const bcryptCost = 12

func HashPassword(password string) (string, error) {
    if len(password) > 128 {
        // bcrypt silently truncates at 72 bytes. Reject passwords > 128 chars
        // at validation layer, but defensively enforce here too.
        return "", apperrors.ErrPasswordTooLong
    }
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
    if err != nil {
        return "", fmt.Errorf("hash password: %w", err)
    }
    return string(hash), nil
}

// ComparePassword performs a constant-time comparison.
// Returns nil if the password matches the hash.
// Returns bcrypt.ErrMismatchedHashAndPassword if it does not match.
// Never returns early on mismatch — timing attacks are mitigated by bcrypt's
// constant-time comparison implementation.
func ComparePassword(hash, password string) error {
    return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
```

### 4.2 Timing-Safe User Lookup

To prevent user enumeration via timing differences, the login handler always performs the bcrypt comparison even when the user is not found:

```go
// internal/handlers/auth_handler.go

func (h *authHandler) Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, errorResponse(apperrors.NewValidationError(err)))
        return
    }

    user, err := h.userRepo.GetByEmail(c.Request.Context(), req.Email)
    if err != nil {
        // User not found — still perform a dummy bcrypt comparison to normalize
        // response time and prevent user enumeration via timing attacks.
        _ = auth.ComparePassword("$2a$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", req.Password)
        c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrInvalidCredentials))
        return
    }

    if err := auth.ComparePassword(user.PasswordHash, req.Password); err != nil {
        c.JSON(http.StatusUnauthorized, errorResponse(apperrors.ErrInvalidCredentials))
        return
    }

    // ... generate tokens and respond
}
```

The dummy hash is a valid bcrypt hash format that bcrypt will evaluate (it just won't match anything). The timing of the dummy comparison is close enough to a real comparison that casual timing attacks are not feasible.

### 4.3 Password Validation Rules

- Minimum length: 8 characters
- Maximum length: 128 characters
- No character restrictions (allow Unicode, spaces, special characters)
- No complexity requirements (complexity rules increase friction without meaningful security benefit at this scale)

Validation is performed before hashing in the handler layer:

```go
func validatePassword(password string) error {
    if len(password) < 8 {
        return apperrors.NewValidationError("password", "must be at least 8 characters")
    }
    if len(password) > 128 {
        return apperrors.NewValidationError("password", "must not exceed 128 characters")
    }
    return nil
}
```

---

## 5. Rate Limits

Rate limiting uses an in-memory token bucket per key. The key is the client IP address for public endpoints and the `user_id` for authenticated endpoints.

**Implementation**: `golang.org/x/time/rate` (token bucket algorithm)  
**State**: In-process memory map, sharded by endpoint name to prevent interference between endpoint limits  
**Multi-instance consideration**: Rate limits are per-instance in V1 (Cloud Run single instance or low scale). At higher scale, a Redis-backed rate limiter (e.g., `go-redis/redis_rate`) should replace the in-memory implementation. This is an explicit V2 upgrade path.

### 5.1 Per-Endpoint Rate Limits

| Endpoint | Key | Limit | Window | Notes |
|---|---|---|---|---|
| `POST /auth/register` | IP | 5 | 1 minute | Prevents registration spam |
| `POST /auth/login` | IP | 10 | 1 minute | Soft lockout after 10 failed attempts |
| `POST /auth/refresh` | IP | 30 | 1 minute | Token rotation is frequent; limit is generous |
| `POST /auth/logout` | IP | 60 | 1 minute | Idempotent; high limit |
| `POST /auth/guest` | IP | 3 | 1 hour | Guest account creation is rate-limited strictly |
| `POST /auth/guest/migrate` | IP | 5 | 1 minute | Prevents migration spam |
| `PUT /users/me/password` | user_id | 5 | 1 hour | Password change is sensitive |
| `DELETE /users/me` | user_id | 3 | 1 hour | Account deletion is irreversible |
| `POST /sessions/:id/attempts` | user_id | 500 | 1 minute | Called rapidly during practice (~20/session) |
| `POST /keymaps/upload` | user_id | 20 | 1 hour | File parsing is CPU-intensive |
| `POST /keymaps/github` | user_id | 5 | 10 minutes | Clone is network + CPU intensive |
| `GET /keymaps/github/status/:id` | user_id | 120 | 1 minute | Polling endpoint; high limit |
| `POST /queue/today/regenerate` | user_id | 3 | 1 day | Queue regeneration is once-per-day by design |
| All other GET endpoints | user_id | 60 | 1 minute | Standard read limit |
| All other POST/PUT endpoints | user_id | 10 | 1 minute | Standard write limit |

### 5.2 Rate Limiter Implementation

```go
// internal/middleware/rate_limiter.go

import (
    "sync"
    "time"
    "golang.org/x/time/rate"
    "github.com/gin-gonic/gin"
    "net/http"
)

type limiterEntry struct {
    limiter  *rate.Limiter
    lastSeen time.Time
}

type RateLimiterStore struct {
    mu       sync.Mutex
    limiters map[string]*limiterEntry
    limit    rate.Limit
    burst    int
}

// NewRateLimiterStore creates a store. limit = events per second (converted from requests/window).
// burst allows short bursts up to the window limit.
func NewRateLimiterStore(requestsPerWindow int, window time.Duration) *RateLimiterStore {
    eventsPerSecond := float64(requestsPerWindow) / window.Seconds()
    return &RateLimiterStore{
        limiters: make(map[string]*limiterEntry),
        limit:    rate.Limit(eventsPerSecond),
        burst:    requestsPerWindow, // burst = full window limit
    }
}

func (s *RateLimiterStore) getLimiter(key string) *rate.Limiter {
    s.mu.Lock()
    defer s.mu.Unlock()
    entry, exists := s.limiters[key]
    if !exists {
        entry = &limiterEntry{
            limiter: rate.NewLimiter(s.limit, s.burst),
        }
        s.limiters[key] = entry
    }
    entry.lastSeen = time.Now()
    return entry.limiter
}

// RateLimiter returns a Gin middleware using the given store.
// keyFunc extracts the rate limit key from the context (IP or user_id).
func RateLimiter(store *RateLimiterStore, keyFunc func(*gin.Context) string) gin.HandlerFunc {
    return func(c *gin.Context) {
        key := keyFunc(c)
        limiter := store.getLimiter(key)
        if !limiter.Allow() {
            retryAfter := int(1 / float64(store.limit))
            c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
            c.JSON(http.StatusTooManyRequests, errorResponse(apperrors.ErrRateLimited))
            c.Abort()
            return
        }
        c.Next()
    }
}

// IPKeyFunc extracts client IP for public endpoint rate limiting.
func IPKeyFunc(c *gin.Context) string {
    // Prefer X-Forwarded-For (set by Cloudflare) over RemoteAddr
    ip := c.GetHeader("X-Forwarded-For")
    if ip == "" {
        ip = c.ClientIP()
    }
    return ip
}

// UserIDKeyFunc extracts user_id from Gin context for authenticated endpoint rate limiting.
// Falls back to IP if user_id is not set (should not happen after auth middleware).
func UserIDKeyFunc(c *gin.Context) string {
    if uid, exists := c.Get("user_id"); exists {
        return uid.(uuid.UUID).String()
    }
    return IPKeyFunc(c)
}
```

---

## 6. CORS Configuration

**Library**: `github.com/gin-contrib/cors`

```go
// internal/middleware/cors.go

func CORS(allowedOrigins []string) gin.HandlerFunc {
    config := cors.Config{
        AllowOrigins: allowedOrigins,
        // Allowed HTTP methods
        AllowMethods: []string{
            http.MethodGet,
            http.MethodPost,
            http.MethodPut,
            http.MethodDelete,
            http.MethodOptions,
        },
        // Allowed request headers
        AllowHeaders: []string{
            "Origin",
            "Content-Type",
            "Authorization",
            "X-Request-ID",
            "X-Idempotency-Key",
        },
        // Headers the browser is allowed to read from the response
        ExposeHeaders: []string{
            "X-Request-ID",
            "Retry-After",
        },
        // Required for the httpOnly refresh token cookie to be sent by the browser
        AllowCredentials: true,
        // Browser caches preflight response for 12 hours
        MaxAge: 12 * time.Hour,
    }
    return cors.New(config)
}
```

**Allowed origins by environment**:

```
# Local development (.env)
CORS_ORIGINS=http://localhost:5173,http://localhost:4173

# Production (.env on Cloud Run)
CORS_ORIGINS=https://vimtrainer.dev,https://www.vimtrainer.dev,https://*.vimtrainer.pages.dev
```

**Why `AllowCredentials: true`**: The refresh token is stored in an httpOnly cookie. Cookies are credentials. Without `AllowCredentials: true`, the browser will not include cookies in cross-origin requests and will not expose Set-Cookie headers to JavaScript.

**Why explicit origin list vs wildcard**: `AllowCredentials: true` and `AllowOrigins: ["*"]` are incompatible — CORS spec prohibits wildcards when credentials are allowed. All production frontend origins must be listed explicitly.

**Preflight handling**: The `OPTIONS` method is in `AllowMethods`. Gin's router handles `OPTIONS` requests automatically when a CORS middleware is registered globally.

---

## 7. Stateless Refresh Token Strategy

### 7.1 V1 Design (Stateless)

V1 uses a stateless refresh token. There is no server-side token store. The token's validity is determined entirely by:
1. JWT signature verification (HMAC-SHA256 with `JWT_SECRET`)
2. Token expiry claim (`exp`)
3. Token type claim (`type == "refresh"`)
4. Issuer claim (`iss == "vimtrainer-api"`)

**Accepted risk**: If a refresh token is stolen (e.g., via a compromised device), the attacker can generate new access tokens until the 30-day expiry. There is no server-side mechanism to revoke a refresh token without rotating the `JWT_SECRET` (which invalidates ALL sessions globally).

**Mitigations in V1**:
- Refresh token stored in httpOnly cookie (not accessible from JavaScript, mitigating XSS)
- `SameSite=Strict` cookie attribute (mitigates CSRF)
- `Secure` cookie attribute (prevents transmission over HTTP)
- Short access token lifetime (15 minutes) limits the window of access if stolen
- Refresh endpoint rate-limited (slows brute-force attempts against stolen tokens)

**Acceptable for V1 because**: VimTrainer has no financial data, no sensitive PII beyond email, and a small user base where individual incident response is feasible.

### 7.2 V2 Upgrade Path (Stateful Token Rotation)

When the risk profile warrants it, upgrade to stateful refresh token rotation:

1. **Add `refresh_tokens` table**:
```sql
CREATE TABLE refresh_tokens (
    jti      UUID         PRIMARY KEY,       -- JWT ID (added to refresh token claims)
    user_id  UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,                  -- NULL = valid
    replaced_by UUID                         -- JTI of the token that replaced this one
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
```

2. **Add `jti` claim to refresh tokens**: Include a UUID `jti` (JWT ID) in the refresh token claims.

3. **On token refresh**: Look up `jti` in `refresh_tokens`. If not found or revoked, return 401. If found, insert a new row with a new `jti`, set `replaced_by` on the old row, and issue the new token.

4. **Refresh token reuse detection**: If a `jti` that has already been replaced is presented, the old replacement chain is compromised. Revoke all tokens for the user and force re-login.

5. **Token family invalidation**: On password change, set `revoked_at = NOW()` on all refresh tokens for the user, forcing re-login on all devices.

This upgrade can be performed as a zero-downtime migration: add the new table, update the token generation to include `jti`, update the refresh endpoint to check the table, and add the token-on-issue step. Old tokens without `jti` claims will fail the new lookup and be rejected (forcing re-login once, which is acceptable).

---

## 8. Security Headers

Applied globally via the RequestLogger or a dedicated SecurityHeaders middleware:

```go
// internal/middleware/security_headers.go

func SecurityHeaders() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Prevent MIME type sniffing
        c.Header("X-Content-Type-Options", "nosniff")
        // Prevent clickjacking (API responses — no iframes expected)
        c.Header("X-Frame-Options", "DENY")
        // Strict Transport Security: require HTTPS for 1 year
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        // No referrer information on cross-origin requests
        c.Header("Referrer-Policy", "no-referrer")
        // Content Security Policy for JSON API responses
        c.Header("Content-Security-Policy", "default-src 'none'")
        c.Next()
    }
}
```

---

## 9. Sensitive Data Handling

**Passwords**:
- Never logged (request body logging excludes the `password` field by name)
- Never returned in API responses
- bcrypt-hashed immediately on receipt, before any DB operation
- `password_hash` column never included in SELECT * queries — always explicitly excluded

**JWT secrets**:
- Loaded from environment variable only, never from config files
- Minimum 32 bytes enforced at startup
- Never logged

**Guest tokens**:
- Guest `guest_token` UUID is not the same as the JWT; it is a stable identifier stored in the DB
- The JWT itself is the guest access credential — not stored server-side

**Email addresses**:
- Stored in plaintext (required for login lookup)
- Never logged in request/response logs at INFO level
- Included in ERROR logs only with explicit redaction markers in production

**Request logging**:
```go
// internal/middleware/logger.go
// Fields logged per request:
// - method, path (URL params are logged; query strings are NOT logged — may contain tokens)
// - status, latency, request_id
// - user_id (UUID, no PII)
// - error_code (if 4xx/5xx)
//
// Fields NEVER logged:
// - Authorization header value (contains JWT)
// - Cookie header (contains refresh token)
// - Request body (may contain password or sensitive data)
```
