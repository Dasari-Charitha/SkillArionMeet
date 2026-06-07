# Backend and Deployment Notes

## Current Development Backend

The app now runs with a Node.js backend using only built-in Node modules.

It provides:

- Static frontend hosting.
- `/api/health`
- `/api/bootstrap`
- `/api/meetings`
- `/api/guests`
- `/api/attendance`
- `/api/transcripts`
- `/api/settings`

Local development data is stored in:

```text
data/db.json
```

This keeps the prototype persistent without depending on a temporary external database service.

## Long-Term Reliability Direction

To avoid API expiry or vendor lock-in for core company data:

- Keep users, meetings, attendance, guests, transcripts, and settings in our own backend/database.
- Use Google only for Candidate identity login.
- Use a production database such as PostgreSQL for deployment.
- Use self-hosted or production-grade video infrastructure such as LiveKit, Jitsi, mediasoup, or Janus for real meetings.
- Avoid temporary free-tier-only services for production-critical features.

## Google Sign-In Note

The Google OAuth Client ID usually does not expire by itself. It can stop working if:

- The Google Cloud project is deleted.
- The OAuth client is deleted.
- Authorized origins are changed.
- The consent screen/test users are not configured correctly.
- Google account/security policies block the project.

Never put the Google Client Secret in frontend code.
