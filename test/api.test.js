const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillarion-meet-test-"));
const port = 22000 + Math.floor(Math.random() * 10000);
const baseUrl = `http://127.0.0.1:${port}`;
let serverProcess;

test.before(async () => {
  serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      NODE_ENV: "test",
      DATA_DIR: testDataDir,
      MONGODB_URI: "",
      ADMIN_EMAIL: "admin@test.local",
      ADMIN_PASSWORD: "test-admin-password",
      GOOGLE_CLIENT_ID: "",
      WHATSAPP_ACCESS_TOKEN: "",
      WHATSAPP_PHONE_NUMBER_ID: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await waitForServer();
});

test.after(async () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
    await new Promise(resolve => serverProcess.once("exit", resolve));
  }
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

test("health, authentication, authorization, and meeting creation", async () => {
  const health = await request("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.mode, "local-json");

  const unauthorized = await request("/api/bootstrap");
  assert.equal(unauthorized.response.status, 401);

  const login = await request("/api/auth/admin", {
    method: "POST",
    body: JSON.stringify({
      email: "admin@test.local",
      password: "test-admin-password",
      name: "Test Admin",
    }),
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.body.role, "Admin");
  assert.ok(login.body.token);

  const token = login.body.token;
  const bootstrap = await request("/api/bootstrap", {}, token);
  assert.equal(bootstrap.response.status, 200);
  assert.deepEqual(bootstrap.body.candidates, []);
  assert.deepEqual(bootstrap.body.guests, []);
  assert.deepEqual(bootstrap.body.transcripts, []);

  const created = await request("/api/meetings", {
    method: "POST",
    body: JSON.stringify({ title: "Automated smoke meeting", code: "SMOKE-ROOM" }),
  }, token);
  assert.equal(created.response.status, 201);
  assert.equal(created.body.title, "Automated smoke meeting");
  assert.ok(created.body.code);

  const meetings = await request("/api/meetings", {}, token);
  assert.equal(meetings.response.status, 200);
  assert.equal(meetings.body.length, 1);

  const joined = await request("/api/meetings/join", {
    method: "POST",
    body: JSON.stringify({ code: created.body.code }),
  }, token);
  assert.equal(joined.response.status, 200);
  assert.equal(joined.body.meeting.participants, 1);

  const repeatedJoin = await request("/api/meetings/join", {
    method: "POST",
    body: JSON.stringify({ code: created.body.code }),
  }, token);
  assert.equal(repeatedJoin.response.status, 200);
  assert.equal(repeatedJoin.body.attendance.id, joined.body.attendance.id);
  assert.equal(repeatedJoin.body.meeting.participants, 1);

  const settings = await request("/api/settings", {
    method: "PUT",
    body: JSON.stringify({ capacityLimit: 1, candidateTranscriptAccess: true }),
  }, token);
  assert.equal(settings.response.status, 200);

  const guest = await request("/api/guests", {
    method: "POST",
    body: JSON.stringify({
      name: "Test Guest",
      email: "guest@test.local",
      meeting: created.body.code,
    }),
  }, token);
  assert.equal(guest.response.status, 201);
  assert.equal(guest.body.email, "guest@test.local");

  const guestLogin = await request("/api/auth/guest", {
    method: "POST",
    body: JSON.stringify({ email: "guest@test.local" }),
  });
  assert.equal(guestLogin.response.status, 200);

  const fullMeeting = await request("/api/meetings/join", {
    method: "POST",
    body: JSON.stringify({ code: created.body.code }),
  }, guestLogin.body.token);
  assert.equal(fullMeeting.response.status, 403);
  assert.match(fullMeeting.body.error, /participant limit/i);

  const left = await request(`/api/meetings/${encodeURIComponent(created.body.code)}/leave`, {
    method: "POST",
    body: JSON.stringify({ attendanceId: joined.body.attendance.id }),
  }, token);
  assert.equal(left.response.status, 200);
  assert.equal(left.body.meeting.participants, 0);

  const guestJoined = await request("/api/meetings/join", {
    method: "POST",
    body: JSON.stringify({ code: created.body.code }),
  }, guestLogin.body.token);
  assert.equal(guestJoined.response.status, 200);
  assert.equal(guestJoined.body.attendance.email, "guest@test.local");
  assert.equal(guestJoined.body.meeting.participants, 1);

  const scheduledCampaign = await request("/api/whatsapp-campaigns", {
    method: "POST",
    body: JSON.stringify({
      message: "Scheduled test message",
      recipients: [{ name: "Test Guest", phone: "919876543210" }],
      sendMode: "Scheduled",
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
  }, token);
  assert.equal(scheduledCampaign.response.status, 201);
  assert.equal(scheduledCampaign.body.status, "Scheduled");

  const invalidSchedule = await request("/api/whatsapp-campaigns", {
    method: "POST",
    body: JSON.stringify({
      message: "Bad schedule",
      recipients: [{ name: "Test Guest", phone: "919876543210" }],
      sendMode: "Scheduled",
      scheduledAt: new Date(Date.now() - 1000).toISOString(),
    }),
  }, token);
  assert.equal(invalidSchedule.response.status, 400);

  const logout = await request("/api/auth/logout", { method: "POST" }, token);
  assert.equal(logout.response.status, 200);

  const expiredSession = await request("/api/bootstrap", {}, token);
  assert.equal(expiredSession.response.status, 401);
});

async function request(route, options = {}, token = "") {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${baseUrl}${route}`, { ...options, headers });
  const body = await response.json();
  return { response, body };
}

async function waitForServer() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Test server exited with code ${serverProcess.exitCode}.`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // The child process is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for the test server.");
}
