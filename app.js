const state = {
  route: "dashboard",
  user: null,
  micOn: true,
  cameraOn: false,
  stream: null,
  meetingPanel: "",
  attendanceTracking: false,
  transcriptActive: false,
  backendOnline: false,
  pendingJoinCode: new URLSearchParams(window.location.search).get("meet") || "",
  activeMeeting: null,
  activeAttendance: null,
  lastCreatedMeeting: null,
  joinMessage: "",
  leaveMessage: "",
  settings: {
    capacityLimit: 1000,
    guestAccess: "Invite link",
    transcriptMode: "Manual start",
    candidateTranscriptAccess: true,
    exportFormat: "CSV",
    databaseMode: "Local JSON database",
    deploymentTarget: "Not deployed",
    whatsappApiStatus: "Not configured",
  },
  attendanceFilter: {
    from: "2026-05-01",
    to: new Date().toISOString().slice(0, 10),
    role: "all",
  },
  whatsappSendMode: "Immediate",
  whatsappDraftManual: "",
  whatsappDraftMessage: "",
  whatsappDraftScheduledAt: "",
  whatsappCandidateStatus: "all",
};

const config = window.SKILL_ARION_CONFIG || {};

let meetings = [];

let attendanceRows = [];

let transcriptLines = [];

const chatMessages = [];

let guests = [];

let candidates = [];

let whatsappCampaigns = [];

let whatsappDraftRecipients = [];

const navItems = [
  ["dashboard", "D", "Home"],
  ["meeting", "M", "Meeting Room"],
  ["attendance", "A", "Attendance"],
  ["transcripts", "T", "Transcripts"],
  ["candidates", "C", "Candidates"],
  ["whatsapp", "W", "WhatsApp"],
  ["guests", "+", "Guests"],
  ["settings", "S", "Settings"],
];

const roleRoutes = {
  Admin: ["dashboard", "meeting", "attendance", "transcripts", "candidates", "whatsapp", "guests", "settings"],
  Candidate: ["dashboard", "meeting", "transcripts"],
  Guest: ["dashboard", "meeting"],
};

function render() {
  const app = document.querySelector("#app");
  if (!state.user) {
    app.innerHTML = renderLogin();
    bindLogin();
    return;
  }

  app.innerHTML = `
    <div class="app-shell ${state.route === "meeting" ? "meeting-shell" : ""}">
      <header class="topbar workspace-topbar">
        <div class="brand">
          <img class="brand-logo" src="assets/logo.png" alt="Skill Arion logo" />
          <div>
            <div class="brand-title">SkillArionMeet</div>
            <div class="brand-subtitle">SkillArionDevelopment.in</div>
          </div>
        </div>
        <nav class="nav workspace-nav">
          ${visibleNavItems().map(([route, icon, label]) => `
            <button class="${state.route === route ? "active" : ""}" data-route="${route}">
              <span>${icon}</span><span>${label}</span>
            </button>
          `).join("")}
        </nav>
        <div class="identity">
          <div class="avatar">${initials(state.user.name)}</div>
          <div>
            <div class="name">${state.user.name}</div>
            <div class="muted">${state.user.role} | ${state.user.email}</div>
          </div>
          <button class="btn ghost" id="logoutBtn">Sign out</button>
        </div>
      </header>
      <main class="main">
        <section class="content">
          ${state.leaveMessage ? `<div class="notice success">${state.leaveMessage}</div>` : ""}
          ${routeView()}
        </section>
      </main>
    </div>
  `;
  bindShell();
}

function renderLogin() {
  return `
    <section class="login-screen">
      <div class="login-intro">
        <div class="brand login-brand">
          <img class="brand-logo" src="assets/logo.png" alt="Skill Arion logo" />
          <div>
            <div class="brand-title">SkillArionMeet</div>
            <div class="brand-subtitle">SkillArionDevelopment.in</div>
          </div>
        </div>
        <div>
          <div class="login-kicker">Internal meeting workspace</div>
          <h1>Meetings with attendance and transcript control.</h1>
          <p>Built for Skill Arion teams, candidates, and invited guests with admin-managed access.</p>
        </div>
        <div class="login-highlights">
          <div><strong>No time limit</strong><span>Run long internal sessions without a meeting cutoff.</span></div>
          <div><strong>Attendance reports</strong><span>Admin can track meeting participation and export reports.</span></div>
          <div><strong>Transcript sections</strong><span>Admin and candidate transcript views stay separate.</span></div>
        </div>
      </div>
      <div class="login-panel">
        <div class="login-panel-header">
          <h2>Choose access</h2>
          <p>${state.backendOnline ? "Backend connected. Local records will persist." : "Backend is starting. Login still works while it reconnects."}</p>
        </div>
        <div class="role-grid">
          <button class="role-card active" data-role="Admin">
            <strong>Admin</strong><br /><span class="muted">Company dashboard access</span>
          </button>
          <button class="role-card" data-role="Candidate">
            <strong>Candidate</strong><br /><span class="muted">Google sign-in</span>
          </button>
          <button class="role-card" data-role="Guest">
            <strong>Guest</strong><br /><span class="muted">Admin-approved email</span>
          </button>
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" value="admin@SkillArionDevelopment.in" />
        </div>
        <div class="field">
          <label for="name">Name</label>
          <input id="name" value="Company Admin" />
        </div>
        <div class="field" id="passwordField">
          <label for="password">Password</label>
          <input id="password" type="password" placeholder="Admin password" />
        </div>
        <div class="google-login-box" id="googleLoginBox">
          <div class="google-login-title">Candidate login</div>
          <div id="googleSignInButton"></div>
          <div class="muted" id="googleLoginStatus"></div>
        </div>
        <button class="btn primary" id="loginBtn">Continue</button>
      </div>
    </section>
  `;
}

function pageTitle() {
  return {
    dashboard: "Home",
    meeting: "Meeting Room",
    attendance: "Attendance Tracker",
    transcripts: "Transcripts",
    candidates: "Candidate Management",
    whatsapp: "WhatsApp Messages",
    guests: "Guest Management",
    settings: "Settings",
  }[state.route];
}

function routeView() {
  return {
    dashboard: renderDashboard,
    meeting: renderMeeting,
    attendance: renderAttendance,
    transcripts: renderTranscripts,
    candidates: renderCandidates,
    whatsapp: renderWhatsApp,
    guests: renderGuests,
    settings: renderSettings,
  }[state.route]();
}

function renderDashboard() {
  if (state.user.role === "Admin") {
    return renderAdminDashboard();
  }
  if (state.user.role === "Candidate") {
    return renderCandidateDashboard();
  }
  return renderGuestDashboard();
}

function renderAdminDashboard() {
  const averageAttendance = attendanceRows.length
    ? Math.round(attendanceRows.reduce((sum, row) => sum + Number(row.percent || 0), 0) / attendanceRows.length)
    : 0;
  return `
    <div class="grid">
      <section class="home-hero">
        <div>
          <div class="login-kicker">Admin meeting control</div>
          <h1>Start, manage, and review company meetings.</h1>
          <p>Create rooms, track attendance, manage guests, and control transcripts from one meeting-first workspace.</p>
        </div>
        <div class="actions">
          <button class="btn primary" data-route="meeting">Start meeting</button>
          <button class="btn" data-route="attendance">View attendance</button>
          <button class="btn" data-route="whatsapp">WhatsApp messages</button>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h2>Create meeting link</h2>
          ${state.lastCreatedMeeting ? `<span class="pill ok">${state.lastCreatedMeeting.code}</span>` : ""}
        </div>
        <div class="grid cols-2">
          <div class="field">
            <label>Meeting title</label>
            <input id="newMeetingTitle" placeholder="Example: Candidate interview round" />
          </div>
          <div class="field">
            <label>Custom meeting code</label>
            <input id="newMeetingCode" placeholder="Optional, example: HR-ROUND-1" />
          </div>
          <div class="field">
            <label>Scheduled time</label>
            <input id="newMeetingStart" type="datetime-local" />
          </div>
          <div class="field">
            <label>Who can join</label>
            <select id="newMeetingAccessMode">
              <option value="all">Candidates and guests</option>
              <option value="candidates">Candidates only</option>
              <option value="guests">Guests only</option>
              <option value="invited">Specific invited emails only</option>
            </select>
          </div>
          <div class="field">
            <label>Invited emails</label>
            <textarea id="newMeetingAllowedEmails" placeholder="Optional: one email per line or comma separated"></textarea>
          </div>
        </div>
        <div class="actions" style="margin-top: 14px;">
          <button class="btn primary" id="createMeetingBtn">Create meeting</button>
          ${state.lastCreatedMeeting ? `<button class="btn" id="copyMeetingCodeBtn">Copy code</button>` : ""}
          ${state.lastCreatedMeeting ? `<button class="btn" id="copyMeetingLinkBtn">Copy link</button>` : ""}
        </div>
        ${state.lastCreatedMeeting ? `
          <div class="muted" style="margin-top: 12px;">Share this code with candidates or guests: <strong>${state.lastCreatedMeeting.code}</strong></div>
          <div class="meeting-link-box">${getMeetingJoinLink(state.lastCreatedMeeting)}</div>
        ` : ""}
      </section>
      <div class="grid cols-3">
        <div class="stat"><div class="stat-value">No limit</div><div class="stat-label">Meeting time limit</div></div>
        <div class="stat"><div class="stat-value">1000</div><div class="stat-label">Target max participants</div></div>
        <div class="stat"><div class="stat-value">${averageAttendance}%</div><div class="stat-label">Average attendance</div></div>
      </div>
      <div class="grid cols-2">
        <section class="panel">
          <div class="panel-header">
            <h2>Recent meetings</h2>
            <button class="btn primary" data-route="meeting">Start meet</button>
          </div>
          <div class="list">
            ${meetings.length ? meetings.map(meetingRow).join("") : `<div class="card">No meetings created yet.</div>`}
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <h2>Admin controls</h2>
            <span class="pill ok">Role based</span>
          </div>
          <div class="list">
            <div class="card"><strong>Attendance reports</strong><div class="muted">Filter company-wide records from date to date.</div></div>
            <div class="card"><strong>Transcript sections</strong><div class="muted">Separate host/admin and candidate transcript views.</div></div>
            <div class="card"><strong>WhatsApp campaigns</strong><div class="muted">Save immediate or scheduled candidate messages before API connection.</div></div>
            <div class="card"><strong>Guest access</strong><div class="muted">Admins can add guests now; final credential policy can change later.</div></div>
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderCandidateDashboard() {
  const transcriptCount = transcriptLines.filter(line => line.section === "Candidate").length;
  return `
    <div class="grid">
      <section class="home-hero">
        <div>
          <div class="login-kicker">Candidate meeting space</div>
          <h1>Join your assigned meetings quickly.</h1>
          <p>Use your meeting room and access transcript entries shared with candidates.</p>
        </div>
        <div class="actions">
          <button class="btn primary" data-route="transcripts">My transcripts</button>
        </div>
      </section>
      <div class="grid cols-3">
        <div class="stat"><div class="stat-value">Join</div><div class="stat-label">Meeting by code or link</div></div>
        <div class="stat"><div class="stat-value">Google</div><div class="stat-label">Candidate sign-in</div></div>
        <div class="stat"><div class="stat-value">${transcriptCount}</div><div class="stat-label">Transcript records</div></div>
      </div>
      <div class="grid cols-2">
        <section class="panel">
          <div class="panel-header">
            <h2>Join meeting</h2>
          </div>
          <div class="field">
            <label>Meeting code or link</label>
            <input id="joinMeetingCode" value="${state.pendingJoinCode}" placeholder="Example: SKM-8F2KQ or meeting link" />
          </div>
          <button class="btn primary" id="joinMeetingBtn" style="margin-top: 12px;">Join meeting</button>
          ${state.joinMessage ? `<div class="muted" style="margin-top: 10px;">${state.joinMessage}</div>` : ""}
        </section>
        <section class="panel">
          <div class="panel-header">
            <h2>My access</h2>
            <span class="pill">Candidate</span>
          </div>
          <div class="list">
            <div class="card"><strong>Candidate transcripts</strong><div class="muted">View transcript entries shared with candidates.</div></div>
            <div class="card"><strong>Meeting controls</strong><div class="muted">Use audio, video, chat, and screen share when allowed.</div></div>
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderGuestDashboard() {
  return `
    <div class="grid">
      <section class="home-hero">
        <div>
          <div class="login-kicker">Guest access</div>
          <h1>Enter a meeting with limited access.</h1>
          <p>Guests can join assigned rooms only. Admin controls attendance, reports, and transcript access.</p>
        </div>
      </section>
      <div class="grid cols-2">
      <section class="panel">
        <div class="panel-header">
          <h2>Guest meeting access</h2>
          <span class="pill warn">Limited</span>
        </div>
        <div class="field">
          <label>Meeting code or invite link</label>
          <input id="joinMeetingCode" value="${state.pendingJoinCode}" placeholder="Example: SKM-8F2KQ or meeting link" />
        </div>
        <div class="actions" style="margin-top: 14px;">
          <button class="btn primary" id="joinMeetingBtn">Join meeting</button>
        </div>
        ${state.joinMessage ? `<div class="muted" style="margin-top: 10px;">${state.joinMessage}</div>` : ""}
      </section>
      <section class="panel">
        <div class="panel-header">
          <h2>Guest permissions</h2>
        </div>
        <div class="list">
          <div class="card">Join assigned meetings only</div>
          <div class="card">Use audio and video after host approval</div>
          <div class="card">No admin reports or guest management access</div>
        </div>
      </section>
      </div>
    </div>
  `;
}

function renderMeeting() {
  if (state.user?.role !== "Admin" && !state.activeMeeting) {
    return `
      <div class="join-required">
        <section class="panel">
          <div class="panel-header">
            <h2>Join a meeting</h2>
            <span class="pill">Code or link required</span>
          </div>
          <div class="field">
            <label>Meeting code or link</label>
            <input id="joinMeetingCode" value="${state.pendingJoinCode}" placeholder="Example: SKM-8F2KQ or meeting link" />
          </div>
          <div class="actions" style="margin-top: 12px;">
            <button class="btn primary" id="joinMeetingBtn">Join meeting</button>
            <button class="btn" id="backToHomeBtn">Back to Home</button>
          </div>
          ${state.joinMessage ? `<div class="muted" style="margin-top: 10px;">${state.joinMessage}</div>` : ""}
        </section>
      </div>
    `;
  }

  const meetingTitle = state.activeMeeting?.title || "Meeting Room";
  const meetingCode = state.activeMeeting?.code || "Demo room";
  const people = meetingParticipants();
  const canTrackAttendance = state.user.role === "Admin";

  return `
    <div class="meeting-room">
      <header class="meeting-topnav">
        <div class="meeting-brand">
          <img class="meeting-logo" src="assets/logo.png" alt="Skill Arion logo" />
          <div>
            <div class="meeting-title">SkillArionMeet</div>
            <div class="meeting-subtitle">${meetingTitle} | ${meetingCode}</div>
          </div>
        </div>
        <nav class="meeting-route-nav">
          ${visibleNavItems().filter(([route]) => route !== "meeting").map(([route, icon, label]) => `
            <button class="btn ghost" data-route="${route}">${icon} ${label}</button>
          `).join("")}
        </nav>
      </header>
      <section class="stage">
        <div class="video-grid">
          <div class="tile" id="selfTile">
            ${state.cameraOn ? `<video id="localVideo" autoplay muted playsinline></video>` : `<div class="tile-initial">${initials(state.user.name)}</div>`}
            <div class="tile-name">${state.user.name} | You</div>
          </div>
          ${people.filter(person => !person.isSelf).map(person => `
            <div class="tile">
              <div class="tile-initial">${initials(person.name)}</div>
              <div class="tile-name">${person.name} | ${person.role}</div>
            </div>
          `).join("")}
        </div>
        <div class="controls">
          <button class="control ${state.micOn ? "active" : ""}" id="micBtn" title="Microphone">${state.micOn ? "Mic" : "Off"}</button>
          <button class="control ${state.cameraOn ? "active" : ""}" id="cameraBtn" title="Camera">Cam</button>
          <button class="control" id="screenBtn" title="Screen share">Scr</button>
          ${canTrackAttendance ? `<button class="control track-control ${state.meetingPanel === "attendance" ? "active" : ""}" id="markAttendanceBtn" title="Track attendance">Track attendance</button>` : ""}
          <button class="control ${state.meetingPanel === "chat" ? "active" : ""}" id="chatBtn" title="Chat">Msg</button>
          <button class="control ${state.meetingPanel === "participants" ? "active" : ""}" id="peopleBtn" title="Participants">Ppl</button>
          <button class="control end" id="endBtn" title="End meeting">End</button>
        </div>
      </section>
      ${state.meetingPanel ? `<aside class="side-stack">
        ${renderMeetingPanel(people)}
      </aside>` : ""}
    </div>
  `;
}

function renderMeetingPanel(people) {
  if (state.meetingPanel === "chat") {
    return `
      <section class="panel">
        <div class="panel-header">
          <h2>Chat</h2>
          <button class="btn ghost" id="closeMeetingPanelBtn">Close</button>
        </div>
        <div class="list">
          ${chatMessages.length ? chatMessages.map(message => `
            <div class="card">
              <strong>${message.sender}</strong> <span class="muted">${message.time} | ${message.role}</span>
              <div class="muted">${message.text}</div>
            </div>
          `).join("") : `<div class="card">No messages in this meeting yet.</div>`}
        </div>
        <div class="field" style="margin-top: 14px;">
          <label>Message</label>
          <input id="chatInput" placeholder="Type a message" />
        </div>
        <button class="btn primary" id="sendChatBtn" style="margin-top: 10px;">Send</button>
      </section>
    `;
  }

  if (state.meetingPanel === "attendance") {
    const roomRows = activeMeetingAttendanceRows();
    return `
      <section class="panel">
        <div class="panel-header">
          <h2>Attendance report</h2>
          <button class="btn ghost" id="closeMeetingPanelBtn">Close</button>
        </div>
        <div class="card"><strong>${state.attendanceTracking ? "Tracking active" : "Tracking started"}</strong><div class="muted">Join, leave, rejoin, duration, and percentage are being recorded.</div></div>
        <div class="list">
          ${roomRows.length ? roomRows.map(row => `
            <div class="person-row">
              <div class="person-meta">
                <div class="name">${row.name}</div>
                <div class="muted">${row.joined} - ${row.left} | ${row.duration}</div>
              </div>
              <span class="pill ${row.percent >= 90 ? "ok" : "warn"}">${row.percent}%</span>
            </div>
          `).join("") : `<div class="empty">No attendance records for this room yet.</div>`}
        </div>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="panel-header">
        <h2>Participants</h2>
        <button class="btn ghost" id="closeMeetingPanelBtn">Close</button>
      </div>
      <div class="list">
        ${people.map(person => personRow(person.name, person.isSelf ? `${person.role} | You` : person.role)).join("")}
      </div>
    </section>
  `;
}

function meetingParticipants() {
  const selfEmail = String(state.user?.email || "").toLowerCase();
  const activeCode = state.activeMeeting?.code || "";
  const participants = new Map();
  participants.set(selfEmail || "self", {
    name: state.user?.name || "You",
    email: selfEmail,
    role: state.user?.role || "User",
    isSelf: true,
  });

  if (!activeCode) {
    return Array.from(participants.values());
  }

  attendanceRows
    .filter(row => {
      if (row.meetingCode !== activeCode) {
        return false;
      }
      return row.left === "In meeting";
    })
    .forEach(row => {
      const email = String(row.email || row.name || "").toLowerCase();
      if (!email) {
        return;
      }
      participants.set(email, {
        name: row.name || "Meeting user",
        email,
        role: row.role || "Participant",
        isSelf: email === selfEmail,
      });
    });

  return Array.from(participants.values());
}

function activeMeetingAttendanceRows() {
  const activeCode = state.activeMeeting?.code || "";
  if (!activeCode) {
    return [];
  }
  return attendanceRows.filter(row => row.meetingCode === activeCode);
}

function renderAttendance() {
  if (state.user?.role !== "Admin") {
    return renderPersonalAttendance();
  }

  const rows = filteredAttendance();
  return `
    <div class="grid">
      <section class="panel">
        <div class="panel-header">
          <h2>Company attendance report</h2>
          <div class="actions">
            <button class="btn" id="exportCsvBtn">Export CSV</button>
            <button class="btn" id="exportExcelBtn">Excel later</button>
            <button class="btn" id="exportPdfBtn">PDF later</button>
          </div>
        </div>
        <div class="filters">
          <input type="date" id="fromDate" value="${state.attendanceFilter.from}" />
          <input type="date" id="toDate" value="${state.attendanceFilter.to}" />
          <select id="roleFilter">
            <option value="all" ${state.attendanceFilter.role === "all" ? "selected" : ""}>All roles</option>
            <option value="Candidate" ${state.attendanceFilter.role === "Candidate" ? "selected" : ""}>Candidates</option>
            <option value="Guest" ${state.attendanceFilter.role === "Guest" ? "selected" : ""}>Guests</option>
          </select>
        </div>
      </section>
      ${renderAttendanceTotals(rows)}
      <section class="panel">
        <div class="panel-header">
          <h2>Detailed attendance</h2>
          <span class="pill">${rows.length} records</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>Meeting</th><th>Joined</th><th>Left</th><th>Duration</th><th>Attended</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(row => `
                <tr>
                  <td><strong>${row.name}</strong><div class="muted">${row.email}</div></td>
                  <td>${row.role}</td>
                  <td>${row.meeting}</td>
                  <td>${row.joined}</td>
                  <td>${row.left}</td>
                  <td>${row.duration}</td>
                  <td><span class="pill ${row.percent >= 90 ? "ok" : "warn"}">${row.percent}%</span></td>
                </tr>
              `).join("") : `
                <tr>
                  <td colspan="7"><div class="empty">No attendance records found for the selected filters.</div></td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderPersonalAttendance() {
  const rows = filteredAttendance();
  return `
    <div class="grid">
      <section class="panel">
        <div class="panel-header">
          <h2>My attendance</h2>
          <span class="pill">${rows.length} records</span>
        </div>
        <div class="muted">Only your own attendance is visible here. Company-wide tracking is available only to Admin.</div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h2>Attendance history</h2>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Meeting</th><th>Joined</th><th>Left</th><th>Duration</th><th>Attended</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(row => `
                <tr>
                  <td>${row.meeting}</td>
                  <td>${row.joined}</td>
                  <td>${row.left}</td>
                  <td>${row.duration}</td>
                  <td><span class="pill ${row.percent >= 90 ? "ok" : "warn"}">${row.percent}%</span></td>
                </tr>
              `).join("") : `
                <tr>
                  <td colspan="5"><div class="empty">No attendance records found for this account yet.</div></td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderAttendanceTotals(rows) {
  const summary = buildAttendanceSummary(rows);

  return `
    <section class="grid cols-3">
      <div class="stat"><div class="stat-value">${summary.total}</div><div class="stat-label">Total joins</div></div>
      <div class="stat"><div class="stat-value">${summary.completed}</div><div class="stat-label">Completed attendance</div></div>
      <div class="stat"><div class="stat-value">${summary.averagePercent}%</div><div class="stat-label">Average attended</div></div>
    </section>
  `;
}

function buildAttendanceSummary(rows) {
  const completedRows = rows.filter(row => row.left && row.left !== "In meeting");
  const liveRows = rows.filter(row => row.left === "In meeting");
  const averagePercent = completedRows.length
    ? Math.round(completedRows.reduce((sum, row) => sum + Number(row.percent || 0), 0) / completedRows.length)
    : 0;
  const meetingMap = rows.reduce((map, row) => {
    const key = row.meeting || "Untitled meeting";
    if (!map.has(key)) {
      map.set(key, { meeting: key, total: 0, completed: 0, live: 0, percentTotal: 0 });
    }
    const item = map.get(key);
    item.total += 1;
    if (row.left === "In meeting") {
      item.live += 1;
    } else {
      item.completed += 1;
      item.percentTotal += Number(row.percent || 0);
    }
    return map;
  }, new Map());
  const meetings = Array.from(meetingMap.values()).map(item => ({
    ...item,
    averagePercent: item.completed ? Math.round(item.percentTotal / item.completed) : 0,
  }));
  return {
    total: rows.length,
    completed: completedRows.length,
    live: liveRows.length,
    averagePercent,
    meetings,
  };
}

function renderTranscripts() {
  if (state.user?.role !== "Admin") {
    const candidateLines = transcriptLines.filter(line => line.section === "Candidate");
    return `
      <section class="panel">
        <div class="panel-header">
          <h2>My transcript section</h2>
          <button class="btn" id="downloadTranscriptBtn">Download transcript</button>
        </div>
        <div class="list">
          ${candidateLines.length ? candidateLines.map(transcriptLine).join("") : `<div class="card">No candidate transcript entries yet.</div>`}
        </div>
      </section>
    `;
  }
  const adminLines = transcriptLines.filter(line => line.section === "Admin");
  const candidateLines = transcriptLines.filter(line => line.section === "Candidate");

  return `
    <div class="grid cols-2">
      <section class="panel">
        <div class="panel-header">
          <h2>Admin section</h2>
          <button class="btn primary" id="startTranscriptBtn">${state.transcriptActive ? "Stop transcript" : "Start transcript"}</button>
        </div>
        <div class="list">
          ${adminLines.length ? adminLines.map(transcriptLine).join("") : `<div class="card">No admin transcript entries yet.</div>`}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h2>Candidate section</h2>
          <button class="btn" id="downloadTranscriptBtn">Download transcript</button>
        </div>
        <div class="list">
          ${candidateLines.length ? candidateLines.map(transcriptLine).join("") : `<div class="card">No candidate transcript entries yet.</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderCandidates() {
  if (state.user.role !== "Admin") {
    return `<section class="panel"><h2>Admin access required</h2></section>`;
  }

  return `
    <div class="grid cols-2">
      <section class="panel">
        <div class="panel-header">
          <h2>Add candidate</h2>
          <span class="pill ok">WhatsApp ready</span>
        </div>
        <div class="grid">
          <div class="field"><label>Name</label><input id="candidateName" placeholder="Candidate name" /></div>
          <div class="field"><label>Email</label><input id="candidateEmail" placeholder="candidate@gmail.com" /></div>
          <div class="field"><label>WhatsApp number</label><input id="candidatePhone" placeholder="9876543210" /></div>
          <div class="grid cols-2">
            <div class="field">
              <label>Program</label>
              <select id="candidateProgram">
                <option>Internship</option>
                <option>Training</option>
                <option>Hiring</option>
              </select>
            </div>
            <div class="field">
              <label>Status</label>
              <select id="candidateStatus">
                <option>Shortlisted</option>
                <option>Interview pending</option>
                <option>Selected</option>
                <option>Rejected</option>
                <option>Active</option>
              </select>
            </div>
          </div>
          <button class="btn primary" id="addCandidateBtn">Add candidate</button>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h2>Candidate list</h2>
          <span class="pill">${candidates.length} candidates</span>
        </div>
        <div class="list">
          ${candidates.map(candidate => `
            <div class="person-row">
              <div class="person-meta">
                <div class="name">${candidate.name}</div>
                <div class="muted">${candidate.email} | ${candidate.phone} | ${candidate.program}</div>
              </div>
              <span class="pill ${candidate.status === "Shortlisted" || candidate.status === "Selected" ? "ok" : ""}">${candidate.status}</span>
            </div>
          `).join("") || `<div class="card">No candidates added yet.</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderWhatsApp() {
  if (state.user.role !== "Admin") {
    return `<section class="panel"><h2>Admin access required</h2></section>`;
  }

  const latest = whatsappCampaigns[0];
  const isScheduled = state.whatsappSendMode === "Scheduled";
  return `
    <div class="grid">
      <section class="home-hero">
        <div>
          <div class="login-kicker">Candidate communication</div>
          <h1>Send WhatsApp updates to shortlisted candidates.</h1>
          <p>Upload a CSV or paste candidate names and phone numbers, then send immediate campaigns when WhatsApp API is configured.</p>
        </div>
        <div class="actions">
          <span class="pill ok">Candidates only</span>
          <span class="pill">${state.settings.whatsappApiStatus || "API pending"}</span>
        </div>
      </section>
      <div class="grid cols-2">
        <section class="panel">
          <div class="panel-header">
            <h2>Create recipients</h2>
            <span class="pill">${latest ? whatsappCampaigns.length : 0} campaigns</span>
          </div>
          <div class="field">
            <label>Saved candidates</label>
            <select id="whatsappCandidateStatus">
              <option value="all">All saved candidates</option>
              <option value="Shortlisted">Shortlisted only</option>
              <option value="Interview pending">Interview pending</option>
              <option value="Selected">Selected</option>
              <option value="Active">Active</option>
            </select>
          </div>
          <div class="saved-candidate-picker">
            ${renderWhatsappCandidatePicker()}
          </div>
          <div class="actions" style="margin-top: 12px;">
            <button class="btn" id="addSelectedCandidatesBtn">Add selected candidates</button>
          </div>
          <div class="field">
            <label>Upload CSV</label>
            <input id="whatsappCsv" type="file" accept=".csv,text/csv" />
            <div class="muted">CSV columns can be name, phone. Example: Charitha, 919876543210</div>
          </div>
          <div class="field" style="margin-top: 14px;">
            <label>Manual candidate list</label>
            <textarea id="whatsappManualRecipients" placeholder="One candidate per line&#10;Charitha, 919876543210&#10;Aarav Mehta, 919812345678">${state.whatsappDraftManual}</textarea>
          </div>
          <div class="actions" style="margin-top: 12px;">
            <button class="btn" id="previewWhatsappRecipientsBtn">Preview recipients</button>
            <button class="btn" id="clearWhatsappRecipientsBtn">Clear preview</button>
          </div>
          <div id="whatsappPreview" class="recipient-preview">${renderWhatsappPreviewMarkup()}</div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <h2>Message details</h2>
            <span class="pill warn">Template required</span>
          </div>
          <div class="notice">
            Immediate messages will be sent through WhatsApp Cloud API after Meta credentials and an approved template are added in the backend .env file. Until then, campaigns are saved as ready for API.
          </div>
          <div class="field">
            <label>Message</label>
            <textarea id="whatsappMessage" placeholder="Type the WhatsApp message for shortlisted internship candidates">${state.whatsappDraftMessage}</textarea>
          </div>
          <div class="grid cols-2" style="margin-top: 14px;">
            <div class="field">
              <label>Send mode</label>
              <select id="whatsappSendMode">
                <option value="Immediate" ${state.whatsappSendMode === "Immediate" ? "selected" : ""}>Send immediately</option>
                <option value="Scheduled" ${isScheduled ? "selected" : ""}>Schedule for later</option>
              </select>
            </div>
            <div class="field ${isScheduled ? "" : "hidden-field"}" id="whatsappScheduleField">
              <label>Schedule time</label>
              <input id="whatsappScheduledAt" type="datetime-local" value="${state.whatsappDraftScheduledAt}" />
            </div>
          </div>
          <div class="actions" style="margin-top: 14px;">
            <button class="btn primary" id="saveWhatsappCampaignBtn">Save campaign</button>
          </div>
          <div class="muted" style="margin-top: 12px;">Use a Meta template with one body variable. The typed message is sent as that variable.</div>
        </section>
      </div>
      <section class="panel">
        <div class="panel-header">
          <h2>WhatsApp campaign history</h2>
          <span class="pill">${whatsappCampaigns.length} saved</span>
        </div>
        <div class="list">
          ${whatsappCampaigns.map(campaign => `
            <div class="card campaign-card">
              <div>
                <strong>${campaign.sendMode}${campaign.scheduledAt ? ` | ${campaign.scheduledAt}` : ""}</strong>
                <div class="muted">${campaign.recipients.length} candidates | ${campaign.status} | ${campaign.createdAt}</div>
                <div class="campaign-message">${campaign.message}</div>
                ${renderWhatsappDeliveryResults(campaign)}
              </div>
              <span class="pill ${campaign.status && campaign.status.includes("Sent") ? "ok" : ""}">${campaign.sendMode === "Scheduled" ? "Scheduled" : "API"}</span>
            </div>
          `).join("") || `<div class="card">No WhatsApp campaigns saved yet.</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderGuests() {
  return `
    <div class="grid cols-2">
      <section class="panel">
        <div class="panel-header">
          <h2>Add guest</h2>
          <span class="pill warn">Policy pending</span>
        </div>
        <div class="grid">
          <div class="field"><label>Name</label><input id="guestName" placeholder="Guest name" /></div>
          <div class="field"><label>Email</label><input id="guestEmail" placeholder="guest@example.com" /></div>
          <div class="field"><label>Assigned meeting</label><input id="guestMeeting" placeholder="Exact meeting code or title" /></div>
          <button class="btn primary" id="addGuestBtn">Add guest</button>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h2>Guest list</h2>
          <span class="pill">${guests.length} guests</span>
        </div>
        <div class="list" id="guestList">
          ${guests.length ? guests.map(guest => `
            <div class="person-row">
              <div class="person-meta">
                <div class="name">${guest.name}</div>
                <div class="muted">${guest.email} | ${guest.meeting}</div>
              </div>
              <span class="pill">${guest.status}</span>
            </div>
          `).join("") : `<div class="card">No guests added yet.</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderSettings() {
  if (state.user?.role !== "Admin") {
    return `
      <section class="panel">
        <div class="panel-header"><h2>Settings</h2></div>
        <div class="empty">Settings are available only to Admin.</div>
      </section>
    `;
  }

  const backendStatus = state.backendOnline ? "Connected" : "Reconnecting";
  return `
    <div class="grid">
      <div class="grid cols-2">
        <section class="panel">
          <div class="panel-header"><h2>Meeting controls</h2></div>
          <div class="grid">
            <div class="field">
              <label>Company domain</label>
              <input value="SkillArionDevelopment.in" disabled />
            </div>
            <div class="field">
              <label>Meeting time limit</label>
              <input value="No fixed time limit" disabled />
            </div>
            <div class="field">
              <label>Target participant capacity</label>
              <input id="capacityLimit" type="number" min="1" max="1000" value="${state.settings.capacityLimit}" />
            </div>
            <div class="field">
              <label>Guest access method</label>
              <select id="guestAccess">
                ${["Invite link", "Email password", "OTP"].map(option => `<option ${state.settings.guestAccess === option ? "selected" : ""}>${option}</option>`).join("")}
              </select>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header"><h2>Reports and transcripts</h2></div>
          <div class="grid">
            <div class="field">
              <label>Transcript mode</label>
              <select id="transcriptMode">
                ${["Manual start", "Auto start for every meeting"].map(option => `<option ${state.settings.transcriptMode === option ? "selected" : ""}>${option}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Candidate transcript access</label>
              <select id="candidateTranscriptAccess">
                <option value="yes" ${state.settings.candidateTranscriptAccess ? "selected" : ""}>Allowed</option>
                <option value="no" ${!state.settings.candidateTranscriptAccess ? "selected" : ""}>Admin only</option>
              </select>
            </div>
            <div class="field">
              <label>Default attendance export</label>
              <select id="exportFormat">
                ${["CSV", "Excel", "PDF"].map(option => `<option ${state.settings.exportFormat === option ? "selected" : ""}>${option}</option>`).join("")}
              </select>
            </div>
          </div>
        </section>
      </div>
      <section class="panel">
        <div class="panel-header">
          <h2>System status</h2>
          <button class="btn primary" id="saveSettingsBtn">Save settings</button>
        </div>
        <div class="status-strip">
          <span><strong>Backend:</strong> ${backendStatus}</span>
          <span><strong>Storage:</strong> ${state.settings.databaseMode}</span>
          <span><strong>WhatsApp:</strong> ${state.settings.whatsappApiStatus}</span>
          <span><strong>Deployment:</strong> ${state.settings.deploymentTarget}</span>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h2>Data cleanup</h2>
          <span class="pill warn">Admin only</span>
        </div>
        <div class="actions">
          <button class="btn danger" data-clear-history="attendance">Clear attendance</button>
          <button class="btn danger" data-clear-history="meetings">Clear meetings</button>
          <button class="btn danger" data-clear-history="whatsapp-campaigns">Clear WhatsApp history</button>
        </div>
        <div class="muted" style="margin-top: 10px;">Use this only to remove old testing history. Candidates and guests are not deleted here.</div>
      </section>
    </div>
  `;
}

function meetingRow(meeting) {
  return `
    <div class="meeting-row">
      <div class="meeting-meta">
        <div class="name">${meeting.title}</div>
        <div class="muted">${meeting.code || meeting.id} | ${meeting.host} | ${meeting.start}</div>
        <div class="muted">${meetingAccessLabel(meeting)}</div>
      </div>
      <div class="actions">
        <span class="pill ${meeting.status === "Live" ? "ok" : ""}">${meeting.status}</span>
        <span class="pill">${meeting.participants}</span>
      </div>
    </div>
  `;
}

function personRow(name, role) {
  return `
    <div class="person-row">
      <div class="person-meta">
        <div class="name">${name}</div>
        <div class="muted">${role}</div>
      </div>
      <span class="pill ok">Present</span>
    </div>
  `;
}

function transcriptLine(line) {
  return `
    <div class="transcript-line">
      <div><strong>${line.speaker}</strong> <span class="muted">${line.time}</span></div>
      <div>${line.text}</div>
    </div>
  `;
}

function filteredAttendance() {
  let rows = attendanceRows;
  if (state.user?.role === "Candidate") {
    rows = rows.filter(row => row.email.toLowerCase() === state.user.email.toLowerCase());
  }
  if (state.user?.role === "Guest") {
    rows = rows.filter(row => row.email.toLowerCase() === state.user.email.toLowerCase());
  }
  const fromTime = state.attendanceFilter.from ? new Date(`${state.attendanceFilter.from}T00:00:00`).getTime() : 0;
  const toTime = state.attendanceFilter.to ? new Date(`${state.attendanceFilter.to}T23:59:59`).getTime() : Infinity;
  return rows
    .filter(row => state.attendanceFilter.role === "all" || row.role === state.attendanceFilter.role)
    .filter(row => {
      const rowTime = getAttendanceRowTime(row);
      return !rowTime || (rowTime >= fromTime && rowTime <= toTime);
    })
    .sort((a, b) => {
      const bTime = new Date(b.leftAt || b.joinedAt || 0).getTime();
      const aTime = new Date(a.leftAt || a.joinedAt || 0).getTime();
      return bTime - aTime;
    });
}

function getAttendanceRowTime(row) {
  const timestamp = row.leftAt || row.joinedAt;
  if (timestamp) {
    const parsed = new Date(timestamp).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function visibleNavItems() {
  const allowedRoutes = roleRoutes[state.user.role] || roleRoutes.Guest;
  if (!allowedRoutes.includes(state.route)) {
    state.route = "dashboard";
  }
  return navItems.filter(([route]) => allowedRoutes.includes(route));
}

async function loadBootstrapData() {
  try {
    const data = await apiRequest("/api/bootstrap");
    meetings = data.meetings || meetings;
    guests = data.guests || guests;
    candidates = data.candidates || candidates;
    attendanceRows = data.attendance || attendanceRows;
    transcriptLines = data.transcripts || transcriptLines;
    whatsappCampaigns = data.whatsappCampaigns || whatsappCampaigns;
    state.settings = { ...state.settings, ...(data.settings || {}) };
    try {
      const whatsappStatus = await apiRequest("/api/whatsapp/status");
      state.settings.whatsappApiStatus = whatsappStatus.status || state.settings.whatsappApiStatus;
    } catch (error) {
      state.settings.whatsappApiStatus = state.settings.whatsappApiStatus || "Not configured";
    }
    state.backendOnline = true;
  } catch (error) {
    state.backendOnline = false;
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

function bindLogin() {
  let selectedRole = "Admin";
  const email = document.querySelector("#email");
  const name = document.querySelector("#name");
  const password = document.querySelector("#password");
  const passwordField = document.querySelector("#passwordField");
  const loginBtn = document.querySelector("#loginBtn");
  const googleLoginBox = document.querySelector("#googleLoginBox");
  const googleLoginStatus = document.querySelector("#googleLoginStatus");

  function updateLoginMode() {
    const isCandidate = selectedRole === "Candidate";
    googleLoginBox.hidden = !isCandidate;
    email.closest(".field").hidden = isCandidate;
    name.closest(".field").hidden = isCandidate;
    passwordField.hidden = selectedRole !== "Admin";
    loginBtn.hidden = isCandidate;
    loginBtn.textContent = "Continue";

    if (isCandidate) {
      renderGoogleSignIn();
    }
  }

  document.querySelectorAll(".role-card").forEach(card => {
    card.addEventListener("click", () => {
      selectedRole = card.dataset.role;
      document.querySelectorAll(".role-card").forEach(item => item.classList.remove("active"));
      card.classList.add("active");
      const defaults = {
        Admin: ["admin@SkillArionDevelopment.in", "Company Admin"],
        Candidate: ["candidate@gmail.com", "Candidate User"],
        Guest: ["guest@example.com", "Guest User"],
      };
      email.value = defaults[selectedRole][0];
      name.value = defaults[selectedRole][1];
      updateLoginMode();
    });
  });

  loginBtn.addEventListener("click", async () => {
    if (selectedRole === "Admin") {
      try {
        state.user = await apiRequest("/api/auth/admin", {
          method: "POST",
          body: JSON.stringify({
            name: name.value.trim() || "Company Admin",
            email: email.value.trim(),
            password: password.value,
          }),
        });
        state.backendOnline = true;
      } catch (error) {
        state.backendOnline = false;
        alert(error.message);
        return;
      }
    } else if (selectedRole === "Guest") {
      try {
        state.user = await apiRequest("/api/auth/guest", {
          method: "POST",
          body: JSON.stringify({
            name: name.value.trim() || "Guest User",
            email: email.value.trim(),
          }),
        });
        state.backendOnline = true;
      } catch (error) {
        state.backendOnline = false;
        alert(error.message);
        return;
      }
    } else {
      state.user = {
        name: name.value.trim() || "Company User",
        email: email.value.trim() || "candidate@gmail.com",
        role: selectedRole,
      };
    }
    await loadBootstrapData();
    render();
  });

  function renderGoogleSignIn() {
    const buttonHost = document.querySelector("#googleSignInButton");
    const clientId = config.googleClientId || "";
    const isConfigured = clientId && !clientId.includes("PASTE_GOOGLE_CLIENT_ID_HERE");

    buttonHost.innerHTML = "";

    if (!isConfigured) {
      buttonHost.innerHTML = `
        <button class="google-demo-button" type="button" disabled>
          <span class="google-g">G</span>
          Continue with Google
        </button>
      `;
      googleLoginStatus.textContent = "Add your Google OAuth Client ID in app-config.js to activate this button.";
      return;
    }

    if (!window.google?.accounts?.id) {
      buttonHost.innerHTML = `
        <button class="google-demo-button" type="button" disabled>
          <span class="google-g">G</span>
          Continue with Google
        </button>
      `;
      googleLoginStatus.textContent = "Google sign-in is loading. Refresh once if the button does not appear.";
      return;
    }

    googleLoginStatus.textContent = "Use your Google account. Password is entered only on Google, not inside this app.";
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
    });
    window.google.accounts.id.renderButton(buttonHost, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: 320,
    });
  }

  updateLoginMode();
}

async function handleGoogleCredential(response) {
  const profile = parseJwt(response.credential);
  state.user = {
    name: profile.name || profile.given_name || "Candidate User",
    email: profile.email || "candidate@gmail.com",
    role: "Candidate",
    picture: profile.picture || "",
  };
  await loadBootstrapData();
  if (state.pendingJoinCode) {
    await joinMeetingWithCode(state.pendingJoinCode);
    return;
  }
  render();
}

function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map(char => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(json);
  } catch (error) {
    return {};
  }
}

async function navigateTo(route, options = {}) {
  state.route = route;
  state.leaveMessage = "";
  if (!options.skipHistory) {
    window.history.pushState({ route }, "", window.location.pathname);
  }
  if (state.route === "attendance" || state.route === "dashboard" || state.route === "meeting") {
    await loadBootstrapData();
  }
  render();
}

function bindShell() {
  document.querySelectorAll("[data-route]").forEach(button => {
    button.addEventListener("click", async () => {
      await navigateTo(button.dataset.route);
    });
  });

  document.querySelector("#backToHomeBtn")?.addEventListener("click", async () => {
    await navigateTo("dashboard");
  });

  document.querySelector("#logoutBtn")?.addEventListener("click", () => {
    stopCamera();
    state.user = null;
    state.route = "dashboard";
    render();
  });

  document.querySelector("#micBtn")?.addEventListener("click", () => {
    state.micOn = !state.micOn;
    render();
  });

  document.querySelector("#cameraBtn")?.addEventListener("click", toggleCamera);
  document.querySelector("#screenBtn")?.addEventListener("click", shareScreen);
  document.querySelector("#chatBtn")?.addEventListener("click", () => {
    state.meetingPanel = state.meetingPanel === "chat" ? "" : "chat";
    render();
  });
  document.querySelector("#peopleBtn")?.addEventListener("click", () => {
    state.meetingPanel = state.meetingPanel === "participants" ? "" : "participants";
    render();
  });
  document.querySelector("#markAttendanceBtn")?.addEventListener("click", () => {
    state.attendanceTracking = true;
    state.meetingPanel = state.meetingPanel === "attendance" ? "" : "attendance";
    render();
  });
  document.querySelector("#closeMeetingPanelBtn")?.addEventListener("click", () => {
    state.meetingPanel = "";
    render();
  });
  document.querySelector("#sendChatBtn")?.addEventListener("click", () => {
    const input = document.querySelector("#chatInput");
    if (input?.value.trim()) {
      sendChatMessage(input.value.trim());
    }
  });
  document.querySelector("#endBtn")?.addEventListener("click", () => {
    endMeeting();
  });

  document.querySelector("#fromDate")?.addEventListener("change", event => {
    state.attendanceFilter.from = event.target.value;
    render();
  });
  document.querySelector("#toDate")?.addEventListener("change", event => {
    state.attendanceFilter.to = event.target.value;
    render();
  });
  document.querySelector("#roleFilter")?.addEventListener("change", event => {
    state.attendanceFilter.role = event.target.value;
    render();
  });
  document.querySelector("#exportCsvBtn")?.addEventListener("click", exportAttendanceCsv);
  document.querySelectorAll("[data-clear-history]").forEach(button => {
    button.addEventListener("click", () => clearHistory(button.dataset.clearHistory));
  });
  document.querySelector("#addCandidateBtn")?.addEventListener("click", addCandidate);
  document.querySelector("#addGuestBtn")?.addEventListener("click", addGuest);
  document.querySelector("#createMeetingBtn")?.addEventListener("click", createMeeting);
  document.querySelector("#copyMeetingCodeBtn")?.addEventListener("click", copyMeetingCode);
  document.querySelector("#copyMeetingLinkBtn")?.addEventListener("click", copyMeetingLink);
  document.querySelector("#joinMeetingBtn")?.addEventListener("click", joinMeetingByCode);
  document.querySelector("#startTranscriptBtn")?.addEventListener("click", toggleTranscript);
  document.querySelector("#downloadTranscriptBtn")?.addEventListener("click", downloadTranscript);
  document.querySelector("#saveSettingsBtn")?.addEventListener("click", saveSettings);
  document.querySelector("#whatsappCsv")?.addEventListener("change", previewWhatsappCsv);
  document.querySelector("#whatsappCandidateStatus")?.addEventListener("change", event => {
    state.whatsappCandidateStatus = event.target.value;
    render();
  });
  document.querySelector("#addSelectedCandidatesBtn")?.addEventListener("click", addSelectedCandidatesToWhatsapp);
  document.querySelector("#whatsappSendMode")?.addEventListener("change", event => {
    captureWhatsappDraft();
    state.whatsappSendMode = event.target.value;
    render();
  });
  document.querySelector("#previewWhatsappRecipientsBtn")?.addEventListener("click", previewWhatsappRecipients);
  document.querySelector("#clearWhatsappRecipientsBtn")?.addEventListener("click", clearWhatsappRecipients);
  document.querySelector("#saveWhatsappCampaignBtn")?.addEventListener("click", saveWhatsappCampaign);

  attachLocalVideo();
}

async function toggleCamera() {
  if (state.cameraOn) {
    stopCamera();
    render();
    return;
  }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    state.cameraOn = true;
    render();
  } catch (error) {
    alert("Camera permission was not available in this browser session.");
  }
}

function attachLocalVideo() {
  const video = document.querySelector("#localVideo");
  if (video && state.stream) {
    video.srcObject = state.stream;
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
  }
  state.stream = null;
  state.cameraOn = false;
}

async function shareScreen() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    alert("Screen sharing is not available in this browser.");
    return;
  }
  try {
    const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
    screen.getTracks().forEach(track => track.addEventListener("ended", () => track.stop()));
  } catch (error) {
    alert("Screen sharing was cancelled or blocked.");
  }
}

function exportAttendanceCsv() {
  const rows = filteredAttendance();
  const summary = buildAttendanceSummary(rows);
  const reportRows = [
    ["SkillArionMeet Attendance Report"],
    ["Generated at", new Date().toLocaleString()],
    ["Date from", state.attendanceFilter.from || "All"],
    ["Date to", state.attendanceFilter.to || "All"],
    ["Role filter", state.attendanceFilter.role === "all" ? "All roles" : state.attendanceFilter.role],
    [],
    ["Summary"],
    ["Total joins", summary.total],
    ["Completed attendance", summary.completed],
    ["Live records", summary.live],
    ["Average attended", `${summary.averagePercent}%`],
    [],
    ["Meeting-wise summary"],
    ["Meeting", "Total joined", "Completed", "Live", "Average attended"],
    ...summary.meetings.map(item => [item.meeting, item.total, item.completed, item.live, `${item.averagePercent}%`]),
    [],
    ["Detailed attendance"],
    ["Name", "Email", "Role", "Meeting", "Joined", "Left", "Duration", "Attendance %"],
    ...rows.map(row => [row.name, row.email, row.role, row.meeting, row.joined, row.left, row.duration, `${row.percent}%`]),
  ];
  const csv = reportRows.map(csvLine).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvLine(values) {
  return values.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",");
}

async function createMeeting() {
  const title = document.querySelector("#newMeetingTitle")?.value.trim();
  const customCode = document.querySelector("#newMeetingCode")?.value.trim();
  const startValue = document.querySelector("#newMeetingStart")?.value;
  const accessMode = document.querySelector("#newMeetingAccessMode")?.value || "all";
  const allowedEmails = parseEmailList(document.querySelector("#newMeetingAllowedEmails")?.value || "");
  if (!title) {
    alert("Meeting title is required.");
    return;
  }
  if (accessMode === "invited" && !allowedEmails.length) {
    alert("Add at least one invited email for this access mode.");
    return;
  }

  try {
    const meeting = await apiRequest("/api/meetings", {
      method: "POST",
      body: JSON.stringify({
        title,
        code: customCode,
        host: state.user.name,
        start: startValue ? new Date(startValue).toLocaleString() : new Date().toLocaleString(),
        status: "Live",
        accessMode,
        allowedEmails,
      }),
    });
    meetings.unshift(meeting);
    state.lastCreatedMeeting = meeting;
    state.activeMeeting = meeting;
    state.backendOnline = true;
    render();
  } catch (error) {
    alert(`Meeting could not be created: ${error.message}`);
  }
}

async function copyMeetingCode() {
  if (!state.lastCreatedMeeting?.code) {
    return;
  }
  try {
    await navigator.clipboard.writeText(state.lastCreatedMeeting.code);
    alert("Meeting code copied.");
  } catch (error) {
    alert(`Meeting code: ${state.lastCreatedMeeting.code}`);
  }
}

async function copyMeetingLink() {
  if (!state.lastCreatedMeeting?.code) {
    return;
  }
  const link = getMeetingJoinLink(state.lastCreatedMeeting);
  try {
    await navigator.clipboard.writeText(link);
    alert("Meeting link copied.");
  } catch (error) {
    alert(`Meeting link: ${link}`);
  }
}

function getMeetingJoinLink(meeting) {
  return `${window.location.origin}${window.location.pathname}?meet=${encodeURIComponent(meeting.code)}`;
}

async function joinMeetingByCode() {
  const input = document.querySelector("#joinMeetingCode");
  const code = extractMeetingCode(input?.value.trim());
  await joinMeetingWithCode(code);
}

async function joinMeetingWithCode(codeValue) {
  const code = extractMeetingCode(codeValue);
  if (!code) {
    state.joinMessage = "Enter a meeting code first.";
    render();
    return;
  }

  try {
    const result = await apiRequest("/api/meetings/join", {
      method: "POST",
      body: JSON.stringify({
        code,
        name: state.user.name,
        email: state.user.email,
        role: state.user.role,
      }),
    });
    state.activeMeeting = result.meeting;
    state.activeAttendance = result.attendance;
    state.pendingJoinCode = "";
    state.joinMessage = "";
    window.history.replaceState({}, "", window.location.pathname);
    attendanceRows.unshift(result.attendance);
    meetings = meetings.map(meeting => meeting.id === result.meeting.id ? result.meeting : meeting);
    state.route = "meeting";
    state.backendOnline = true;
    render();
  } catch (error) {
    state.joinMessage = error.message || "Meeting code was not found. Please check the code and try again.";
    render();
  }
}

function parseEmailList(value) {
  return String(value || "")
    .split(/[\n,]+/)
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

function meetingAccessLabel(meeting) {
  const labels = {
    all: "Access: candidates and guests",
    candidates: "Access: candidates only",
    guests: "Access: guests only",
    invited: `Access: invited emails only${meeting.allowedEmails?.length ? ` (${meeting.allowedEmails.length})` : ""}`,
  };
  return labels[meeting.accessMode || "all"] || labels.all;
}

function extractMeetingCode(value) {
  if (!value) {
    return "";
  }
  try {
    const url = new URL(value);
    return url.searchParams.get("meet") || value;
  } catch (error) {
    const match = value.toUpperCase().match(/SKM-[A-Z0-9-]+/);
    return match ? match[0] : value;
  }
}

async function endMeeting() {
  stopCamera();

  if (state.activeMeeting?.code) {
    try {
      const result = await apiRequest(`/api/meetings/${encodeURIComponent(state.activeMeeting.code)}/leave`, {
        method: "POST",
        body: JSON.stringify({
          attendanceId: state.activeAttendance?.id || "",
          email: state.user.email,
        }),
      });
      const replaced = attendanceRows.some(row => row.id === result.attendance.id);
      attendanceRows = replaced
        ? attendanceRows.map(row => row.id === result.attendance.id ? result.attendance : row)
        : [result.attendance, ...attendanceRows];
      state.backendOnline = true;
      state.leaveMessage = `You left ${result.meeting.title}. Attendance saved.`;
    } catch (error) {
      state.backendOnline = false;
      state.leaveMessage = "You left the meeting, but attendance leave time could not be saved.";
    }
  } else {
    state.leaveMessage = state.user.role === "Admin" ? "" : "You left the meeting. No attendance was saved because this room was not joined through a meeting code or link.";
  }

  state.activeMeeting = null;
  state.activeAttendance = null;
  state.route = "dashboard";
  await loadBootstrapData();
  if (state.user.role !== "Admin" && state.leaveMessage) {
    alert(state.leaveMessage);
  }
  render();
}

async function sendChatMessage(text) {
  const message = {
    sender: state.user.name,
    role: state.user.role,
    text,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  chatMessages.push(message);

  if (state.transcriptActive) {
    const line = {
      time: message.time,
      speaker: message.sender,
      section: state.user.role === "Admin" ? "Admin" : "Candidate",
      text,
    };
    transcriptLines.unshift(line);
    apiRequest("/api/transcripts", {
      method: "POST",
      body: JSON.stringify(line),
    }).catch(() => {
      state.backendOnline = false;
    });
  }

  state.meetingPanel = "chat";
  render();
}

function toggleTranscript() {
  state.transcriptActive = !state.transcriptActive;
  const line = {
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    speaker: "Admin",
    section: "Admin",
    text: state.transcriptActive ? "Transcript capture is now active. New meeting messages will be added here." : "Transcript capture is paused.",
  };
  transcriptLines.unshift(line);
  apiRequest("/api/transcripts", {
    method: "POST",
    body: JSON.stringify(line),
  }).catch(() => {
    state.backendOnline = false;
  });
  render();
}

function downloadTranscript() {
  const allowedSection = state.user?.role === "Admin" ? null : "Candidate";
  const lines = transcriptLines
    .filter(line => !allowedSection || line.section === allowedSection)
    .map(line => `[${line.time}] ${line.speaker}: ${line.text}`)
    .join("\n");
  const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = state.user?.role === "Admin" ? "meeting-transcript.txt" : "my-transcript.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function previewWhatsappCsv(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    whatsappDraftRecipients = mergeRecipients(whatsappDraftRecipients, parseWhatsappRecipients(reader.result));
    updateWhatsappPreview();
  };
  reader.readAsText(file);
}

function renderWhatsappCandidatePicker() {
  const filtered = candidates.filter(candidate => {
    return state.whatsappCandidateStatus === "all" || candidate.status === state.whatsappCandidateStatus;
  });
  if (!filtered.length) {
    return `<div class="muted">No saved candidates match this status.</div>`;
  }
  return filtered.map(candidate => `
    <label class="candidate-check">
      <input type="checkbox" class="whatsappCandidateCheck" value="${candidate.email}" />
      <span>
        <strong>${candidate.name}</strong>
        <small>${candidate.phone} | ${candidate.status}</small>
      </span>
    </label>
  `).join("");
}

function addSelectedCandidatesToWhatsapp() {
  const selectedEmails = Array.from(document.querySelectorAll(".whatsappCandidateCheck:checked"))
    .map(input => input.value.toLowerCase());
  if (!selectedEmails.length) {
    alert("Select at least one saved candidate.");
    return;
  }
  const selected = candidates
    .filter(candidate => selectedEmails.includes(String(candidate.email || "").toLowerCase()))
    .map(candidate => ({ name: candidate.name, phone: normalizePhone(candidate.phone) }));
  whatsappDraftRecipients = mergeRecipients(whatsappDraftRecipients, selected);
  updateWhatsappPreview();
}

function previewWhatsappRecipients() {
  captureWhatsappDraft();
  const manual = document.querySelector("#whatsappManualRecipients")?.value || "";
  whatsappDraftRecipients = mergeRecipients(whatsappDraftRecipients, parseWhatsappRecipients(manual));
  updateWhatsappPreview();
}

function clearWhatsappRecipients() {
  whatsappDraftRecipients = [];
  state.whatsappDraftManual = "";
  const manual = document.querySelector("#whatsappManualRecipients");
  const csv = document.querySelector("#whatsappCsv");
  if (manual) {
    manual.value = "";
  }
  if (csv) {
    csv.value = "";
  }
  updateWhatsappPreview();
}

function captureWhatsappDraft() {
  const manual = document.querySelector("#whatsappManualRecipients");
  const message = document.querySelector("#whatsappMessage");
  const scheduledAt = document.querySelector("#whatsappScheduledAt");
  if (manual) {
    state.whatsappDraftManual = manual.value;
  }
  if (message) {
    state.whatsappDraftMessage = message.value;
  }
  if (scheduledAt) {
    state.whatsappDraftScheduledAt = scheduledAt.value;
  }
}

function updateWhatsappPreview() {
  const preview = document.querySelector("#whatsappPreview");
  if (!preview) {
    return;
  }
  preview.innerHTML = renderWhatsappPreviewMarkup();
}

function renderWhatsappPreviewMarkup() {
  if (!whatsappDraftRecipients.length) {
    return `<div class="muted">No candidate numbers previewed yet.</div>`;
  }
  return `
    <div class="panel-header compact">
      <strong>${whatsappDraftRecipients.length} candidates ready</strong>
      <span class="pill ok">Preview</span>
    </div>
    <div class="list">
      ${whatsappDraftRecipients.slice(0, 8).map(person => `
        <div class="recipient-row">
          <strong>${person.name}</strong>
          <span>${person.phone}</span>
        </div>
      `).join("")}
      ${whatsappDraftRecipients.length > 8 ? `<div class="muted">+${whatsappDraftRecipients.length - 8} more candidates</div>` : ""}
    </div>
  `;
}

function renderWhatsappDeliveryResults(campaign) {
  if (!Array.isArray(campaign.deliveryResults) || !campaign.deliveryResults.length) {
    return "";
  }
  const sent = campaign.deliveryResults.filter(result => result.status === "Sent").length;
  const failed = campaign.deliveryResults.filter(result => result.status === "Failed").length;
  const pending = campaign.deliveryResults.length - sent - failed;
  return `
    <div class="muted" style="margin-top: 8px;">
      Delivery: ${sent} sent${failed ? `, ${failed} failed` : ""}${pending ? `, ${pending} pending` : ""}
    </div>
  `;
}

function parseWhatsappRecipients(value) {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  return lines
    .map(line => {
      const columns = line.split(",").map(part => part.trim()).filter(Boolean);
      if (columns.length < 2 || columns[0].toLowerCase() === "name") {
        return null;
      }
      return {
        name: columns[0],
        phone: normalizePhone(columns[1]),
      };
    })
    .filter(person => person?.name && person.phone);
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  return digits.startsWith("91") ? digits : `91${digits}`;
}

function mergeRecipients(existing, next) {
  const byPhone = new Map();
  [...existing, ...next].forEach(person => {
    if (person.phone) {
      byPhone.set(person.phone, person);
    }
  });
  return Array.from(byPhone.values());
}

async function saveWhatsappCampaign() {
  captureWhatsappDraft();
  previewWhatsappRecipients();
  const message = state.whatsappDraftMessage.trim();
  const sendMode = state.whatsappSendMode;
  const scheduleValue = state.whatsappDraftScheduledAt;

  if (!whatsappDraftRecipients.length) {
    alert("Add candidate names and WhatsApp numbers first.");
    return;
  }
  if (!message) {
    alert("Message is required.");
    return;
  }
  if (sendMode === "Scheduled" && !scheduleValue) {
    alert("Select schedule date and time.");
    return;
  }

  const campaign = {
    message,
    recipients: whatsappDraftRecipients,
    sendMode,
    scheduledAt: scheduleValue ? new Date(scheduleValue).toLocaleString() : "",
    status: sendMode === "Scheduled" ? "Scheduled locally" : "Saved locally",
    createdAt: new Date().toLocaleString(),
  };

  try {
    const saved = await apiRequest("/api/whatsapp-campaigns", {
      method: "POST",
      body: JSON.stringify(campaign),
    });
    whatsappCampaigns.unshift(saved);
    state.backendOnline = true;
    campaign.status = saved.status || campaign.status;
  } catch (error) {
    whatsappCampaigns.unshift({ ...campaign, id: `WA-${Date.now()}` });
    state.backendOnline = false;
    campaign.status = "Saved locally because backend did not respond";
  }

  whatsappDraftRecipients = [];
  state.whatsappDraftManual = "";
  state.whatsappDraftMessage = "";
  state.whatsappDraftScheduledAt = "";
  state.whatsappSendMode = "Immediate";
  alert(sendMode === "Scheduled" ? "WhatsApp campaign scheduled locally." : campaign.status);
  render();
}

async function addGuest() {
  const name = document.querySelector("#guestName").value.trim();
  const email = document.querySelector("#guestEmail").value.trim();
  const meeting = document.querySelector("#guestMeeting").value.trim();
  if (!name || !email) {
    alert("Guest name and email are required.");
    return;
  }
  const guest = { name, email, meeting: meeting || "General access", status: "Invited" };
  guests.unshift(guest);
  apiRequest("/api/guests", {
    method: "POST",
    body: JSON.stringify(guest),
  }).catch(() => {
    state.backendOnline = false;
  });
  render();
}

async function addCandidate() {
  const name = document.querySelector("#candidateName")?.value.trim();
  const email = document.querySelector("#candidateEmail")?.value.trim();
  const phone = normalizePhone(document.querySelector("#candidatePhone")?.value);
  const program = document.querySelector("#candidateProgram")?.value || "Internship";
  const status = document.querySelector("#candidateStatus")?.value || "Shortlisted";

  if (!name || !email || !phone) {
    alert("Candidate name, email, and WhatsApp number are required.");
    return;
  }

  const candidate = { name, email, phone, program, status };
  try {
    const saved = await apiRequest("/api/candidates", {
      method: "POST",
      body: JSON.stringify(candidate),
    });
    candidates.unshift(saved);
    state.backendOnline = true;
  } catch (error) {
    candidates.unshift(candidate);
    state.backendOnline = false;
  }
  render();
}

async function saveSettings() {
  state.settings.capacityLimit = Number(document.querySelector("#capacityLimit")?.value) || 1000;
  state.settings.guestAccess = document.querySelector("#guestAccess")?.value || "Invite link";
  state.settings.transcriptMode = document.querySelector("#transcriptMode")?.value || "Manual start";
  state.settings.candidateTranscriptAccess = document.querySelector("#candidateTranscriptAccess")?.value === "yes";
  state.settings.exportFormat = document.querySelector("#exportFormat")?.value || "CSV";
  state.settings.databaseMode = state.settings.databaseMode || "Local JSON database";
  state.settings.deploymentTarget = state.settings.deploymentTarget || "Not deployed";
  state.settings.whatsappApiStatus = state.settings.whatsappApiStatus || "Not configured";
  try {
    await apiRequest("/api/settings", {
      method: "PUT",
      body: JSON.stringify(state.settings),
    });
    state.backendOnline = true;
    alert("Settings saved.");
  } catch (error) {
    state.backendOnline = false;
    alert("Settings saved locally, but the backend did not respond.");
  }
  render();
}

async function clearHistory(type) {
  const labels = {
    attendance: "attendance records",
    meetings: "meeting history",
    "whatsapp-campaigns": "WhatsApp campaign history",
  };
  if (!confirm(`Clear ${labels[type] || "history"}? This cannot be undone.`)) {
    return;
  }
  try {
    await apiRequest(`/api/${type}`, { method: "DELETE" });
    await loadBootstrapData();
    state.backendOnline = true;
    alert(`${labels[type] || "History"} cleared.`);
  } catch (error) {
    state.backendOnline = false;
    alert(error.message);
  }
  render();
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("");
}

async function initApp() {
  await loadBootstrapData();
  window.history.replaceState({ route: state.route }, "", window.location.pathname + window.location.search);
  window.addEventListener("popstate", async event => {
    const route = event.state?.route || "dashboard";
    if (!state.user) {
      render();
      return;
    }
    await navigateTo(route, { skipHistory: true });
  });
  render();
}

initApp();
