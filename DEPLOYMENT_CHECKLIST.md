# SkillArionMeet Deployment Checklist

Use this checklist before deploying or sharing the app for official company use.

## 1. Code Check

- Run `npm install`.
- Run `npm test`.
- Confirm there are no temporary files or local data files committed.
- Confirm `.env` is not committed to GitHub.

## 2. Required Environment Variables

Set these on the hosting platform:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=5173
PUBLIC_BASE_URL=https://your-deployed-domain.com
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB=skillarion_meet
ADMIN_EMAIL=admin@SkillArionDevelopment.in
ADMIN_PASSWORD=use_a_strong_private_password
GOOGLE_CLIENT_ID=your_google_oauth_client_id
WHATSAPP_GRAPH_VERSION=v25.0
WHATSAPP_BUSINESS_ACCOUNT_ID=your_whatsapp_business_account_id
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_system_user_token
WHATSAPP_TEMPLATE_NAME=your_active_template_name
WHATSAPP_TEMPLATE_LANGUAGE=en_US
WHATSAPP_SCHEDULER_ENABLED=false
```

Keep `WHATSAPP_SCHEDULER_ENABLED=false` until scheduled sending is fully approved by the company.

## 3. MongoDB Atlas

- Use MongoDB Atlas, not local JSON storage, for production.
- Add the deployed server IP to Atlas Network Access.
- Keep the database username/password private.
- Confirm the deployed app can read and write meetings, candidates, guests, attendance, transcripts, and WhatsApp campaigns.

## 4. Google Sign-In

- Add the deployed domain to Google OAuth authorized JavaScript origins.
- Keep the same Client ID in `app-config.js` or move it to a production-safe config delivery method later.
- Test candidate login with an invited and accepted candidate email.

## 5. WhatsApp

- Confirm the Meta template status is Active.
- Confirm the template body matches the app expectation:

```text
Hello {{1}},

You have a new SkillArionMeet update:

{{2}}

Please use the meeting link included above to join.
```

- Send to one test candidate first.
- Confirm the message includes the deployed meeting link, not `127.0.0.1`.
- Add the company WhatsApp number after manager OTP approval.

## 6. Final App Test

Test these flows on the deployed URL:

- Admin login.
- Create meeting.
- Copy meeting link.
- Candidate accepts invitation.
- Candidate joins from link.
- Guest joins assigned meeting.
- Attendance join and leave are saved.
- Chat message appears.
- Transcript records chat while transcript mode is active.
- Attendance CSV export works.
- WhatsApp message sends to one test number.

## 7. Known Pending Production Work

- Full production video conferencing for many participants requires SFU or managed video infrastructure.
- Email invitation sending needs company email or SMTP/API credentials.
- WhatsApp scheduled automatic sending should remain disabled until approved.
