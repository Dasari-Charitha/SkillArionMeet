const http = require("http");
const fs = require("fs");
const path = require("path");

loadEnvFile();

let MongoClient = null;
try {
  ({ MongoClient } = require("mongodb"));
} catch (error) {
  MongoClient = null;
}

const port = Number(process.env.PORT) || 5173;
const root = __dirname;
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "db.json");
const mongoUri = process.env.MONGODB_URI || "";
const mongoDbName = process.env.MONGODB_DB || "skillarion_meet";
const adminEmail = (process.env.ADMIN_EMAIL || "admin@SkillArionDevelopment.in").toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || "SkillArionAdmin123";
const collectionNames = ["meetings", "guests", "candidates", "whatsappCampaigns", "attendance", "transcripts"];
let mongoClient = null;
let mongoDb = null;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const seedDb = {
  settings: {
    companyDomain: "SkillArionDevelopment.in",
    meetingTimeLimit: "No fixed time limit",
    capacityLimit: 1000,
    guestAccess: "Invite link",
    transcriptMode: "Manual start",
    candidateTranscriptAccess: true,
    exportFormat: "CSV",
    databaseMode: "Local JSON database",
    deploymentTarget: "Not deployed",
    whatsappApiStatus: "Not configured",
  },
  meetings: [],
  guests: [
    { name: "Rahul Iyer", email: "rahul@gmail.com", status: "Invited", meeting: "Training Batch Orientation" },
    { name: "Sana Ali", email: "sana@example.com", status: "Active", meeting: "Frontend Hiring Round" },
  ],
  candidates: [
    { name: "Aarav Mehta", email: "aarav@gmail.com", phone: "919876543210", program: "Internship", status: "Shortlisted" },
    { name: "Diya Shah", email: "diya@gmail.com", phone: "919812345678", program: "Internship", status: "Interview pending" },
    { name: "Meera Kapoor", email: "meera@gmail.com", phone: "919998887776", program: "Training", status: "Active" },
  ],
  whatsappCampaigns: [
    {
      id: "WA-1001",
      message: "Congratulations, you have been shortlisted for the internship round. Please check your meeting link and join on time.",
      recipients: [
        { name: "Aarav Mehta", phone: "919876543210" },
        { name: "Diya Shah", phone: "919812345678" },
      ],
      sendMode: "Immediate",
      scheduledAt: "",
      status: "Saved locally",
      createdAt: "2026-06-03 10:00",
    },
  ],
  attendance: [],
  transcripts: [
    { time: "10:04", speaker: "Host", section: "Admin", text: "Welcome everyone. We will start with the project overview and then move to questions." },
    { time: "10:08", speaker: "Aarav Mehta", section: "Candidate", text: "I have experience with React, REST APIs, and dashboard workflows." },
    { time: "10:12", speaker: "Host", section: "Admin", text: "Please explain how you would handle attendance tracking for reconnecting users." },
    { time: "10:16", speaker: "Diya Shah", section: "Candidate", text: "I would store each join and leave session separately and calculate total duration from all sessions." },
  ],
};

ensureDb();

const server = http.createServer(async (request, response) => {
  try {
    const requestedUrl = new URL(request.url, `http://${request.headers.host}`);

    if (requestedUrl.pathname.startsWith("/api/")) {
      await handleApi(request, response, requestedUrl);
      return;
    }

    serveStatic(requestedUrl, response);
  } catch (error) {
    sendJson(response, 500, { error: "Server error", detail: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`SkillArionMeet running at http://127.0.0.1:${port}`);
});

async function handleApi(request, response, requestedUrl) {
  const db = await readDb();
  const method = request.method;
  const pathname = requestedUrl.pathname;

  if (method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, { ok: true, app: "SkillArionMeet", mode: storageMode() });
    return;
  }

  if (method === "GET" && pathname === "/api/bootstrap") {
    sendJson(response, 200, db);
    return;
  }

  if (method === "POST" && pathname === "/api/auth/admin") {
    const body = await readJsonBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (email !== adminEmail || password !== adminPassword) {
      sendJson(response, 401, { error: "Invalid admin email or password." });
      return;
    }
    sendJson(response, 200, {
      name: body.name || "Company Admin",
      email: adminEmail,
      role: "Admin",
    });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/guest") {
    const body = await readJsonBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const guest = (db.guests || []).find(item => String(item.email || "").trim().toLowerCase() === email);
    if (!guest) {
      sendJson(response, 401, { error: "Guest access not found. Ask Admin to add this guest first." });
      return;
    }
    sendJson(response, 200, {
      name: guest.name || body.name || "Guest User",
      email: guest.email,
      role: "Guest",
      status: guest.status || "Invited",
      meeting: guest.meeting || "General access",
    });
    return;
  }

  if (method === "GET" && pathname === "/api/meetings") {
    sendJson(response, 200, db.meetings);
    return;
  }

  if (method === "POST" && pathname === "/api/meetings/join") {
    const body = await readJsonBody(request);
    const meeting = findMeeting(db, body.code || body.link || body.meeting);
    if (!meeting) {
      sendJson(response, 404, { error: "Meeting not found" });
      return;
    }
    const accessError = getMeetingAccessError(db, meeting, body);
    if (accessError) {
      sendJson(response, 403, { error: accessError });
      return;
    }
    const result = joinMeeting(db, meeting, body);
    await writeDb(db);
    sendJson(response, 200, result);
    return;
  }

  const meetingMatch = pathname.match(/^\/api\/meetings\/([^/]+)$/);
  if (method === "GET" && meetingMatch) {
    const meeting = findMeeting(db, meetingMatch[1]);
    if (!meeting) {
      sendJson(response, 404, { error: "Meeting not found" });
      return;
    }
    sendJson(response, 200, meeting);
    return;
  }

  const joinMatch = pathname.match(/^\/api\/meetings\/([^/]+)\/join$/);
  if (method === "POST" && joinMatch) {
    const meeting = findMeeting(db, joinMatch[1]);
    if (!meeting) {
      sendJson(response, 404, { error: "Meeting not found" });
      return;
    }
    const body = await readJsonBody(request);
    const accessError = getMeetingAccessError(db, meeting, body);
    if (accessError) {
      sendJson(response, 403, { error: accessError });
      return;
    }
    const result = joinMeeting(db, meeting, body);
    await writeDb(db);
    sendJson(response, 200, result);
    return;
  }

  const leaveMatch = pathname.match(/^\/api\/meetings\/([^/]+)\/leave$/);
  if (method === "POST" && leaveMatch) {
    const meeting = findMeeting(db, leaveMatch[1]);
    if (!meeting) {
      sendJson(response, 404, { error: "Meeting not found" });
      return;
    }
    const body = await readJsonBody(request);
    const leftAt = new Date();
    const attendance = findOpenAttendance(db, meeting, body);
    if (!attendance) {
      sendJson(response, 404, { error: "Open attendance record not found" });
      return;
    }

    attendance.leftAt = leftAt.toISOString();
    attendance.left = leftAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const joinedAt = new Date(attendance.joinedAt || leftAt);
    attendance.duration = formatDuration(joinedAt, leftAt);
    attendance.attendedSeconds = diffSeconds(joinedAt, leftAt);
    attendance.meetingElapsedSeconds = getMeetingElapsedSeconds(meeting, leftAt);
    attendance.percent = calculateAttendancePercent(attendance.attendedSeconds, attendance.meetingElapsedSeconds);
    await writeDb(db);
    sendJson(response, 200, { meeting, attendance });
    return;
  }

  if (method === "POST" && pathname === "/api/meetings") {
    const body = await readJsonBody(request);
    const requestedCode = normalizeMeetingCode(body.code);
    if (requestedCode && findMeeting(db, requestedCode)) {
      sendJson(response, 409, { error: "Meeting code already exists." });
      return;
    }
    const code = requestedCode || createMeetingCode(db);
    const meeting = {
      id: body.id || code,
      code,
      title: body.title || "Untitled meeting",
      host: body.host || "Company Admin",
      start: body.start || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      duration: body.duration || "0m",
      participants: Number(body.participants) || 0,
      status: body.status || "Live",
      accessMode: normalizeAccessMode(body.accessMode),
      allowedEmails: normalizeEmailList(body.allowedEmails),
    };
    db.meetings.unshift(meeting);
    await writeDb(db);
    sendJson(response, 201, meeting);
    return;
  }

  if (method === "GET" && pathname === "/api/guests") {
    sendJson(response, 200, db.guests);
    return;
  }

  if (method === "POST" && pathname === "/api/guests") {
    const body = await readJsonBody(request);
    if (!body.name || !body.email) {
      sendJson(response, 400, { error: "Guest name and email are required." });
      return;
    }
    const guest = {
      name: body.name,
      email: body.email,
      meeting: body.meeting || "General access",
      status: body.status || "Invited",
    };
    db.guests.unshift(guest);
    await writeDb(db);
    sendJson(response, 201, guest);
    return;
  }

  if (method === "GET" && pathname === "/api/candidates") {
    db.candidates = db.candidates || [];
    sendJson(response, 200, db.candidates);
    return;
  }

  if (method === "POST" && pathname === "/api/candidates") {
    const body = await readJsonBody(request);
    const phone = normalizePhone(body.phone);
    if (!body.name || !body.email || !phone) {
      sendJson(response, 400, { error: "Candidate name, email, and phone are required." });
      return;
    }
    const candidate = {
      name: String(body.name || "").trim(),
      email: String(body.email || "").trim().toLowerCase(),
      phone,
      program: body.program || "Internship",
      status: body.status || "Shortlisted",
      createdAt: new Date().toISOString(),
    };
    db.candidates = db.candidates || [];
    db.candidates.unshift(candidate);
    await writeDb(db);
    sendJson(response, 201, candidate);
    return;
  }

  if (method === "GET" && pathname === "/api/whatsapp-campaigns") {
    db.whatsappCampaigns = db.whatsappCampaigns || [];
    sendJson(response, 200, db.whatsappCampaigns);
    return;
  }

  if (method === "POST" && pathname === "/api/whatsapp-campaigns") {
    const body = await readJsonBody(request);
    const recipients = normalizeWhatsappRecipients(body.recipients);
    if (!recipients.length) {
      sendJson(response, 400, { error: "At least one candidate recipient is required." });
      return;
    }
    if (!body.message) {
      sendJson(response, 400, { error: "Message is required." });
      return;
    }
    const campaign = {
      id: `WA-${Date.now()}`,
      message: String(body.message || "").trim(),
      recipients,
      sendMode: body.sendMode === "Scheduled" ? "Scheduled" : "Immediate",
      scheduledAt: body.sendMode === "Scheduled" ? String(body.scheduledAt || "") : "",
      status: body.sendMode === "Scheduled" ? "Scheduled locally" : "Saved locally",
      createdAt: body.createdAt || new Date().toLocaleString(),
    };
    db.whatsappCampaigns = db.whatsappCampaigns || [];
    db.whatsappCampaigns.unshift(campaign);
    await writeDb(db);
    sendJson(response, 201, campaign);
    return;
  }

  if (method === "GET" && pathname === "/api/attendance") {
    sendJson(response, 200, db.attendance);
    return;
  }

  if (method === "POST" && pathname === "/api/attendance") {
    const body = await readJsonBody(request);
    db.attendance.unshift(body);
    await writeDb(db);
    sendJson(response, 201, body);
    return;
  }

  if (method === "DELETE" && pathname === "/api/attendance") {
    db.attendance = [];
    await writeDb(db);
    sendJson(response, 200, { ok: true, cleared: "attendance" });
    return;
  }

  if (method === "DELETE" && pathname === "/api/meetings") {
    db.meetings = [];
    await writeDb(db);
    sendJson(response, 200, { ok: true, cleared: "meetings" });
    return;
  }

  if (method === "DELETE" && pathname === "/api/whatsapp-campaigns") {
    db.whatsappCampaigns = [];
    await writeDb(db);
    sendJson(response, 200, { ok: true, cleared: "whatsappCampaigns" });
    return;
  }

  if (method === "GET" && pathname === "/api/transcripts") {
    sendJson(response, 200, db.transcripts);
    return;
  }

  if (method === "POST" && pathname === "/api/transcripts") {
    const body = await readJsonBody(request);
    const line = {
      time: body.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      speaker: body.speaker || "Unknown",
      section: body.section || "Admin",
      text: body.text || "",
    };
    db.transcripts.unshift(line);
    await writeDb(db);
    sendJson(response, 201, line);
    return;
  }

  if (method === "GET" && pathname === "/api/settings") {
    sendJson(response, 200, db.settings);
    return;
  }

  if (method === "PUT" && pathname === "/api/settings") {
    const body = await readJsonBody(request);
    db.settings = { ...db.settings, ...body };
    await writeDb(db);
    sendJson(response, 200, db.settings);
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}

function serveStatic(requestedUrl, response) {
  const requestedPath = requestedUrl.pathname === "/" ? "/index.html" : requestedUrl.pathname;
  const safePath = path
    .normalize(decodeURIComponent(requestedPath))
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");
  const filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  });
}

function ensureDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(seedDb, null, 2));
  }
}

async function readDb() {
  if (shouldUseMongo()) {
    return readMongoDb();
  }
  return readJsonDb();
}

async function writeDb(db) {
  if (shouldUseMongo()) {
    await writeMongoDb(db);
    return;
  }
  writeJsonDb(db);
}

function readJsonDb() {
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeJsonDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function shouldUseMongo() {
  return Boolean(mongoUri && MongoClient);
}

function storageMode() {
  if (mongoUri && !MongoClient) {
    return "mongodb-driver-missing";
  }
  return shouldUseMongo() ? "mongodb" : "local-json";
}

async function getMongoDb() {
  if (mongoDb) {
    return mongoDb;
  }
  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  mongoDb = mongoClient.db(mongoDbName);
  await seedMongoIfEmpty(mongoDb);
  return mongoDb;
}

async function readMongoDb() {
  const database = await getMongoDb();
  const db = { settings: await readMongoSettings(database) };
  for (const name of collectionNames) {
    db[name] = await database.collection(name).find({}, { projection: { _id: 0 } }).toArray();
  }
  return db;
}

async function writeMongoDb(db) {
  const database = await getMongoDb();
  await database.collection("settings").deleteMany({});
  await database.collection("settings").insertOne({ ...(db.settings || seedDb.settings), key: "singleton" });
  for (const name of collectionNames) {
    const collection = database.collection(name);
    await collection.deleteMany({});
    if (Array.isArray(db[name]) && db[name].length) {
      await collection.insertMany(db[name]);
    }
  }
}

async function readMongoSettings(database) {
  const settings = await database.collection("settings").findOne({ key: "singleton" }, { projection: { _id: 0, key: 0 } });
  return settings || seedDb.settings;
}

async function seedMongoIfEmpty(database) {
  const existing = await database.collection("settings").findOne({ key: "singleton" });
  if (existing) {
    return;
  }
  await database.collection("settings").insertOne({ ...seedDb.settings, key: "singleton" });
  for (const name of collectionNames) {
    if (Array.isArray(seedDb[name]) && seedDb[name].length) {
      await database.collection(name).insertMany(seedDb[name]);
    }
  }
}

function findMeeting(db, codeOrId) {
  const normalized = normalizeMeetingCode(codeOrId);
  return db.meetings.find(meeting => {
    return String(meeting.code || "").toUpperCase() === normalized || String(meeting.id || "").toUpperCase() === normalized;
  });
}

function createMeetingCode(db) {
  let code = "";
  do {
    code = `SKM-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  } while (findMeeting(db, code));
  return code;
}

function joinMeeting(db, meeting, body) {
  const joined = new Date();
  const attendance = {
    id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    name: body.name || "Meeting user",
    email: body.email || "",
    role: body.role || "Candidate",
    meeting: meeting.title,
    meetingId: meeting.id,
    meetingCode: meeting.code,
    joinedAt: joined.toISOString(),
    leftAt: "",
    joined: joined.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    left: "In meeting",
    duration: "Live",
    attendedSeconds: 0,
    meetingElapsedSeconds: getMeetingElapsedSeconds(meeting, joined),
    percent: 0,
  };
  meeting.participants = Number(meeting.participants || 0) + 1;
  meeting.status = "Live";
  db.attendance.unshift(attendance);
  return { meeting, attendance };
}

function getMeetingAccessError(db, meeting, body) {
  const accessMode = normalizeAccessMode(meeting.accessMode);
  const role = String(body.role || "").toLowerCase();
  const email = String(body.email || "").trim().toLowerCase();
  const allowedEmails = normalizeEmailList(meeting.allowedEmails);

  if (accessMode === "candidates" && role !== "candidate") {
    return "You are not allowed to join this meeting. This meeting is for candidates only.";
  }

  if (accessMode === "guests" && role !== "guest") {
    return "You are not allowed to join this meeting. This meeting is for guests only.";
  }

  if (role === "guest") {
    const guest = (db.guests || []).find(item => String(item.email || "").trim().toLowerCase() === email);
    if (!guest) {
      return "Guest access not found. Ask Admin to add this guest first.";
    }
    if (!guestCanJoinMeeting(guest, meeting)) {
      return "This guest is not assigned to this meeting. Please contact the admin.";
    }
  }

  if (accessMode === "invited" && (!email || !allowedEmails.includes(email))) {
    return "You are not invited to this meeting. Please contact the admin.";
  }

  return "";
}

function guestCanJoinMeeting(guest, meeting) {
  const assigned = String(guest.meeting || "").trim().toLowerCase();
  if (!assigned || assigned === "general access") {
    return true;
  }
  const code = String(meeting.code || "").trim().toLowerCase();
  const title = String(meeting.title || "").trim().toLowerCase();
  const id = String(meeting.id || "").trim().toLowerCase();
  return assigned === code || assigned === title || assigned === id;
}

function normalizeAccessMode(mode) {
  const value = String(mode || "all").toLowerCase();
  return ["all", "candidates", "guests", "invited"].includes(value) ? value : "all";
}

function normalizeEmailList(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[\n,]+/);
  return source
    .map(email => String(email || "").trim().toLowerCase())
    .filter(Boolean);
}

function normalizeWhatsappRecipients(value) {
  const source = Array.isArray(value) ? value : [];
  const byPhone = new Map();
  source.forEach(person => {
    const name = String(person.name || "").trim();
    const phone = normalizePhone(person.phone);
    if (name && phone) {
      byPhone.set(phone, { name, phone });
    }
  });
  return Array.from(byPhone.values());
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  return digits.startsWith("91") ? digits : `91${digits}`;
}

function normalizeMeetingCode(code) {
  let value = "";
  try {
    value = decodeURIComponent(String(code || "").trim());
  } catch (error) {
    value = String(code || "").trim();
  }
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    value = url.searchParams.get("meet") || value;
  } catch (error) {
    const match = value.toUpperCase().match(/SKM-[A-Z0-9-]+/);
    if (match) {
      value = match[0];
    }
  }

  value = value.toUpperCase();
  const clean = value.replace(/[^A-Z0-9-]/g, "");
  const withPrefix = clean.startsWith("SKM-") ? clean : `SKM-${clean}`;
  return withPrefix.slice(0, 24);
}

function findOpenAttendance(db, meeting, body) {
  if (body.attendanceId) {
    const byId = db.attendance.find(row => row.id === body.attendanceId);
    if (byId) {
      return byId;
    }
  }

  const email = String(body.email || "").toLowerCase();
  return db.attendance.find(row => {
    return row.meetingCode === meeting.code && String(row.email || "").toLowerCase() === email && row.left === "In meeting";
  });
}

function formatDuration(start, end) {
  const totalSeconds = diffSeconds(start, end);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function diffSeconds(start, end) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
}

function getMeetingElapsedSeconds(meeting, now) {
  const startDate = parseMeetingStart(meeting);
  return Math.max(1, diffSeconds(startDate, now));
}

function parseMeetingStart(meeting) {
  const candidates = [meeting.createdAt, meeting.start].filter(Boolean);
  for (const candidate of candidates) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function calculateAttendancePercent(attendedSeconds, meetingElapsedSeconds) {
  if (!meetingElapsedSeconds) {
    return 0;
  }
  return Math.min(100, Math.round((attendedSeconds / meetingElapsedSeconds) * 100));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      return;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}
