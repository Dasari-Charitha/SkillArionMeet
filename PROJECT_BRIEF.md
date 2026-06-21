# SkillArionMeet Project Brief

SkillArionMeet is an internal meeting workspace for SkillArionDevelopment. It is designed for Admin, Candidate, and Guest meeting flows with attendance tracking, chat, transcripts, candidate invitations, guest access, and WhatsApp communication.

## Completed

- Admin login with protected admin routes.
- Candidate login through Google sign-in.
- Guest login after Admin adds the guest.
- Admin can create meeting codes and meeting links.
- Candidate and Guest can join through code or meeting link.
- Direct meeting links open the join flow using `?meet=CODE`.
- Attendance tracks join time, leave time, duration, and attendance percentage.
- Admin can view and export attendance.
- Meeting chat is available in the meeting room.
- Transcript capture stores chat messages when transcript mode is active.
- Browser voice transcript support is available where supported by the browser.
- Admin can add candidates and generate candidate invitation links.
- Candidate invitation accept/decline flow is available.
- Admin can add guests and assign them to meetings.
- WhatsApp campaign page supports saved candidates, CSV upload, manual recipients, meeting-link attachment, immediate messages, and scheduled campaign storage.
- WhatsApp Cloud API integration is implemented with template validation.
- MongoDB Atlas persistence is supported.
- Production configuration checks are in place.

## Waiting

- Custom WhatsApp template approval must be Active before using the final production message template.
- Company WhatsApp number setup can be completed when the manager is available for OTP.
- Final deployed URL must be added before sending real meeting links through WhatsApp.
- Final deployment testing must be done after hosting.

## Important Production Note

The current meeting room supports meeting flow, local media controls, chat, attendance, and transcript workflows. For a Google Meet-level production video call with many live participants, the project still needs a real-time video infrastructure such as LiveKit, Jitsi, mediasoup, Janus, or another SFU/managed video provider.

## Current Deployment Direction

- Backend/runtime: Node.js server.
- Database: MongoDB Atlas.
- Candidate authentication: Google Identity Services.
- Messaging: Meta WhatsApp Cloud API.
- Hosting target: to be confirmed.

## Before Official Use

- Set production environment variables on the hosting platform.
- Use a strong admin password.
- Set `PUBLIC_BASE_URL` to the deployed application URL.
- Confirm MongoDB Atlas network access for the hosted server.
- Confirm Google OAuth allowed origins for the deployed domain.
- Confirm WhatsApp template is Active.
- Test Admin, Candidate, Guest, attendance, transcript, and WhatsApp flows on the deployed URL.
