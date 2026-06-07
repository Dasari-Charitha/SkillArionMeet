# SkillArian Meet - Internal Video Meeting App

## Purpose

Build an internal company meeting platform for SkillArian Development, similar to Google Meet, but controlled by the company and extended with attendance tracking, admin reporting, transcripts, guest management, and company-specific authentication.

This app is intended for internal company use, not public users.

## Core Meeting Features

The app should include the expected features of a modern video meeting product:

- Create instant meetings.
- Join meetings through a meeting link or meeting code.
- Audio and video controls.
- Screen sharing.
- In-meeting chat.
- Participant list.
- Host controls.
- Mute/unmute.
- Camera on/off.
- Leave/end meeting.
- Waiting/lobby controls if enabled.
- Meeting title and scheduled time.
- No meeting time limit.

## Capacity Requirement

- Meetings should not have a fixed time limit.
- The desired maximum participant count is up to 1000 users.
- Actual capacity depends on server resources, bandwidth, and the selected video infrastructure.

Important technical note:

A browser-only peer-to-peer WebRTC app will not reliably support hundreds of users because every participant must send and receive many media streams. For 1000 participants, the app should use an SFU-based video architecture such as LiveKit, mediasoup, Janus, Jitsi VideoBridge, or a managed video provider.

## User Roles

### Candidate

- Can sign in with Google.
- Can join meetings they are invited to.
- Can use audio, video, chat, screen share, and transcript features allowed for participants.
- Can view their own transcript section/history if enabled.

### Guest

- Created or invited by an admin.
- Has credentials or an invite flow controlled by the admin.
- Should have the same meeting access behavior as a candidate unless restricted by policy.

### Admin

- Uses company-domain login, e.g. `SkillArionDevelopment.in`.
- Can view attendance across all meetings.
- Can filter attendance from date to date.
- Can view candidate-wise attendance history.
- Can manage candidates and guests.
- Can access/administer transcript sections and meeting records.
- Can create and conduct meetings.
- Can start or stop transcript capture for meetings, depending on policy.
- Can export attendance reports.

## Attendance Tracking

Attendance tracking should be built into the meeting system.

For every meeting, store:

- Meeting ID.
- Meeting title.
- Host ID.
- Start time.
- End time.
- Total meeting duration.
- Participant name.
- Participant email.
- Role.
- Join time.
- Leave time.
- Total attended duration.
- Attendance percentage.
- Rejoin sessions if the same person leaves and rejoins.

Admin meeting view:

- View attendance for all meetings conducted in the company.
- Export reports for a single meeting.
- See detailed attendance similar to the provided reference image.

Admin view:

- View attendance for all meetings.
- Filter by from-date and to-date.
- Filter by candidate, host, meeting, department, or role.
- Export reports in CSV/XLSX/PDF.

## Transcript Feature

Transcripts should be available in separate sections:

- Admin/host transcript section.
- Candidate transcript section.

Expected transcript behavior:

- Meeting transcript can be generated from the live meeting audio.
- Each transcript entry should include speaker, timestamp, and text.
- Admin/host should have broader access to meeting transcripts.
- Candidates should see only the transcript records allowed for them.

Policy decisions still needed:

- Whether transcripts are automatic or manually started by the host.
- Whether participants must be notified when transcript capture is active.
- Whether candidates can download transcripts.
- How long transcripts are retained.

## Authentication

Candidate login:

- Google sign-in.
- Candidate account should be linked to email and profile information.

Admin login:

- Company-domain based login.
- Expected domain: `SkillArionDevelopment.in`.
- Admin access should be restricted by role, not just domain.

Guest login:

- Admin can add a guest.
- Guest receives credentials or an invite link.
- Guest can join meetings with similar credentials/access rules as candidates.

## Admin Dashboard

The admin dashboard should include:

- Meeting list.
- Attendance reports.
- Date range filters.
- Candidate-wise reports.
- Host-wise reports.
- Guest management.
- Candidate management.
- Transcript records.
- Export controls.

## Recommended MVP Phases

### Phase 1 - Foundation

- Authentication.
- Roles: admin, host, candidate, guest.
- Meeting creation.
- Join meeting page.
- Basic video/audio meeting room.
- Participant list.
- No time limit.

### Phase 2 - Attendance

- Track join/leave times.
- Store attendance records.
- Host attendance report.
- Admin attendance dashboard.
- Date range filtering.
- CSV/XLSX export.

### Phase 3 - Advanced Meeting Tools

- Screen sharing.
- Chat.
- Host controls.
- Guest invitations.
- Waiting room/lobby.

### Phase 4 - Transcript

- Live transcription.
- Host/admin transcript view.
- Candidate transcript view.
- Transcript search/export.
- Retention policy.

### Phase 5 - Scale

- SFU deployment.
- Load testing.
- Recording if required.
- Monitoring and alerts.
- Capacity planning for large meetings.

## Recommended Technical Direction

Frontend:

- Next.js or React.
- Responsive web app first.

Backend:

- Node.js/NestJS or Next.js API routes for MVP.
- PostgreSQL for users, meetings, attendance, transcripts, and roles.
- Redis for realtime presence/session state if needed.

Realtime/video:

- Use an SFU-based system for serious scaling.
- Good options: LiveKit, Jitsi, mediasoup, Janus.

Authentication:

- Google OAuth for candidates.
- Company-domain login for admins.
- Role-based access control for admin/host/candidate/guest permissions.

## Open Questions

1. Should the product name be `SkillArian Meet`, `Sillarion Meet`, or something else?
2. Confirmed company domain: `SkillArionDevelopment.in`.
3. Should admins log in with Google Workspace using the company domain, or with company email/password?
4. Do candidates belong to the company domain, or can they use any Google email?
5. Should guests use email/password credentials, OTP, or one-time invite links?
6. Do you need meeting recording, or only transcripts?
7. Should attendance reports export as Excel, PDF, CSV, or all three?
8. Should this be a web app only first, or do you also need Android/iOS apps?
