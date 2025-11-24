# Phase 2: Authentication & User Management - Issues Encountered

This document tracks all issues, bugs, and problems encountered during Phase 2 implementation.

---

## Issue #1: Login Endpoint Not Returning JWT Token (P1)

**Priority:** P1 (Critical)  
**Status:** ✅ Fixed  
**Date:** 2025-01-27

### Problem

The login controller (`apps/api/src/controllers/auth.controller.ts`) was dropping the JWT token from the response, even though:

- The `loginUser` service function generates and returns a JWT token
- The `authenticate` middleware requires Bearer tokens for protected routes
- API clients need the token to authenticate subsequent requests

### Root Cause

The login endpoint was modified to remove the token from the response with a comment stating "Token removed - NextAuth handles session management internally". While this was true for NextAuth (which manages its own sessions), it broke the JWT-based authentication flow for direct API clients.

### Impact

- API clients could not obtain JWT tokens after successful login
- Protected routes using the `authenticate` middleware were inaccessible to API clients
- Clients would receive authentication errors even with valid credentials
- The JWT-based authentication path was completely unusable

### Solution

Updated the login controller to include the token in the response:

```typescript
res.status(200).json({
  success: true,
  user: result.user,
  token: result.token,
});
```

### Files Changed

- `apps/api/src/controllers/auth.controller.ts` (lines 106-110)

### Verification

- ✅ NextAuth continues to work (ignores token field, uses its own session management)
- ✅ API clients can now obtain tokens for Bearer authentication
- ✅ Protected routes are now accessible with valid tokens

---

## Issue #2: Registration Endpoint Not Returning JWT Token (P2)

**Priority:** P2 (High)  
**Status:** ✅ Fixed  
**Date:** 2025-01-27

### Problem

The register endpoint (`apps/api/src/controllers/auth.controller.ts`) was discarding the JWT token returned by `registerUser`, responding only with `success` and `user` fields. This forced clients to make an additional login call to obtain a token, even though:

- The `registerUser` service function generates and returns a JWT token
- The service advertises returning a token in its return type
- API documentation examples show the register endpoint should include the token

### Root Cause

Similar to Issue #1, the registration endpoint was modified to remove the token with a comment about NextAuth handling session management. This broke the documented API contract and created an unnecessary extra step for API clients.

### Impact

- New users registering via API had to make two requests (register + login) instead of one
- Increased API call overhead and latency
- Contradicted the documented API contract
- Wasted server resources generating tokens that were immediately discarded

### Solution

Updated the register controller to include the token in the response:

```typescript
res.status(201).json({
  success: true,
  user: result.user,
  token: result.token,
});
```

### Files Changed

- `apps/api/src/controllers/auth.controller.ts` (lines 71-75)

### Verification

- ✅ NextAuth continues to work (ignores token field)
- ✅ API clients receive tokens immediately upon registration
- ✅ Single-step registration flow for API clients
- ✅ Matches documented API contract

---

## Summary

### Issues Fixed: 2

### Critical Issues: 1

### High Priority Issues: 1

### Common Pattern Identified

Both issues stemmed from the same root cause: attempting to optimize for NextAuth by removing tokens, which inadvertently broke the JWT-based authentication flow for API clients. The solution maintains compatibility with both authentication methods:

- **NextAuth (Web App):** Continues to work by ignoring the token field and using its own session management
- **API Clients:** Can now obtain and use JWT tokens for Bearer authentication

### Lessons Learned

1. **Dual Authentication Paths:** When supporting multiple authentication methods (NextAuth sessions + JWT Bearer tokens), ensure both paths remain functional
2. **API Contract:** Always maintain consistency with documented API contracts and service function return types
3. **Backward Compatibility:** Changes made for one use case should not break other valid use cases
4. **Code Comments:** Comments explaining "why" something was removed should be reviewed when the removal breaks functionality

### Prevention

- Consider adding integration tests that verify both authentication paths work correctly
- Review API contracts when modifying response structures
- Test changes from both NextAuth and direct API client perspectives

---

## Related Commits

- `4575322` - fix: return JWT token from login endpoint
- `[TBD]` - fix: return JWT token from register endpoint
