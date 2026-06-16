# API Specification: VimTrainer
**Version**: 1.0
**Last Updated**: 2026-06-16
**Author**: Backend Architect
**Status**: Production-Ready

---

## Overview

**Base URL**: `https://api.vimtrainer.dev/api/v1` (production), `http://localhost:8080/api/v1` (local dev)

All endpoints use JSON. All responses follow the envelope format:

```json
// Success
{ "data": { ... }, "meta": { ... }, "error": null }

// Error
{ "data": null, "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

**Authentication**: Access token in `Authorization: Bearer <token>` header. Guest sessions use the same header with a guest JWT token. The refresh token is stored in a `refresh_token` httpOnly cookie — never accessed from JavaScript.

**Pagination**: Cursor-based. Responses include `meta.next_cursor` (opaque string, null if no more pages). Pass `?cursor=<value>` on subsequent requests. Maximum `limit` is 100.

**Rate limits**: See individual endpoints. On 429, the response includes `Retry-After: <seconds>` header and body `{"data":null,"error":{"code":"RATE_LIMITED","message":"Too many requests. Retry after N seconds."}}`.

**Idempotency**: POST endpoints that create resources accept an optional `X-Idempotency-Key: <uuid>` header. If the same key is sent twice within 24 hours, the second request returns the original response without re-executing the operation.

**Correlation IDs**: Every response includes `X-Request-ID: <uuid>` in the header. Include this when reporting issues.

---

## Auth Endpoints

### POST /auth/register

Creates a new registered user account.

**Auth required**: No  
**Rate limit**: 5 requests per IP per minute

**Request body**:
```json
{
  "email": "user@example.com",
  "password": "atleast8chars",
  "display_name": "nvim_wizard"
}
```

**Validation**:
- `email`: valid email format, max 255 chars, must not already exist
- `password`: minimum 8 characters, maximum 128 characters
- `display_name`: optional, max 50 characters, alphanumeric + underscores + hyphens only; defaults to email local part

**Success response** `201 Created`:
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "display_name": "nvim_wizard",
      "created_at": "2026-06-16T10:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "meta": {},
  "error": null
}
```

The refresh token is set as an httpOnly cookie named `refresh_token` with `SameSite=Strict; Secure; Path=/api/v1/auth; Max-Age=2592000`.

**Error responses**:
- `400 Bad Request` — `{"error":{"code":"VALIDATION_ERROR","message":"Email is required","details":{"field":"email","issue":"required"}}}`
- `409 Conflict` — `{"error":{"code":"EMAIL_TAKEN","message":"An account with this email already exists"}}`
- `429 Too Many Requests` — rate limit exceeded

**Notes**: Password is bcrypt-hashed at cost 12 before storage. Raw password is never logged.

---

### POST /auth/login

Authenticates a registered user and returns tokens.

**Auth required**: No  
**Rate limit**: 10 requests per IP per minute

**Request body**:
```json
{
  "email": "user@example.com",
  "password": "atleast8chars"
}
```

**Success response** `200 OK`:
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "display_name": "nvim_wizard",
      "current_streak": 7,
      "longest_streak": 14,
      "created_at": "2026-06-16T10:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "meta": {},
  "error": null
}
```

Refresh token set as httpOnly cookie (same attributes as register).

**Error responses**:
- `401 Unauthorized` — `{"error":{"code":"INVALID_CREDENTIALS","message":"Email or password is incorrect"}}` (same message for both wrong email and wrong password — no enumeration)
- `401 Unauthorized` — `{"error":{"code":"ACCOUNT_DELETED","message":"This account has been deactivated"}}` (when `deleted_at IS NOT NULL`)
- `429 Too Many Requests`

**Notes**: bcrypt comparison is always performed even when email is not found, to prevent timing-based user enumeration attacks.

---

### POST /auth/refresh

Exchanges a valid refresh token (from httpOnly cookie) for a new access token and rotated refresh token.

**Auth required**: No (reads httpOnly cookie)  
**Rate limit**: 30 requests per IP per minute

**Request body**: None. The refresh token is read from the `refresh_token` cookie.

**Success response** `200 OK`:
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "meta": {},
  "error": null
}
```

A new `refresh_token` cookie is set, replacing the old one. The new refresh token expires 30 days from now.

**Error responses**:
- `401 Unauthorized` — `{"error":{"code":"INVALID_REFRESH_TOKEN","message":"Refresh token is missing or invalid"}}` (cookie absent, malformed, or expired)

**Notes**: This implementation is stateless — there is no server-side refresh token store in V1. A stolen refresh token can be used until it expires. See auth-design.md for the V2 upgrade path to stateful token rotation.

---

### POST /auth/logout

Clears the refresh token cookie.

**Auth required**: No  
**Rate limit**: 60 requests per IP per minute

**Request body**: None.

**Success response** `204 No Content`.

The `refresh_token` cookie is cleared (set with `Max-Age=0`).

**Error responses**: None. Always returns 204 even if the cookie was not present — logout is idempotent.

---

### POST /auth/guest

Creates a guest user session and returns a JWT guest access token. Guest data (sessions, SRS records) persists for 24 hours. After 24 hours the data is cleaned up and the token is invalid.

**Auth required**: No  
**Rate limit**: 3 requests per IP per hour (prevents guest account farming)

**Request body**: None.

**Success response** `201 Created`:
```json
{
  "data": {
    "guest_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2026-06-17T10:00:00Z",
    "guest_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  },
  "meta": {},
  "error": null
}
```

The `guest_token` is a JWT with `type: "guest"` claim. Use it as `Authorization: Bearer <guest_token>` on practice endpoints.

**Error responses**:
- `429 Too Many Requests`

---

### POST /auth/guest/migrate

Migrates a guest session's data (practice history, SRS records) into a newly created registered account. The guest token must be provided in the `Authorization` header.

**Auth required**: Guest JWT (in Authorization: Bearer header)  
**Rate limit**: 5 requests per IP per minute

**Request body**:
```json
{
  "email": "user@example.com",
  "password": "atleast8chars",
  "display_name": "nvim_wizard"
}
```

**Success response** `200 OK`:
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "display_name": "nvim_wizard",
      "created_at": "2026-06-16T10:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "migrated_sessions": 3,
    "migrated_srs_records": 25
  },
  "meta": {},
  "error": null
}
```

The migration:
1. Creates a new registered user (email + password)
2. Re-assigns all practice sessions from `guest_id` to the new `user_id`
3. Re-assigns all SRS records from `guest_id` to the new `user_id`
4. Invalidates the guest token (marks the guest user as deleted)

The new refresh token cookie is set on the response.

**Error responses**:
- `400 Validation errors` (same as register)
- `401 Unauthorized` — guest token invalid or expired
- `409 Conflict` — email already taken
- `422 Unprocessable Entity` — `{"error":{"code":"GUEST_SESSION_EXPIRED","message":"Guest session has expired. Start a new session or register directly."}}`

---

## Users Endpoints

All Users endpoints require `Authorization: Bearer <access_token>` (registered users only; guest tokens are rejected).

### GET /users/me

Returns the authenticated user's profile and aggregate statistics.

**Auth required**: Registered JWT  
**Rate limit**: 60 requests per user per minute

**Success response** `200 OK`:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "display_name": "nvim_wizard",
    "current_streak": 7,
    "longest_streak": 14,
    "last_active_date": "2026-06-16",
    "created_at": "2026-01-01T00:00:00Z",
    "stats": {
      "total_sessions": 47,
      "total_practice_minutes": 312,
      "all_time_accuracy": 78.4,
      "all_time_avg_response_ms": 1240,
      "keymaps_imported": 83,
      "commands_mastered": 31
    }
  },
  "meta": {},
  "error": null
}
```

`commands_mastered`: keymaps with `correct_reviews / total_reviews >= 0.80` and `total_reviews >= 5`.

---

### PUT /users/me

Updates the authenticated user's profile fields. Only the fields present in the request body are updated.

**Auth required**: Registered JWT  
**Rate limit**: 10 requests per user per minute

**Request body** (all fields optional):
```json
{
  "display_name": "new_handle"
}
```

**Validation**:
- `display_name`: 1-50 chars, alphanumeric + underscore + hyphen

**Success response** `200 OK`:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "display_name": "new_handle",
    "updated_at": "2026-06-16T12:00:00Z"
  },
  "meta": {},
  "error": null
}
```

**Error responses**:
- `400 Bad Request` — validation errors

---

### PUT /users/me/password

Changes the authenticated user's password. Requires the current password to prevent session hijacking attacks where an attacker with an access token changes the password.

**Auth required**: Registered JWT  
**Rate limit**: 5 requests per user per hour

**Request body**:
```json
{
  "current_password": "current_secret",
  "new_password": "new_secret_at_least_8"
}
```

**Success response** `204 No Content`.

**Error responses**:
- `401 Unauthorized` — `{"error":{"code":"WRONG_PASSWORD","message":"Current password is incorrect"}}`
- `400 Bad Request` — new password too short (< 8 chars) or too long (> 128 chars)

**Notes**: On success, all existing refresh token cookies remain valid (stateless). The user does not get logged out of other devices. A V2 improvement would be to invalidate all sessions on password change by storing token JTI in a blocklist.

---

### DELETE /users/me

Soft-deletes the authenticated user's account. Requires a confirmation phrase.

**Auth required**: Registered JWT  
**Rate limit**: 3 requests per user per hour

**Request body**:
```json
{
  "confirmation": "delete my account"
}
```

**Success response** `204 No Content`.

**Error responses**:
- `400 Bad Request` — `{"error":{"code":"CONFIRMATION_REQUIRED","message":"Please send {\"confirmation\":\"delete my account\"} to confirm account deletion"}}`

**Notes**: Sets `deleted_at = NOW()` on the user. A background job hard-deletes after 30 days. The refresh token cookie is cleared on response.

---

## Keymaps Endpoints

### GET /keymaps

Lists the authenticated user's keymaps with filtering, sorting, and cursor-based pagination.

**Auth required**: Registered JWT  
**Rate limit**: 60 requests per user per minute

**Query parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | int | 50 | Items per page. Max 100. |
| `cursor` | string | — | Opaque cursor from previous response `meta.next_cursor` |
| `mode` | string | — | Filter by mode: `n`, `i`, `v`, `x`, `o`, `t`, `c` |
| `category` | string | — | Filter by category: `motion`, `leader`, `lsp`, `navigation`, `editing`, `plugin`, `other` |
| `source_id` | uuid | — | Filter by keymap source |
| `search` | string | — | Substring match on `key_sequence` or `description` (case-insensitive) |
| `include_builtin` | bool | false | Include built-in keymaps in results |

**Success response** `200 OK`:
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "key_sequence": "<leader>ff",
      "mode": "n",
      "description": "Find files with Telescope",
      "category": "plugin",
      "source_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "source_name": "init.lua",
      "is_builtin": false,
      "created_at": "2026-06-10T08:00:00Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "key_sequence": "gd",
      "mode": "n",
      "description": "Go to definition (LSP)",
      "category": "lsp",
      "source_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "source_name": "lsp.lua",
      "is_builtin": false,
      "created_at": "2026-06-10T08:00:00Z"
    }
  ],
  "meta": {
    "total": 83,
    "limit": 50,
    "next_cursor": "eyJpZCI6ImIyYzNkNGU1In0="
  },
  "error": null
}
```

**Error responses**:
- `400 Bad Request` — invalid `mode`, `category`, or `limit > 100`

---

### POST /keymaps/upload

Uploads a ZIP file or single Lua/VimScript file for parsing. Does not persist to database — returns a preview of parsed keymaps for the user to review before confirming. The parsed result is cached server-side for 10 minutes under a `preview_token`.

**Auth required**: Guest JWT or Registered JWT  
**Rate limit**: 20 requests per user per hour

**Request**: `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | yes | ZIP, `.lua`, or `.vim` / `.vimrc` file |

**Constraints**:
- Maximum file size: 10MB
- ZIP files: path traversal protection (no `..` in extracted paths), no executable files, max 100 files per archive
- Accepted MIME types: `application/zip`, `text/plain`, `application/octet-stream`

**Success response** `200 OK`:
```json
{
  "data": {
    "preview_token": "tok_preview_a1b2c3d4e5f6",
    "expires_at": "2026-06-16T10:10:00Z",
    "parse_result": {
      "total_found": 47,
      "lines_scanned": 312,
      "lines_failed": 5,
      "failed_lines": [
        "vim.keymap.set('n', '<leader>x', require('trouble').toggle, { desc = ..."
      ],
      "keymaps": [
        {
          "key_sequence": "<leader>ff",
          "mode": "n",
          "description": "Find files",
          "category": "plugin",
          "source_file": "lua/plugins/telescope.lua"
        }
      ]
    }
  },
  "meta": {},
  "error": null
}
```

**Error responses**:
- `400 Bad Request` — `{"error":{"code":"INVALID_FILE_TYPE","message":"Only .lua, .vim, .vimrc, and .zip files are accepted"}}`
- `400 Bad Request` — `{"error":{"code":"FILE_TOO_LARGE","message":"File must be under 10MB"}}`
- `400 Bad Request` — `{"error":{"code":"PATH_TRAVERSAL_DETECTED","message":"Archive contains invalid file paths"}}`
- `422 Unprocessable Entity` — `{"error":{"code":"PARSE_NO_RESULTS","message":"No keymaps found in the provided file. Ensure the file contains vim.keymap.set() or noremap calls."}}`

---

### POST /keymaps/upload/confirm

Persists a previously uploaded and parsed keymap set to the database. Requires the `preview_token` from the upload step.

**Auth required**: Registered JWT (guests cannot persist imports)  
**Rate limit**: 20 requests per user per hour

**Request body**:
```json
{
  "preview_token": "tok_preview_a1b2c3d4e5f6",
  "source_name": "My Neovim Config",
  "keymap_indices": [0, 1, 2, 4, 7]
}
```

`keymap_indices`: optional array of indices into the `parse_result.keymaps` array from the upload response. If omitted, all parsed keymaps are imported.

**Success response** `201 Created`:
```json
{
  "data": {
    "source": {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "source_name": "My Neovim Config",
      "source_type": "file_upload",
      "keymap_count": 45
    },
    "imported": 45,
    "skipped_duplicates": 2,
    "created_at": "2026-06-16T10:05:00Z"
  },
  "meta": {},
  "error": null
}
```

**Error responses**:
- `400 Bad Request` — `{"error":{"code":"INVALID_PREVIEW_TOKEN","message":"Preview token is invalid or has expired"}}`
- `409 Conflict` — `{"error":{"code":"ALL_DUPLICATES","message":"All keymaps in this upload already exist in your practice set"}}`

---

### POST /keymaps/github

Triggers a GitHub repository import. Clones the repo server-side, parses all Neovim config files, and returns a preview. Returns a `job_id` for polling job status (for large repos the clone can take up to 30 seconds).

**Auth required**: Guest JWT or Registered JWT  
**Rate limit**: 5 requests per user per 10 minutes

**Request body**:
```json
{
  "github_url": "https://github.com/username/dotfiles"
}
```

**Validation**:
- Must be a valid `https://github.com/` URL (no SSH URLs, no subpaths beyond user/repo)
- Repo must be publicly accessible

**Success response** `202 Accepted`:
```json
{
  "data": {
    "job_id": "job_a1b2c3d4e5f6789012345678901234",
    "status": "pending",
    "github_url": "https://github.com/username/dotfiles",
    "estimated_seconds": 15
  },
  "meta": {},
  "error": null
}
```

**Error responses**:
- `400 Bad Request` — `{"error":{"code":"INVALID_GITHUB_URL","message":"URL must be a public GitHub repository in the format https://github.com/user/repo"}}`
- `429 Too Many Requests`

---

### GET /keymaps/github/status/:job_id

Polls the status of a GitHub import job. Poll with exponential backoff: 1s, 2s, 4s, up to 8s.

**Auth required**: Guest JWT or Registered JWT  
**Rate limit**: 120 requests per user per minute (high limit for polling)

**Path parameter**: `job_id` — the job ID from the POST /keymaps/github response.

**Success response** `200 OK` — while in progress:
```json
{
  "data": {
    "job_id": "job_a1b2c3d4e5f6789012345678901234",
    "status": "cloning",
    "progress_message": "Cloning repository...",
    "github_url": "https://github.com/username/dotfiles"
  },
  "meta": {},
  "error": null
}
```

**Status values**: `pending`, `cloning`, `locating`, `parsing`, `complete`, `failed`

**Success response** `200 OK` — when complete:
```json
{
  "data": {
    "job_id": "job_a1b2c3d4e5f6789012345678901234",
    "status": "complete",
    "preview_token": "tok_preview_b2c3d4e5f6a7",
    "expires_at": "2026-06-16T10:10:00Z",
    "framework": "lazyvim",
    "config_dir": "/.config/nvim",
    "parse_result": {
      "total_found": 83,
      "lines_scanned": 1247,
      "lines_failed": 12,
      "keymaps": [
        {
          "key_sequence": "<leader>ff",
          "mode": "n",
          "description": "Find files",
          "category": "plugin",
          "source_file": "lua/plugins/telescope.lua"
        }
      ]
    }
  },
  "meta": {},
  "error": null
}
```

**Success response** `200 OK` — when failed:
```json
{
  "data": {
    "job_id": "job_a1b2c3d4e5f6789012345678901234",
    "status": "failed",
    "error_code": "CLONE_TIMEOUT",
    "error_message": "Repository clone timed out. Try uploading specific files instead."
  },
  "meta": {},
  "error": null
}
```

**Error responses**:
- `404 Not Found` — job_id not found or belongs to another user
- `400 Bad Request` — malformed job_id

---

### GET /keymaps/sources

Lists all keymap import sources for the authenticated user.

**Auth required**: Registered JWT  
**Rate limit**: 60 requests per user per minute

**Success response** `200 OK`:
```json
{
  "data": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "source_type": "file_upload",
      "source_name": "My Neovim Config",
      "github_url": null,
      "keymap_count": 45,
      "parsed_at": "2026-06-10T08:00:00Z"
    },
    {
      "id": "d4e5f6a7-b8c9-0123-def0-234567890123",
      "source_type": "github_import",
      "source_name": "username/dotfiles",
      "github_url": "https://github.com/username/dotfiles",
      "keymap_count": 83,
      "parsed_at": "2026-06-12T14:00:00Z"
    }
  ],
  "meta": {
    "total": 2
  },
  "error": null
}
```

---

### DELETE /keymaps/sources/:id

Soft-deletes a keymap source and all associated keymaps. Removes the keymaps from the user's active practice set but preserves SRS history.

**Auth required**: Registered JWT  
**Rate limit**: 10 requests per user per minute

**Path parameter**: `id` — UUID of the keymap source.

**Success response** `200 OK`:
```json
{
  "data": {
    "deleted_source_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "keymaps_removed": 45
  },
  "meta": {},
  "error": null
}
```

**Error responses**:
- `404 Not Found` — source not found or not owned by user
- `403 Forbidden` — attempt to delete a `builtin` source

---

### GET /keymaps/builtin

Lists all built-in Vim motion keymaps (the shared library). Used by the frontend to populate the Motion Trainer mode.

**Auth required**: Guest JWT or Registered JWT  
**Rate limit**: 60 requests per user per minute

**Query parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `category` | string | — | Filter by category |
| `mode` | string | — | Filter by Vim mode |

**Success response** `200 OK`:
```json
{
  "data": [
    {
      "id": "e5f6a7b8-c9d0-1234-ef01-345678901234",
      "key_sequence": "ciw",
      "mode": "n",
      "description": "Change inner word (delete word and enter insert mode)",
      "category": "editing"
    }
  ],
  "meta": {
    "total": 68
  },
  "error": null
}
```

---

## Sessions Endpoints

### POST /sessions

Creates a new practice session. Returns the session ID and the ordered list of keymap challenges for the session. The challenge order is fixed at session creation and does not change mid-session.

**Auth required**: Guest JWT or Registered JWT  
**Rate limit**: 60 requests per user per minute

**Request body**:
```json
{
  "mode": "practice",
  "length": 20,
  "keymap_ids": []
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `mode` | string | yes | `practice`, `motion`, `leader`, `flashcard` |
| `length` | int | yes | Number of challenges: 10, 20, or 30 |
| `keymap_ids` | uuid[] | no | Pre-specified keymap IDs. If empty, auto-selected based on mode and SRS. |

**Mode behavior**:
- `practice`: draws from user's imported keymaps, SRS-prioritized
- `motion`: draws from built-in Vim motions only
- `leader`: draws from keymaps with `category = 'leader'`
- `flashcard`: draws from user's SRS records where `next_review_at <= NOW()`, ordered by due date ascending

**Success response** `201 Created`:
```json
{
  "data": {
    "session_id": "f6a7b8c9-d0e1-2345-f012-456789012345",
    "mode": "practice",
    "challenges": [
      {
        "index": 0,
        "keymap_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "description": "Find files with Telescope",
        "category": "plugin",
        "mode": "n"
      },
      {
        "index": 1,
        "keymap_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "description": "Go to definition",
        "category": "lsp",
        "mode": "n"
      }
    ],
    "total_challenges": 20,
    "started_at": "2026-06-16T10:00:00Z"
  },
  "meta": {},
  "error": null
}
```

Note: `key_sequence` (the correct answer) is deliberately absent from the challenges list. It is revealed only after each attempt via the attempt endpoint.

**Error responses**:
- `400 Bad Request` — invalid `mode` or `length`
- `422 Unprocessable Entity` — `{"error":{"code":"INSUFFICIENT_KEYMAPS","message":"Not enough keymaps in your practice set. Import keymaps first or switch to Motion mode."}}`

---

### GET /sessions/:id

Returns a session's details and all recorded attempts. Used for the post-session review screen.

**Auth required**: Guest JWT or Registered JWT  
**Rate limit**: 60 requests per user per minute

**Path parameter**: `id` — UUID of the session.

**Success response** `200 OK`:
```json
{
  "data": {
    "id": "f6a7b8c9-d0e1-2345-f012-456789012345",
    "mode": "practice",
    "status": "complete",
    "total_attempts": 20,
    "correct_attempts": 17,
    "accuracy": 85.00,
    "avg_response_ms": 1340,
    "score": 8700,
    "streak_achieved": 9,
    "started_at": "2026-06-16T10:00:00Z",
    "completed_at": "2026-06-16T10:08:22Z",
    "attempts": [
      {
        "index": 0,
        "keymap_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "key_sequence": "<leader>ff",
        "description": "Find files with Telescope",
        "user_input": "<leader>ff",
        "is_correct": true,
        "response_ms": 980,
        "attempted_at": "2026-06-16T10:00:03Z"
      },
      {
        "index": 1,
        "keymap_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "key_sequence": "gd",
        "description": "Go to definition",
        "user_input": "gD",
        "is_correct": false,
        "response_ms": 2100,
        "attempted_at": "2026-06-16T10:00:06Z"
      }
    ]
  },
  "meta": {},
  "error": null
}
```

Note: `key_sequence` IS included here (session is over, revealing answers is appropriate).

**Error responses**:
- `404 Not Found` — session not found or not owned by user
- `403 Forbidden` — session belongs to a different user

---

### POST /sessions/:id/attempts

Records a single challenge attempt within an in-progress session. Validates correctness, updates SRS state, and returns the correct answer and feedback. The client calls this once per challenge as the user answers.

**Auth required**: Guest JWT or Registered JWT  
**Rate limit**: 500 requests per user per minute (high limit — called rapidly during practice)

**Path parameter**: `id` — UUID of the session.

**Request body**:
```json
{
  "keymap_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_input": "<leader>ff",
  "response_ms": 1240
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `keymap_id` | uuid | yes | The keymap being answered |
| `user_input` | string | yes | Exactly what the user typed |
| `response_ms` | int | yes | Milliseconds from challenge display to submission |

**Success response** `200 OK`:
```json
{
  "data": {
    "is_correct": true,
    "correct_answer": "<leader>ff",
    "user_input": "<leader>ff",
    "response_ms": 1240,
    "current_streak": 5,
    "srs_updated": true
  },
  "meta": {},
  "error": null
}
```

`correct_answer` is always returned (even when `is_correct: true`) so the frontend can confirm the displayed answer.

**Error responses**:
- `400 Bad Request` — `{"error":{"code":"VALIDATION_ERROR","message":"keymap_id is required"}}`
- `404 Not Found` — session not found
- `409 Conflict` — `{"error":{"code":"SESSION_ALREADY_COMPLETE","message":"This session has already been completed"}}`
- `422 Unprocessable Entity` — `{"error":{"code":"KEYMAP_NOT_IN_SESSION","message":"This keymap is not part of the current session"}}`

**Notes**: For guest users, SRS records are stored with the guest's user_id. They migrate to the registered user_id on account creation.

---

### POST /sessions/:id/complete

Marks a session as complete. Computes final accuracy, score, and streak. Evaluates achievements. Returns newly unlocked achievements and updated streak.

**Auth required**: Guest JWT or Registered JWT  
**Rate limit**: 60 requests per user per minute

**Path parameter**: `id` — UUID of the session.

**Request body**: None.

**Success response** `200 OK`:
```json
{
  "data": {
    "session_id": "f6a7b8c9-d0e1-2345-f012-456789012345",
    "total_attempts": 20,
    "correct_attempts": 17,
    "accuracy": 85.00,
    "avg_response_ms": 1340,
    "score": 8700,
    "streak_achieved": 9,
    "newly_unlocked_achievements": [
      {
        "slug": "first_session",
        "name": "First Session",
        "description": "You completed your very first practice session.",
        "icon_name": "trophy"
      }
    ],
    "current_daily_streak": 4,
    "completed_at": "2026-06-16T10:08:22Z"
  },
  "meta": {},
  "error": null
}
```

**Error responses**:
- `404 Not Found` — session not found
- `409 Conflict` — `{"error":{"code":"SESSION_ALREADY_COMPLETE","message":"Session has already been completed"}}`
- `422 Unprocessable Entity` — `{"error":{"code":"SESSION_HAS_NO_ATTEMPTS","message":"Cannot complete a session with no recorded attempts"}}`

---

## SRS Endpoints

### GET /srs/queue

Returns the user's SRS-ordered practice queue: keymaps due for review, sorted by how overdue they are (most overdue first).

**Auth required**: Registered JWT  
**Rate limit**: 30 requests per user per minute

**Query parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | int | 50 | Max keymaps to return. Max 100. |

**Success response** `200 OK`:
```json
{
  "data": {
    "due_count": 12,
    "overdue_count": 3,
    "queue": [
      {
        "keymap_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "key_sequence": "<leader>ff",
        "description": "Find files with Telescope",
        "category": "plugin",
        "mode": "n",
        "next_review_at": "2026-06-14T10:00:00Z",
        "days_overdue": 2,
        "ease_factor": 2.30,
        "interval_days": 7,
        "total_reviews": 8,
        "correct_reviews": 6
      }
    ]
  },
  "meta": {},
  "error": null
}
```

---

### GET /srs/records

Lists all SRS records for the authenticated user. Used for the "My Progress" debug view.

**Auth required**: Registered JWT  
**Rate limit**: 30 requests per user per minute

**Query parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | int | 50 | Max 100. |
| `cursor` | string | — | Pagination cursor |
| `sort` | string | `next_review_at` | Sort field: `next_review_at`, `ease_factor`, `accuracy` |
| `order` | string | `asc` | `asc` or `desc` |

**Success response** `200 OK`:
```json
{
  "data": [
    {
      "keymap_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "key_sequence": "<leader>ff",
      "description": "Find files with Telescope",
      "interval_days": 7,
      "ease_factor": 2.30,
      "repetitions": 3,
      "next_review_at": "2026-06-20T10:00:00Z",
      "last_reviewed_at": "2026-06-13T10:00:00Z",
      "total_reviews": 8,
      "correct_reviews": 6,
      "accuracy": 75.0
    }
  ],
  "meta": {
    "total": 83,
    "next_cursor": "eyJpZCI6ImIyYzNkNGU1In0="
  },
  "error": null
}
```

---

### GET /srs/due

Returns only the keymaps currently due for review (`next_review_at <= NOW()`). Used by the flashcard session bootstrap.

**Auth required**: Registered JWT  
**Rate limit**: 30 requests per user per minute

**Query parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | int | 50 | Max 100. |

**Success response** `200 OK`:
```json
{
  "data": {
    "due_count": 12,
    "keymaps": [
      {
        "keymap_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "key_sequence": "<leader>ff",
        "description": "Find files with Telescope",
        "category": "plugin",
        "mode": "n",
        "next_review_at": "2026-06-14T10:00:00Z",
        "interval_days": 7
      }
    ]
  },
  "meta": {},
  "error": null
}
```

---

## Analytics Endpoints

All analytics endpoints require a registered JWT. Analytics are computed from completed practice sessions only.

### GET /analytics/summary

Returns all analytics data for the dashboard. Accepts a date range; defaults to last 30 days.

**Auth required**: Registered JWT  
**Rate limit**: 20 requests per user per minute

**Query parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `days` | int | 30 | Lookback window in days. Max 365. |
| `from` | date | — | ISO date string `YYYY-MM-DD`. Overrides `days`. |
| `to` | date | — | ISO date string `YYYY-MM-DD`. Defaults to today if `from` is set. |

**Success response** `200 OK`:
```json
{
  "data": {
    "period": {
      "from": "2026-05-17",
      "to": "2026-06-16",
      "days": 30
    },
    "totals": {
      "sessions_completed": 23,
      "challenges_answered": 460,
      "correct_answers": 382,
      "accuracy": 83.04,
      "total_practice_minutes": 184
    },
    "accuracy_trend": [
      { "date": "2026-05-17", "accuracy": 71.5, "session_count": 1 },
      { "date": "2026-05-20", "accuracy": 75.0, "session_count": 2 }
    ],
    "response_time_trend": [
      { "date": "2026-05-17", "avg_ms": 1840, "session_count": 1 }
    ],
    "practice_time": [
      { "date": "2026-05-17", "minutes": 8 },
      { "date": "2026-05-20", "minutes": 16 }
    ],
    "category_breakdown": [
      { "category": "lsp", "total": 120, "correct": 108, "accuracy": 90.0 },
      { "category": "leader", "total": 80, "correct": 60, "accuracy": 75.0 }
    ]
  },
  "meta": {},
  "error": null
}
```

---

### GET /analytics/accuracy-trend

Returns daily accuracy data points for charting. Lighter endpoint for incremental dashboard updates.

**Auth required**: Registered JWT  
**Rate limit**: 20 requests per user per minute

**Query parameters**: Same as `/analytics/summary` (`days`, `from`, `to`)

**Success response** `200 OK`:
```json
{
  "data": {
    "period": { "from": "2026-05-17", "to": "2026-06-16", "days": 30 },
    "points": [
      { "date": "2026-05-17", "accuracy": 71.5, "session_count": 1 },
      { "date": "2026-05-18", "accuracy": null, "session_count": 0 }
    ]
  },
  "meta": {},
  "error": null
}
```

`accuracy: null` for days with no sessions (frontend should render as gap in chart).

---

### GET /analytics/response-time-trend

Returns daily average response time data points.

**Auth required**: Registered JWT  
**Rate limit**: 20 requests per user per minute

**Query parameters**: Same as `/analytics/summary`

**Success response** `200 OK`:
```json
{
  "data": {
    "period": { "from": "2026-05-17", "to": "2026-06-16", "days": 30 },
    "points": [
      { "date": "2026-05-17", "avg_ms": 1840, "session_count": 1 },
      { "date": "2026-05-18", "avg_ms": null, "session_count": 0 }
    ]
  },
  "meta": {},
  "error": null
}
```

---

### GET /analytics/practice-time

Returns daily practice time in minutes.

**Auth required**: Registered JWT  
**Rate limit**: 20 requests per user per minute

**Query parameters**: Same as `/analytics/summary`

**Success response** `200 OK`:
```json
{
  "data": {
    "period": { "from": "2026-05-17", "to": "2026-06-16", "days": 30 },
    "total_minutes": 184,
    "points": [
      { "date": "2026-05-17", "minutes": 8 },
      { "date": "2026-05-20", "minutes": 16 }
    ]
  },
  "meta": {},
  "error": null
}
```

---

### GET /analytics/most-missed

Returns the keymaps with the highest error rate in the given period.

**Auth required**: Registered JWT  
**Rate limit**: 20 requests per user per minute

**Query parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `days` | int | 30 | Lookback window. Max 365. |
| `limit` | int | 10 | Number of results. Max 50. |
| `min_attempts` | int | 3 | Minimum attempt count to include a keymap. |

**Success response** `200 OK`:
```json
{
  "data": [
    {
      "keymap_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "key_sequence": "<leader>rn",
      "description": "Rename symbol (LSP)",
      "category": "lsp",
      "mode": "n",
      "error_rate": 0.71,
      "total_attempts": 14,
      "correct_attempts": 4
    }
  ],
  "meta": {},
  "error": null
}
```

---

### GET /analytics/most-improved

Returns keymaps where accuracy improved most between the first and second halves of the period.

**Auth required**: Registered JWT  
**Rate limit**: 20 requests per user per minute

**Query parameters**: Same as `/analytics/most-missed`

**Success response** `200 OK`:
```json
{
  "data": [
    {
      "keymap_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "key_sequence": "ciw",
      "description": "Change inner word",
      "category": "editing",
      "mode": "n",
      "accuracy_first_half": 40.0,
      "accuracy_second_half": 88.0,
      "improvement_pct": 48.0,
      "total_attempts": 20
    }
  ],
  "meta": {},
  "error": null
}
```

---

### GET /analytics/category-breakdown

Returns accuracy and attempt counts broken down by keymap category.

**Auth required**: Registered JWT  
**Rate limit**: 20 requests per user per minute

**Query parameters**: Same as `/analytics/summary`

**Success response** `200 OK`:
```json
{
  "data": [
    { "category": "lsp", "total_attempts": 120, "correct_attempts": 108, "accuracy": 90.0, "keymap_count": 18 },
    { "category": "leader", "total_attempts": 80, "correct_attempts": 60, "accuracy": 75.0, "keymap_count": 12 },
    { "category": "motion", "total_attempts": 60, "correct_attempts": 54, "accuracy": 90.0, "keymap_count": 42 },
    { "category": "editing", "total_attempts": 100, "correct_attempts": 80, "accuracy": 80.0, "keymap_count": 24 },
    { "category": "navigation", "total_attempts": 40, "correct_attempts": 32, "accuracy": 80.0, "keymap_count": 8 },
    { "category": "plugin", "total_attempts": 60, "correct_attempts": 40, "accuracy": 66.7, "keymap_count": 15 },
    { "category": "other", "total_attempts": 20, "correct_attempts": 16, "accuracy": 80.0, "keymap_count": 4 }
  ],
  "meta": {},
  "error": null
}
```

---

## Achievements Endpoints

### GET /achievements

Returns all achievement definitions with the authenticated user's earned/locked status.

**Auth required**: Registered JWT  
**Rate limit**: 30 requests per user per minute

**Success response** `200 OK`:
```json
{
  "data": [
    {
      "slug": "first_session",
      "name": "First Session",
      "description": "You completed your very first practice session.",
      "icon_name": "trophy",
      "condition_type": "session_count",
      "condition_value": 1,
      "earned": true,
      "unlocked_at": "2026-06-01T09:14:00Z"
    },
    {
      "slug": "streak_30",
      "name": "30-Day Streak",
      "description": "Thirty days without missing a single daily queue.",
      "icon_name": "calendar-check",
      "condition_type": "streak_days",
      "condition_value": 30,
      "earned": false,
      "unlocked_at": null
    }
  ],
  "meta": {
    "total": 10,
    "earned": 3
  },
  "error": null
}
```

---

### GET /achievements/recent

Returns the most recently unlocked achievements for the authenticated user. Used by the dashboard widget.

**Auth required**: Registered JWT  
**Rate limit**: 30 requests per user per minute

**Query parameters**:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | int | 5 | Max 20. |

**Success response** `200 OK`:
```json
{
  "data": [
    {
      "slug": "accuracy_king",
      "name": "Accuracy King",
      "description": "You nailed every single challenge in a session of 10 or more commands.",
      "icon_name": "crown",
      "unlocked_at": "2026-06-15T21:40:00Z"
    }
  ],
  "meta": {
    "total_earned": 4
  },
  "error": null
}
```

---

## Queue Endpoints

### GET /queue/today

Returns the authenticated user's daily queue for today (UTC date). If no queue has been generated yet for today, generates one and returns it. The queue is fixed once generated — subsequent calls on the same day return the same queue.

**Auth required**: Registered JWT  
**Rate limit**: 30 requests per user per minute

**Success response** `200 OK`:
```json
{
  "data": {
    "queue_id": "a7b8c9d0-e1f2-3456-0123-567890123456",
    "queue_date": "2026-06-16",
    "generated_at": "2026-06-16T08:00:00Z",
    "completed_at": null,
    "is_complete": false,
    "keymaps": [
      {
        "position": 1,
        "keymap_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "key_sequence": "<leader>ff",
        "description": "Find files with Telescope",
        "category": "plugin",
        "mode": "n",
        "srs_interval_days": 3,
        "days_overdue": 1
      }
    ],
    "total": 20,
    "composition": {
      "weakest": 10,
      "never_practiced": 5,
      "random": 5
    }
  },
  "meta": {},
  "error": null
}
```

**Error responses**:
- `422 Unprocessable Entity` — `{"error":{"code":"INSUFFICIENT_KEYMAPS","message":"You need at least 5 keymaps in your practice set to generate a daily queue. Import keymaps or enable built-in motions."}}`

---

### POST /queue/today/regenerate

Regenerates the daily queue for today. Replaces the existing queue if one exists. Only allowed if the current queue has not been marked complete.

**Auth required**: Registered JWT  
**Rate limit**: 3 requests per user per day

**Request body**: None.

**Success response** `200 OK` — returns same structure as `GET /queue/today`.

**Error responses**:
- `409 Conflict` — `{"error":{"code":"QUEUE_ALREADY_COMPLETE","message":"Cannot regenerate a completed daily queue"}}`
- `429 Too Many Requests` — regeneration limit reached for today

---

## Settings Endpoints

### GET /settings

Returns the authenticated user's settings. If no settings row exists, returns the application defaults.

**Auth required**: Registered JWT  
**Rate limit**: 60 requests per user per minute

**Success response** `200 OK`:
```json
{
  "data": {
    "theme": "dark",
    "session_duration_minutes": 10,
    "sounds_enabled": true,
    "animations_enabled": true,
    "keyboard_layout": "qwerty",
    "leader_key_symbol": "<leader>",
    "updated_at": "2026-06-10T14:00:00Z"
  },
  "meta": {},
  "error": null
}
```

---

### PUT /settings

Updates the authenticated user's settings. All fields are optional in the request body — only fields present are updated. Performs an UPSERT (creates the settings row if it does not exist).

**Auth required**: Registered JWT  
**Rate limit**: 10 requests per user per minute

**Request body** (all fields optional):
```json
{
  "theme": "light",
  "session_duration_minutes": 20,
  "sounds_enabled": false,
  "animations_enabled": true,
  "keyboard_layout": "colemak",
  "leader_key_symbol": "<space>"
}
```

**Validation**:
- `theme`: `dark`, `light`, `system`
- `session_duration_minutes`: `5`, `10`, `15`, `20`, `30`
- `keyboard_layout`: `qwerty`, `dvorak`, `colemak`
- `leader_key_symbol`: `<leader>`, `<space>`, `\`, `,`, `g`

**Success response** `200 OK`:
```json
{
  "data": {
    "theme": "light",
    "session_duration_minutes": 20,
    "sounds_enabled": false,
    "animations_enabled": true,
    "keyboard_layout": "colemak",
    "leader_key_symbol": "<space>",
    "updated_at": "2026-06-16T12:00:00Z"
  },
  "meta": {},
  "error": null
}
```

**Error responses**:
- `400 Bad Request` — invalid field value with details on which field and accepted values

---

## Health Endpoint

### GET /health

Returns system health status. Used by Cloud Run health checks and monitoring. No authentication required.

**Auth required**: No  
**Rate limit**: None (exempt from rate limiting)

**Success response** `200 OK`:
```json
{
  "data": {
    "status": "ok",
    "version": "1.0.0",
    "environment": "production",
    "timestamp": "2026-06-16T10:00:00Z",
    "checks": {
      "database": "ok",
      "storage": "ok"
    }
  },
  "meta": {},
  "error": null
}
```

**Degraded response** `503 Service Unavailable`:
```json
{
  "data": {
    "status": "degraded",
    "version": "1.0.0",
    "environment": "production",
    "timestamp": "2026-06-16T10:00:00Z",
    "checks": {
      "database": "error: connection refused",
      "storage": "ok"
    }
  },
  "meta": {},
  "error": null
}
```

**Notes**: The health check pings the database with `SELECT 1` and verifies the storage path is accessible. If any check fails, the overall status is `degraded` and HTTP 503 is returned. Cloud Run will not route traffic to an instance returning 503 on the health check path.

---

## Error Code Reference

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body or query param failed validation |
| `INVALID_FILE_TYPE` | 400 | Uploaded file is not an accepted type |
| `FILE_TOO_LARGE` | 400 | Uploaded file exceeds 10MB |
| `PATH_TRAVERSAL_DETECTED` | 400 | ZIP archive contains invalid paths |
| `INVALID_GITHUB_URL` | 400 | Not a valid public GitHub repo URL |
| `INVALID_PREVIEW_TOKEN` | 400 | Preview token missing, invalid, or expired |
| `CONFIRMATION_REQUIRED` | 400 | Account deletion missing confirmation string |
| `INVALID_UUID` | 400 | Path parameter is not a valid UUID |
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token missing, invalid, or expired |
| `GUEST_SESSION_EXPIRED` | 401 | Guest session older than 24 hours |
| `ACCOUNT_DELETED` | 401 | Account has been soft-deleted |
| `WRONG_PASSWORD` | 401 | Current password incorrect on password change |
| `FORBIDDEN` | 403 | Access to resource not owned by user |
| `NOT_FOUND` | 404 | Resource does not exist |
| `EMAIL_TAKEN` | 409 | Email already registered |
| `SESSION_ALREADY_COMPLETE` | 409 | Attempt to complete an already-complete session |
| `QUEUE_ALREADY_COMPLETE` | 409 | Attempt to regenerate a completed daily queue |
| `ALL_DUPLICATES` | 409 | All keymaps in upload already exist |
| `KEYMAP_NOT_IN_SESSION` | 422 | Attempt for a keymap not in the session's challenge set |
| `SESSION_HAS_NO_ATTEMPTS` | 422 | Complete called with zero recorded attempts |
| `PARSE_NO_RESULTS` | 422 | File parsed but no keymaps were found |
| `INSUFFICIENT_KEYMAPS` | 422 | Not enough keymaps to generate session or queue |
| `CLONE_TIMEOUT` | 422 | GitHub clone exceeded 30 second timeout |
| `NO_NEOVIM_CONFIG` | 422 | No Neovim config directory found in repo |
| `RATE_LIMITED` | 429 | Rate limit exceeded for this endpoint |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
