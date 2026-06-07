# Google Sign-In Setup for Candidate Login

The app is wired for Google Identity Services. To make Candidate Google sign-in work, add a Google OAuth Client ID.

## Steps

1. Open Google Cloud Console.
2. Create or select a project for SkillArionMeet.
3. Configure the OAuth consent screen.
4. Create an OAuth Client ID.
5. Choose application type: Web application.
6. Add this authorized JavaScript origin for local development:

```text
http://127.0.0.1:5173
```

7. Copy the generated Client ID.
8. Open `app-config.js`.
9. Replace:

```js
PASTE_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com
```

with your real Client ID.

## Current Behavior

- Admin and Guest still use the prototype form login.
- Candidate shows the Google sign-in area.
- Until the Client ID is added, Candidate can still use the demo fallback button.
- After the Client ID is added, the Google button signs in the Candidate and reads their Google name/email from the ID token.

## Production Note

For production, the Google ID token must also be verified on the backend before creating a real session.
