# DEV PULSE AI — Security Architecture & Hardening

## 1. Authentication & Token Management

- **Password Hashing**: Cryptographic password hashing using standard bcrypt with salt rounds $\ge 12$.
- **JWT Standard**:
  - Access Token: Short-lived (15 minutes), signed with `HS256` / `RS256`, containing `user_id`, `org_id`, and `role`.
  - Refresh Token: Long-lived (7–30 days), stored in database with rotation on every use to prevent replay attacks.
- **Revocation**: Token revocation list managed with TTL in Redis.

---

## 2. API Key Security & RBAC

- Ingestion API keys follow the format: `dp_live_<random_hex_32>`.
- Only the SHA-256 hash is persisted in the PostgreSQL database.
- Keys are hashed with SHA-256 for fast lookup and Redis caching.
- **Roles**:
  - `OWNER`: Full administrative access, project deletion, billing management, role assignment.
  - `ADMIN`: Project creation, API key generation, alert configuration, AI settings.
  - `MEMBER`: Read/write telemetry views, create alerts, run AI investigations, export docs.
  - `VIEWER`: Read-only telemetry views, dashboard inspection.

---

## 3. Data Protection & Tenant Isolation

- **Zero-Cross-Tenant Leakage**: Every repository query enforces `WHERE project_id = :project_id`.
- **Client-Side Redaction**: Passwords, authorization tokens, credit cards, and SSNs are redacted on the client before leaving the host application.
- **Rate Limiting**: Sliding window rate limiting implemented via Redis token bucket for both public auth routes and telemetry ingestion.
- **CORS & Secure Headers**: Strict CORS origin validation, HSTS, X-Content-Type-Options, X-Frame-Options configured in middleware.
