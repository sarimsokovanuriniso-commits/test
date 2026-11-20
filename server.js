"use strict";
// Raqamli qaramlik va ta’lim — interaktiv psixologik test. Tashqi kutubxonalarsiz (faqat Node 22+).
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");
const { DatabaseSync } = require("node:sqlite");
const T = require("./public/questions.js");

const PORT = Number(process.env.PORT) || 3000;
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "ustoz123";
const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "app.db");
const SECRET = process.env.SESSION_SECRET || crypto.createHash("sha256").update("qr-test|" + TEACHER_PASSWORD).digest("hex");
const GRACE_MS = 15 * 60 * 1000; // sessiya yopilgach, boshlagan talabalar tugatishi uchun muhlat
const PUB = path.join(__dirname, "public");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, title TEXT,
  status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL, closed_at INTEGER);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL, name TEXT NOT NULL, token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'joined', answers TEXT NOT NULL DEFAULT '{}', score REAL, dims TEXT,
  joined_at INTEGER NOT NULL, started_at INTEGER, finished_at INTEGER, updated_at INTEGER NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id));
CREATE INDEX IF NOT EXISTS idx_students_session ON students(session_id);
`);

// ---------- yordamchilar ----------
const now = () => Date.now();
const json = (res, code, obj, headers) => {
  res.writeHead(code, Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, headers || {}));
  res.end(JSON.stringify(obj));
};
const readBody = (req) => new Promise((resolve, reject) => {
  let d = ""; req.on("data", (c) => { d += c; if (d.length > 64 * 1024) { reject(new Error("big")); req.destroy(); } });
  req.on("end", () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
  req.on("error", reject);
});
const newCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    let c = ""; for (let i = 0; i < 6; i++) c += alphabet[crypto.randomInt(alphabet.length)];
    if (!db.prepare("SELECT 1 FROM sessions WHERE code=?").get(c)) return c;
  }
};
const cleanName = (s) => String(s || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);

// ---------- ustoz autentifikatsiyasi ----------
const sign = (s) => crypto.createHmac("sha256", SECRET).update(s).digest("hex");
const makeToken = () => { const exp = now() + 12 * 3600 * 1000; return exp + "." + sign("t" + exp); };
const safeEq = (a, b) => { const A = Buffer.from(String(a)), B = Buffer.from(String(b)); return A.length === B.length && crypto.timingSafeEqual(A, B); };
const checkToken = (t) => { if (!t) return false; const [exp, sig] = t.split("."); return Number(exp) > now() && sig && safeEq(sig, sign("t" + exp)); };
const cookieOf = (req, name) => { const m = (req.headers.cookie || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : null; };
const isTeacher = (req) => checkToken(cookieOf(req, "ustoz"));
const attempts = new Map(); // ip -> {n, t}
const ipOf = (req) => (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString().split(",")[0].trim();

// ---------- real vaqt (SSE) ----------
const clients = new Set();
let timer = null;
const broadcast = () => {
  if (timer) return;
  timer = setTimeout(() => { timer = null; for (const c of clients) c.write("event: update\ndata: " + now() + "\n\n"); }, 120);
};
setInterval(() => { for (const c of clients) c.write(": ping\n\n"); }, 20000).unref();

// ---------- ma’lumot qatlami ----------
const activeSession = () => db.prepare("SELECT * FROM sessions WHERE status='active' ORDER BY id DESC LIMIT 1").get();
const sessionByCode = (code) => db.prepare("SELECT * FROM sessions WHERE code=?").get(String(code || "").toUpperCase());
const studentByToken = (t) => t ? db.prepare("SELECT * FROM students WHERE token=?").get(String(t)) : null;
const answersOf = (st) => { try { return JSON.parse(st.answers || "{}"); } catch { return {}; } };
const sanitizeAnswers = (obj) => {
  const out = {};
  if (obj && typeof obj === "object") for (const k of Object.keys(obj)) {
    const n = Number(k), v = Number(obj[k]);
    if (Number.isInteger(n) && n >= 1 && n <= 20 && [0, 1, 2].includes(v)) out[n] = v;
  }
  return out;
};
const canWrite = (sess, st) => {
  if (st.status === "finished") return false;
  if (sess.status === "active") return true;
  return st.status === "in_progress" && sess.closed_at && now() - sess.closed_at < GRACE_MS;
};

function studentView(st, sess) {
  const v = { name: st.name, status: st.status, answers: answersOf(st), sessionStatus: sess.status, code: sess.code };
  if (st.status === "finished") {
    const sc = st.score, cat = T.categoryOf(sc), dims = JSON.parse(st.dims);
    v.result = { score: sc, category: cat.name, categoryKey: cat.key, text: cat.text, tip: cat.tip,
      dims: T.DIMENSIONS.map((d) => ({ name: d.name, score: dims[d.key], max: 20, percent: dims[d.key] * 5 })) };
  }
  return v;
}

function teacherState(sessionId) {
  const sessions = db.prepare(`SELECT s.*, (SELECT COUNT(*) FROM students WHERE session_id=s.id) AS total,
    (SELECT COUNT(*) FROM students WHERE session_id=s.id AND status='finished') AS finished FROM sessions s ORDER BY s.id DESC`).all();
  const active = activeSession();
  const sess = sessionId ? sessions.find((s) => s.id === Number(sessionId)) : (active || sessions[0]);
  const base = { active: active ? { id: active.id, code: active.code } : null,
    sessions: sessions.map((s) => ({ id: s.id, code: s.code, status: s.status, created_at: s.created_at, total: s.total, finished: s.finished })) };
  if (!sess) return Object.assign(base, { session: null });
  const rows = db.prepare("SELECT * FROM students WHERE session_id=? ORDER BY joined_at, id").all(sess.id);
  const students = rows.map((r, i) => {
    const answered = Object.keys(answersOf(r)).length;
    const o = { n: i + 1, id: r.id, name: r.name, status: r.status, answered, joined_at: r.joined_at, finished_at: r.finished_at };
    if (r.status === "finished") {
      const cat = T.categoryOf(r.score), dims = JSON.parse(r.dims);
      o.score = r.score; o.category = cat.name; o.categoryKey = cat.key; o.dims = dims;
    }
    return o;
  });
  const fin = students.filter((s) => s.status === "finished");
  const scores = fin.map((s) => s.score);
  const stats = {
    avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    max: scores.length ? Math.max(...scores) : null,
    min: scores.length ? Math.min(...scores) : null,
    categories: T.CATEGORIES.map((c) => ({ key: c.key, name: c.name, count: fin.filter((s) => s.categoryKey === c.key).length })),
    dimensions: T.DIMENSIONS.map((d) => ({ key: d.key, name: d.name,
      avg: fin.length ? fin.reduce((a, s) => a + s.dims[d.key], 0) / fin.length : null }))
  };
  return Object.assign(base, {
    session: { id: sess.id, code: sess.code, status: sess.status, created_at: sess.created_at, closed_at: sess.closed_at },
    counts: { joined: students.length, started: students.filter((s) => s.status !== "joined").length,
      finished: fin.length, working: students.filter((s) => s.status === "in_progress").length },
    students, stats });
}

const csvCell = (v) => { const s = String(v == null ? "" : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const num = (n) => String(n).replace(".", ",");
function csvFor(sess) {
  const rows = db.prepare("SELECT * FROM students WHERE session_id=? ORDER BY joined_at, id").all(sess.id);
  const head = ["№", "Ism", "Holat", "Ball (100)", "Natija", ...T.DIMENSIONS.map((d) => d.name + " (20)"), ...T.QUESTIONS.map((q) => "S" + q.n), "Tugatgan vaqt"];
  const lines = ["sep=;", head.map(csvCell).join(";")];
  rows.forEach((r, i) => {
    const a = answersOf(r), fin = r.status === "finished", dims = fin ? JSON.parse(r.dims) : null;
    lines.push([i + 1, r.name, fin ? "Yakunlagan" : r.status === "in_progress" ? "Jarayonda" : "Qo‘shilgan",
      fin ? num(r.score) : "", fin ? T.categoryOf(r.score).name : "",
      ...T.DIMENSIONS.map((d) => (fin ? num(dims[d.key]) : "")),
      ...T.QUESTIONS.map((q) => (a[q.n] == null ? "" : T.LETTERS[a[q.n]])),
      r.finished_at ? new Date(r.finished_at).toISOString() : ""].map(csvCell).join(";"));
  });
  return "﻿" + lines.join("\r\n") + "\r\n";
}

// ---------- API ----------
async function api(req, res, url) {
  const p = url.pathname, m = req.method;
  try {
    // --- ustoz ---
    if (p === "/api/teacher/login" && m === "POST") {
      const ip = ipOf(req), a = attempts.get(ip) || { n: 0, t: now() };
      if (now() - a.t > 10 * 60 * 1000) { a.n = 0; a.t = now(); }
      if (a.n >= 8) return json(res, 429, { error: "Juda ko‘p urinish. Bir necha daqiqadan so‘ng qayta urinib ko‘ring." });
      const b = await readBody(req);
      if (!safeEq(sign("p" + String(b.password || "")), sign("p" + TEACHER_PASSWORD))) { a.n++; attempts.set(ip, a); return json(res, 401, { error: "Parol noto‘g‘ri" }); }
      attempts.delete(ip);
      const secure = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
      return json(res, 200, { ok: true }, { "Set-Cookie": `ustoz=${makeToken()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secure}` });
    }
    if (p === "/api/teacher/logout" && m === "POST")
      return json(res, 200, { ok: true }, { "Set-Cookie": "ustoz=; HttpOnly; Path=/; Max-Age=0" });

    if (p.startsWith("/api/teacher/")) {
      if (!isTeacher(req)) return json(res, 401, { error: "Kirish talab qilinadi" });
      if (p === "/api/teacher/state" && m === "GET") {
        const st = teacherState(url.searchParams.get("session"));
        st.publicUrl = PUBLIC_URL; st.lan = lanAddresses();
        return json(res, 200, st);
      }
      if (p === "/api/teacher/stream" && m === "GET") {
        res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive", "X-Accel-Buffering": "no" });
        res.write("retry: 2000\n\n"); clients.add(res);
        req.on("close", () => clients.delete(res)); return;
      }
      if (p === "/api/teacher/session/start" && m === "POST") {
        const t = now();
        db.prepare("UPDATE sessions SET status='closed', closed_at=? WHERE status='active'").run(t);
        db.prepare("INSERT INTO sessions (code, status, created_at) VALUES (?, 'active', ?)").run(newCode(), t);
        broadcast(); return json(res, 200, { ok: true });
      }
      if (p === "/api/teacher/session/end" && m === "POST") {
        db.prepare("UPDATE sessions SET status='closed', closed_at=? WHERE status='active'").run(now());
        broadcast(); return json(res, 200, { ok: true });
      }
      if (p === "/api/teacher/export" && m === "GET") {
        const s = db.prepare("SELECT * FROM sessions WHERE id=?").get(Number(url.searchParams.get("session")));
        if (!s) return json(res, 404, { error: "Sessiya topilmadi" });
        const d = new Date(s.created_at).toISOString().slice(0, 16).replace(/[:T]/g, "-");
        res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="natijalar-${s.code}-${d}.csv"` });
        return res.end(csvFor(s));
      }
      return json(res, 404, { error: "Topilmadi" });
    }

    // --- talaba ---
    if (p === "/api/session" && m === "GET") {
      const s = sessionByCode(url.searchParams.get("code"));
      if (!s) return json(res, 404, { error: "Bunday test sessiyasi topilmadi" });
      return json(res, 200, { code: s.code, status: s.status });
    }
    if (p === "/api/join" && m === "POST") {
      const b = await readBody(req), s = sessionByCode(b.code);
      if (!s) return json(res, 404, { error: "Bunday test sessiyasi topilmadi" });
      const existing = studentByToken(b.token);
      if (existing && existing.session_id === s.id) return json(res, 200, { token: existing.token, student: studentView(existing, s) });
      if (s.status !== "active") return json(res, 403, { error: "Bu test sessiyasi yopilgan" });
      const name = cleanName(b.name);
      if (name.length < 2) return json(res, 400, { error: "Ismingizni kiriting (kamida 2 ta belgi)" });
      // bir xil ismli talabalar bo‘lsa, ro‘yxatda farqlash uchun (2), (3) qo‘shiladi
      const same = db.prepare("SELECT COUNT(*) c FROM students WHERE session_id=? AND (name=? OR name LIKE ? || ' (%)') COLLATE NOCASE").get(s.id, name, name).c;
      const finalName = same ? `${name} (${same + 1})` : name;
      const token = crypto.randomBytes(24).toString("hex"), t = now();
      db.prepare("INSERT INTO students (session_id, name, token, joined_at, updated_at) VALUES (?,?,?,?,?)").run(s.id, finalName, token, t, t);
      broadcast();
      return json(res, 200, { token, student: studentView(studentByToken(token), s) });
    }
    if (p === "/api/me" && m === "GET") {
      const st = studentByToken(url.searchParams.get("token"));
      if (!st) return json(res, 404, { error: "Topilmadi" });
      return json(res, 200, { student: studentView(st, db.prepare("SELECT * FROM sessions WHERE id=?").get(st.session_id)) });
    }
    if (["/api/start", "/api/answers", "/api/finish"].includes(p) && m === "POST") {
      const b = await readBody(req), st = studentByToken(b.token);
      if (!st) return json(res, 404, { error: "Talaba topilmadi" });
      const s = db.prepare("SELECT * FROM sessions WHERE id=?").get(st.session_id), t = now();
      if (p === "/api/start") {
        if (st.status === "joined") {
          if (s.status !== "active") return json(res, 403, { error: "Bu test sessiyasi yopilgan" });
          db.prepare("UPDATE students SET status='in_progress', started_at=?, updated_at=? WHERE id=?").run(t, t, st.id);
          broadcast();
        }
        return json(res, 200, { student: studentView(studentByToken(b.token), s) });
      }
      if (st.status === "finished") return json(res, 200, { student: studentView(st, s) }); // bir marta topshiriladi
      if (!canWrite(s, st)) return json(res, 403, { error: "Test sessiyasi yopilgan" });
      const merged = Object.assign(answersOf(st), sanitizeAnswers(b.answers));
      if (p === "/api/answers") {
        db.prepare("UPDATE students SET answers=?, status=CASE WHEN status='joined' THEN 'in_progress' ELSE status END, started_at=COALESCE(started_at, ?), updated_at=? WHERE id=?")
          .run(JSON.stringify(merged), t, t, st.id);
        broadcast(); return json(res, 200, { ok: true, saved: Object.keys(merged).length });
      }
      // finish
      const missing = T.QUESTIONS.filter((q) => merged[q.n] == null).map((q) => q.n);
      if (missing.length) return json(res, 400, { error: "Barcha savollarga javob bering", missing });
      const r = T.score(merged);
      db.prepare("UPDATE students SET answers=?, status='finished', score=?, dims=?, started_at=COALESCE(started_at, ?), finished_at=?, updated_at=? WHERE id=?")
        .run(JSON.stringify(merged), r.total, JSON.stringify(r.dims), t, t, t, st.id);
      broadcast();
      return json(res, 200, { student: studentView(studentByToken(b.token), s) });
    }
    return json(res, 404, { error: "Topilmadi" });
  } catch (e) {
    console.error(e);
    return json(res, 400, { error: "So‘rovda xatolik" });
  }
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || [])
    if (i.family === "IPv4" && !i.internal) out.push(i.address);
  return out;
}

// ---------- statik fayllar ----------
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
function serveFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Topilmadi"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (url.pathname === "/favicon.ico") { res.writeHead(204); return res.end(); }
  if (url.pathname === "/healthz") return json(res, 200, { ok: true });
  if (url.pathname.startsWith("/api/")) return api(req, res, url);
  if (url.pathname === "/") { res.writeHead(302, { Location: "/ustoz" }); return res.end(); }
  if (url.pathname === "/ustoz") return serveFile(res, path.join(PUB, "teacher.html"));
  if (/^\/s\/[A-Za-z0-9]{4,10}\/?$/.test(url.pathname)) return serveFile(res, path.join(PUB, "student.html"));
  if (url.pathname.startsWith("/static/")) {
    const f = path.normalize(path.join(PUB, url.pathname.slice(8)));
    if (!f.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
    return serveFile(res, f);
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Topilmadi");
});
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Ilova ishga tushdi: http://localhost:${PORT}/ustoz`);
  if (TEACHER_PASSWORD === "ustoz123") console.log("DIQQAT: standart parol ishlatilmoqda. TEACHER_PASSWORD muhit o‘zgaruvchisini o‘rnating!");
});
