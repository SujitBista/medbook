# Admin API Routes (Next.js proxy)

These routes proxy to the backend API (`NEXT_PUBLIC_API_URL` / `http://localhost:4000/api/v1`) with auth and admin checks.

## Verify endpoints (curl)

**Prerequisites:** Next.js app running (`npm run dev` in `apps/web`), backend API running with DB (e.g. `npm run dev` in `apps/api`), and valid admin session (cookie or use a tool that sends cookies).

### Unauthenticated (expect 401 JSON)

```bash
curl -s -w "\nHTTP %{http_code}\n" http://localhost:3000/api/admin/doctors?limit=10
# Expect: {"ok":false,"success":false,"error":{"code":"UNAUTHORIZED","message":"Not authenticated"}}
# HTTP 401
```

### Authenticated as admin (expect 200 + JSON when backend/DB are OK)

1. Log in as admin in the browser, then from the same host copy the session cookie, or use the browser Network tab to copy the request headers.
2. Or run from the browser console while on `/admin`:
   ```js
   const r = await fetch("/api/admin/doctors?page=1&limit=10", {
     credentials: "include",
   });
   console.log(r.status, await r.json());
   ```

```bash
# With cookie (replace COOKIE_VALUE with your session cookie)
curl -s -w "\nHTTP %{http_code}\n" -H "Cookie: next-auth.session-token=COOKIE_VALUE" \
  "http://localhost:3000/api/admin/doctors?page=1&limit=10"
# Expect: 200 and JSON with data + pagination when backend and DB are correct
```

### Other admin endpoints (same auth rules)

- `GET /api/admin/doctors/stats` — doctor statistics
- `GET /api/admin/departments` — list departments

When backend is down or returns 5xx, the route returns the same status and a JSON body with `ok: false` and `error: { code, message }`. Check server logs for `[api/admin/doctors]` (or stats/departments) for the real error (e.g. backend URL, network, or backend error body).

## Env

- `NEXT_PUBLIC_API_URL` — backend base URL (default `http://localhost:4000/api/v1`)
- Backend needs `DATABASE_URL` and `JWT_SECRET` (must match frontend `JWT_SECRET` for token generation)
