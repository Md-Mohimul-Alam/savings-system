FAME'S Organization - Updated Frontend Services

Includes all uploaded frontend service files plus demoMode.ts.

Main updates:
- api.ts: JWT request interceptor, 401 cleanup, Demo Mode 403 handling.
- authApi.ts: stores token/user/isDemo after login and refreshes stored user from /auth/me.
- demoMode.ts: shared Demo Mode detection/session helpers and client-side write guard.
- All mutating service calls (POST/PATCH/DELETE for protected business actions) call assertWritable().
- GET/read calls remain unchanged and backend decides live vs demo data from the authenticated user.
- register/login are intentionally not blocked by Demo Mode state.

Important:
The backend must remain the real security layer and reject demo-user writes. Frontend guards are UX protection only.
