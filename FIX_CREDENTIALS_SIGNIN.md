# Fix: CredentialsSignin Error in Production

## Problem

Users were experiencing `CredentialsSignin` errors when trying to log in after deployment, even though the issue was previously fixed and merged to main.

## Root Cause

The issue is caused by **CORS configuration** in production:

1. NextAuth's `authorize` function runs **server-side** (in NextAuth API route)
2. When it calls the backend API, the request has **no Origin header** (server-to-server)
3. The API's CORS middleware blocks requests without Origin headers in production by default
4. This causes the login request to fail with a 403 CORS error
5. NextAuth then returns `null`, which triggers the `CredentialsSignin` error

## Solution

### 1. Set `CORS_ALLOW_NO_ORIGIN=true` in Production

**This is the critical fix.** The API server must have this environment variable set:

```bash
CORS_ALLOW_NO_ORIGIN=true
```

**Where to set it:**

- **Render Dashboard**: Go to your service → Environment → Add `CORS_ALLOW_NO_ORIGIN` = `true`
- **Vercel**: Add to Environment Variables in project settings
- **Other platforms**: Add to your production environment variables

### 2. Improved Error Logging

Enhanced error handling in `apps/web/lib/auth.ts` to:

- Detect CORS errors specifically
- Log helpful error messages with hints
- Provide better diagnostics in server logs

### 3. Password Reset Script

Created `scripts/reset-admin-password.ts` to reset admin passwords if needed:

```bash
cd packages/db
pnpm db:reset-password admin@medbook.com NewPassword123!
```

Or directly:

```bash
cd packages/db
pnpm tsx ../../scripts/reset-admin-password.ts admin@medbook.com NewPassword123!
```

**Note:**

- Must be run from `packages/db` directory
- Requires `DATABASE_URL` in `packages/db/.env`
- Password must meet strength requirements (8+ chars, uppercase, lowercase, number, special char)

## Verification Steps

1. **Check Environment Variables:**
   - Verify `CORS_ALLOW_NO_ORIGIN=true` is set in production
   - Verify `CORS_ORIGIN` includes your frontend URL
   - Verify `JWT_SECRET` is set and matches between frontend and backend

2. **Check Server Logs:**
   - Look for `[Auth] CORS Error detected` messages
   - Check for `[Auth] Login failed` with status 403

3. **Test Login:**
   - Try logging in with a test account
   - Check browser console for errors
   - Check server logs for detailed error messages

## Files Changed

1. `apps/web/lib/auth.ts` - Enhanced CORS error detection and logging
2. `scripts/reset-admin-password.ts` - New script to reset passwords
3. `ENV.md` - Updated documentation to emphasize `CORS_ALLOW_NO_ORIGIN` requirement
4. `RENDER_SETUP.md` - Added warning about `CORS_ALLOW_NO_ORIGIN` requirement

## Why This Happened

The fix was merged to main, but when deploying to production:

- The environment variable `CORS_ALLOW_NO_ORIGIN` was not set in the production environment
- Or it was set to `false` (the default)
- This caused the same issue to reappear in production

## Prevention

1. **Documentation**: Updated `ENV.md` and `RENDER_SETUP.md` to clearly mark `CORS_ALLOW_NO_ORIGIN` as required
2. **Error Logging**: Enhanced logging will help diagnose CORS issues faster in the future
3. **Deployment Checklist**: Add `CORS_ALLOW_NO_ORIGIN=true` to deployment checklist

## Related Documentation

- [ENV.md](./ENV.md) - Environment variables documentation
- [RENDER_SETUP.md](./RENDER_SETUP.md) - Render deployment setup
- [apps/api/README.md](./apps/api/README.md) - API server documentation
