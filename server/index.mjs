// arnian-leads — tiny Cloud Run service behind the quote form.
//
//   POST /lead            form → email the lead; schedule (or cancel) the follow-up call
//   POST /tasks/call      Cloud Tasks → place the Retell call for one attempt
//   POST /retell/webhook  Retell → after the call: email the full report, or retry
//
// No dependencies: Node 22 built-ins only, so cold starts stay fast.

import http from "node:http";
import crypto from "node:crypto";

// Secrets created from a Windows shell can carry a trailing "\r"; HTTP header values never do.
const env = Object.fromEntries(Object.entries(process.env).map(([k, v]) => [k, v?.trim()]));
const CFG = {
  port: Number(env.PORT || 8080),
  project: env.GCP_PROJECT || "arnian-infra",
  region: env.TASKS_REGION || "us-central1",
  queue: env.TASKS_QUEUE || "lead-calls",
  selfUrl: (env.SELF_URL || "").replace(/\/$/, ""),
  taskToken: env.TASK_TOKEN || "",
  origins: (env.ALLOWED_ORIGINS || "https://arnianmoving.com,https://www.arnianmoving.com").split(","),
  retellKey: env.RETELL_API_KEY || "",
  retellAgent: env.RETELL_AGENT_ID || "",
  retellFrom: env.RETELL_FROM_NUMBER || "",
  // Retell-bought numbers can only dial the U.S.; add "52" once a Twilio number is imported.
  callCountries: (env.CALL_COUNTRIES || "1").split(","),
  firstCallMin: Number(env.FIRST_CALL_MIN || 10),
  maxAttempts: Number(env.MAX_ATTEMPTS || 3),
  emailjs: {
    service_id: env.EMAILJS_SERVICE || "",
    template_id: env.EMAILJS_TEMPLATE || "",
    user_id: env.EMAILJS_PUBLIC_KEY || "",
    accessToken: env.EMAILJS_PRIVATE_KEY || "",
  },
  companyPhone: env.COMPANY_PHONE || "+52 (664) 388 6256",
};

// ---------- logging ----------

function log(severity, message, extra = {}) {
  console.log(JSON.stringify({ severity, message, ...extra }));
}

// ---------- phone numbers & call hours ----------

const MX_AREA_CODES = ["664", "661", "646", "665", "686", "624", "612", "613", "615", "653"];
const BCS_AREA_CODES = ["612", "613", "615", "624"];
// U.S. West: the only +1 numbers we call into the evening; everyone else gets a narrower window.
const US_WEST_AREA_CODES = new Set(
  ("209 213 279 310 323 341 350 369 408 415 424 442 510 530 559 562 619 626 628 650 657 661 669 707 714 747 760 " +
    "805 818 820 831 840 858 909 916 925 949 951 206 253 360 425 509 564 458 503 541 971 702 725 775 480 520 602 623 928")
    .split(" "),
);

// Same inference as the form's WhatsApp link: trust an explicit country code, otherwise guess from the area code.
export function toE164(raw) {
  const v = String(raw || "").trim();
  let digits = v.replace(/\D/g, "");
  if (!digits) return "";
  if (v.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return `+${digits}`;
  if (digits.length === 10) return `+${MX_AREA_CODES.includes(digits.slice(0, 3)) ? "52" : "1"}${digits}`;
  return `+${digits}`;
}

function callWindow(e164) {
  if (e164.startsWith("+52")) {
    const area = e164.slice(3, 6);
    return { tz: BCS_AREA_CODES.includes(area) ? "America/Mazatlan" : "America/Tijuana", from: 9, to: 20 };
  }
  if (US_WEST_AREA_CODES.has(e164.slice(2, 5))) return { tz: "America/Los_Angeles", from: 9, to: 20 };
  // Unknown U.S. time zone: 10am–5pm Pacific is still a decent hour coast to coast.
  return { tz: "America/Los_Angeles", from: 10, to: 17 };
}

function localParts(date, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23", weekday: "short" })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return { hour: Number(p.hour), weekday: p.weekday };
}

// First moment at or after `date` that falls inside the customer's call hours (no Sundays).
export function nextCallTime(date, e164) {
  const w = callWindow(e164);
  const t = new Date(date);
  for (let i = 0; i < 4 * 24 * 4; i++) {
    const { hour, weekday } = localParts(t, w.tz);
    if (weekday !== "Sun" && hour >= w.from && hour < w.to) return t;
    t.setMinutes(t.getMinutes() + 15, 0, 0);
  }
  return t;
}

const RETRY_DELAY_MIN = { 2: 120, 3: 20 * 60 };

// ---------- Google Cloud Tasks (REST + metadata-server token) ----------

let gToken = { value: "", exp: 0 };
async function googleToken() {
  if (gToken.exp > Date.now() + 60_000) return gToken.value;
  const res = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } },
  );
  if (!res.ok) throw new Error(`metadata token ${res.status}`);
  const j = await res.json();
  gToken = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return gToken.value;
}

const queuePath = () => `projects/${CFG.project}/locations/${CFG.region}/queues/${CFG.queue}`;
const taskId = (leadId, attempt) => `${leadId}-a${attempt}`;

async function scheduleCall(leadId, attempt, lead, at) {
  const body = Buffer.from(JSON.stringify({ leadId, attempt, lead })).toString("base64");
  const res = await fetch(`https://cloudtasks.googleapis.com/v2/${queuePath()}/tasks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await googleToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      task: {
        name: `${queuePath()}/tasks/${taskId(leadId, attempt)}`,
        scheduleTime: at.toISOString(),
        httpRequest: {
          httpMethod: "POST",
          url: `${CFG.selfUrl}/tasks/call`,
          headers: { "Content-Type": "application/json", "X-Task-Token": CFG.taskToken },
          body,
        },
      },
    }),
  });
  // 409: this attempt is already scheduled (form resubmitted, webhook retried) — nothing to do.
  if (!res.ok && res.status !== 409) throw new Error(`create task ${res.status}: ${await res.text()}`);
  log("INFO", "call scheduled", { leadId, attempt, at: at.toISOString() });
}

async function cancelCalls(leadId) {
  const token = await googleToken();
  await Promise.all(
    Array.from({ length: CFG.maxAttempts }, (_, i) =>
      fetch(`https://cloudtasks.googleapis.com/v2/${queuePath()}/tasks/${taskId(leadId, i + 1)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
    ),
  );
  log("INFO", "calls cancelled", { leadId });
}

// ---------- EmailJS (REST, server-side) ----------

async function sendEmail(params) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...CFG.emailjs, template_params: params }),
  });
  if (!res.ok) throw new Error(`emailjs ${res.status}: ${await res.text()}`);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function linkOrFallback(url, label, fallback = "No proporcionado") {
  if (!url || !/^(https?:|mailto:)/i.test(url)) {
    return `<span style="color:#9ca3af;">${url ? escapeHtml(label) : fallback}</span>`;
  }
  return `<a href="${escapeHtml(url)}" style="color:#4779db;text-decoration:none;">${escapeHtml(label)}</a>`;
}

const fmtNow = () =>
  new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Tijuana" });

// ---------- Retell ----------

async function createRetellCall(leadId, attempt, lead) {
  const first = String(lead.name || "").trim().split(/\s+/)[0] || "there";
  const res = await fetch("https://api.retellai.com/v2/create-phone-call", {
    method: "POST",
    headers: { Authorization: `Bearer ${CFG.retellKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from_number: CFG.retellFrom,
      to_number: lead.e164,
      override_agent_id: CFG.retellAgent,
      override_agent_version: "latest_published",
      idempotency_key: taskId(leadId, attempt),
      honor_internal_dnc: true,
      metadata: { leadId, attempt, lead },
      retell_llm_dynamic_variables: {
        first_name: first,
        name: String(lead.name || ""),
        from: String(lead.from || ""),
        to: String(lead.to || ""),
        move_date: String(lead.date || ""),
        email: String(lead.email || "none"),
      },
    }),
  });
  if (!res.ok) throw new Error(`retell create call ${res.status}: ${await res.text()}`);
  const j = await res.json();
  log("INFO", "call placed", { leadId, attempt, callId: j.call_id });
}

export function verifyRetell(rawBody, header) {
  const match = /v=(\d+),d=([0-9a-f]+)/.exec(header ?? "");
  if (!match || !CFG.retellKey) return false;
  const [, ts, digest] = match;
  if (Math.abs(Date.now() - Number(ts)) > 5 * 60 * 1000) return false;
  const expected = crypto.createHmac("sha256", CFG.retellKey).update(rawBody + ts).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(digest, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const NOT_REACHED = new Set(["dial_no_answer", "dial_busy", "dial_failed", "voicemail_reached", "ivr_reached"]);

function reachedSomeone(call) {
  if (NOT_REACHED.has(call.disconnection_reason) || call.call_analysis?.in_voicemail) return false;
  return (call.transcript_object || []).some((u) => u.role === "user");
}

const val = (x) => (x === undefined || x === null || x === "" ? "No indicado" : String(x));

async function emailCallReport(call) {
  const { leadId, attempt, lead } = call.metadata;
  const a = call.call_analysis || {};
  const c = a.custom_analysis_data || {};
  const mins = Math.round((call.duration_ms || 0) / 6000) / 10;
  const flag = c.did_not_request_quote ? "⚠️ DICE QUE NO PIDIÓ COTIZACIÓN — " : "";

  const lines = [
    `${flag}LLAMADA IA COMPLETADA (intento ${attempt}, ${mins} min)`,
    "",
    `Contacto: ${lead.name} | ${lead.phone} | ${c.email || lead.email || "sin email"}`,
    `Ruta: ${lead.from} → ${lead.to}`,
    `Fecha: ${val(c.move_date || lead.date)}`,
    "",
    `RESUMEN: ${val(a.call_summary)}`,
    `Sentimiento: ${val(a.user_sentiment)}`,
    "",
    `Origen: ${val(c.origin_address)} — ${val(c.origin_access)}`,
    `Destino: ${val(c.dest_address)} — ${val(c.dest_access)}`,
    `Artículos: ${val(c.items)}`,
    `Cajas: ${val(c.boxes)}`,
    `Artículos especiales: ${val(c.special_items)}`,
    `Vehículos: ${val(c.vehicles)}`,
    `Valor aprox.: ${val(c.value_usd)}`,
    `Empaque: ${val(c.packing)}`,
    `Servicio: ${val(c.service)}`,
    `Almacenaje: ${val(c.storage)}`,
    `Estatus migratorio: ${val(c.residency_status)}`,
    `Idioma preferido: ${val(c.language)}`,
    `Mejor horario para llamar: ${val(c.best_time_to_call)}`,
    `Notas extra: ${val(c.extra_notes)}`,
    "",
    "TRANSCRIPCIÓN:",
    call.transcript || "(vacía)",
    "",
    call.recording_url ? `Grabación: ${call.recording_url}` : "",
  ];

  await sendEmail({
    name: lead.name,
    from_name: lead.name,
    reply_to: c.email || lead.email || lead.phone,
    email: c.email || lead.email || "No proporcionado",
    phone: lead.phone,
    message: lines.join("\n"),
    destination: lead.to,
    move_date: val(c.move_date || lead.date),
    current_location: lead.from,
    move_type: val(c.service),
    contact_preferences: "Llamada IA (Retell)",
    fecha_envio: fmtNow(),
    subject: `${flag}Llamada IA — ${lead.name} (${lead.from} → ${lead.to})`,
    year: new Date().getFullYear(),
    origin_address: val(c.origin_address),
    origin_floor_access: val(c.origin_access),
    dest_city: lead.to,
    dest_address: val(c.dest_address),
    dest_floor_access: val(c.dest_access),
    items: [c.items, c.special_items, c.vehicles].filter(Boolean).join(" · ") || "No indicado",
    boxes: val(c.boxes),
    value: val(c.value_usd),
    packing: val(c.packing),
    service: val(c.service),
    whatsapp_link: `https://wa.me/${lead.e164.replace(/\D/g, "")}`,
    email_link: linkOrFallback(c.email || lead.email ? `mailto:${c.email || lead.email}` : "", c.email || lead.email),
    origin_maps_html: linkOrFallback("", ""),
    dest_maps_html: linkOrFallback("", ""),
    photos_html: call.recording_url ? linkOrFallback(call.recording_url, "Escuchar grabación") : linkOrFallback("", ""),
  });
  log("INFO", "call report emailed", { leadId, callId: call.call_id });
}

async function emailNoAnswer(lead, attempts) {
  await sendEmail({
    name: lead.name,
    from_name: lead.name,
    reply_to: lead.email || lead.phone,
    email: lead.email || "No proporcionado",
    phone: lead.phone,
    message: `SIN RESPUESTA — la llamada IA no logró hablar con el cliente después de ${attempts} intentos.\nLlamarle o escribirle por WhatsApp.\n\nRuta: ${lead.from} → ${lead.to}\nFecha: ${lead.date}`,
    destination: lead.to,
    move_date: lead.date,
    current_location: lead.from,
    move_type: "Sin respuesta",
    contact_preferences: "Teléfono/WhatsApp",
    fecha_envio: fmtNow(),
    subject: `Sin respuesta a la llamada — ${lead.name} (${lead.from} → ${lead.to})`,
    year: new Date().getFullYear(),
    whatsapp_link: `https://wa.me/${lead.e164.replace(/\D/g, "")}`,
    email_link: linkOrFallback(lead.email ? `mailto:${lead.email}` : "", lead.email),
    origin_maps_html: linkOrFallback("", ""),
    dest_maps_html: linkOrFallback("", ""),
    photos_html: linkOrFallback("", ""),
  });
}

// ---------- abuse limits (per instance; good enough for a single small service) ----------

const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

// ---------- handlers ----------

const LEAD_ID = /^[A-Za-z0-9_-]{8,64}$/;
const clip = (s, n = 300) => String(s ?? "").slice(0, n);

async function handleLead(req, body) {
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (limited(`ip:${ip}`, 12, 60 * 60 * 1000)) return [429, { error: "rate_limited" }];

  const j = JSON.parse(body);
  // Honeypot: bots fill every field. Pretend it worked.
  if (j.website) return [200, { ok: true }];
  if (!LEAD_ID.test(j.leadId || "") || !["lead", "details"].includes(j.stage)) return [400, { error: "bad_request" }];

  const lead = {
    name: clip(j.lead?.name, 120),
    phone: clip(j.lead?.phone, 40),
    email: clip(j.lead?.email, 160),
    from: clip(j.lead?.from, 160),
    to: clip(j.lead?.to, 160),
    date: clip(j.lead?.date, 60),
  };
  lead.e164 = toE164(lead.phone);
  if (!lead.name || lead.e164.replace(/\D/g, "").length < 8) return [400, { error: "bad_request" }];

  // The email is what matters most; if it fails the browser falls back to sending it itself.
  await sendEmail(j.emailParams || {});

  try {
    if (j.stage === "details") {
      await cancelCalls(j.leadId);
    } else if (!CFG.callCountries.some((cc) => lead.e164.startsWith(`+${cc}`))) {
      log("INFO", "country not callable", { leadId: j.leadId, cc: lead.e164.slice(0, 3) });
    } else if (limited(`phone:${lead.e164}`, 1, 24 * 60 * 60 * 1000)) {
      log("WARNING", "phone already scheduled today", { leadId: j.leadId });
    } else {
      const at = nextCallTime(Date.now() + CFG.firstCallMin * 60 * 1000, lead.e164);
      await scheduleCall(j.leadId, 1, lead, at);
    }
  } catch (e) {
    // The lead already reached the inbox, so the form still reports success.
    log("ERROR", "call scheduling failed", { leadId: j.leadId, error: String(e) });
  }
  return [200, { ok: true }];
}

async function handleTask(req, body) {
  const got = req.headers["x-task-token"];
  if (!CFG.taskToken || got !== CFG.taskToken) {
    log("WARNING", "task token mismatch", { gotLen: got?.length ?? null, wantLen: CFG.taskToken.length });
    return [403, { error: "forbidden" }];
  }
  const { leadId, attempt, lead } = JSON.parse(body);
  await createRetellCall(leadId, attempt, lead); // throws → 500 → Cloud Tasks retries
  return [200, { ok: true }];
}

async function handleRetell(req, body) {
  if (!verifyRetell(body, req.headers["x-retell-signature"])) return [401, { error: "unauthorized" }];
  const { event, call } = JSON.parse(body);
  if (event !== "call_analyzed" || !call?.metadata?.leadId) return [204, null];

  const { leadId, attempt, lead } = call.metadata;
  if (reachedSomeone(call)) {
    await emailCallReport(call);
  } else if (attempt < CFG.maxAttempts) {
    const at = nextCallTime(Date.now() + RETRY_DELAY_MIN[attempt + 1] * 60 * 1000, lead.e164);
    await scheduleCall(leadId, attempt + 1, lead, at);
  } else {
    await emailNoAnswer(lead, attempt);
    log("INFO", "gave up calling", { leadId });
  }
  return [204, null];
}

const ROUTES = { "/lead": handleLead, "/tasks/call": handleTask, "/retell/webhook": handleRetell };

http
  .createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && CFG.origins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "POST");
    }
    if (req.method === "OPTIONS") return res.writeHead(204).end();
    if (req.method === "GET" && req.url === "/health") return res.writeHead(200).end("ok");

    const handler = ROUTES[req.url];
    if (req.method !== "POST" || !handler) return res.writeHead(404).end();
    // Browsers from other sites may not post leads (server-to-server calls carry no Origin).
    if (req.url === "/lead" && !CFG.origins.includes(origin)) return res.writeHead(403).end();

    // Retell's call_analyzed payload carries the full word-timed transcript: a 5-minute call is well over 64 KB.
    const maxBody = req.url === "/retell/webhook" ? 5 * 1024 * 1024 : 64 * 1024;
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > maxBody) {
        log("WARNING", "body too large", { path: req.url, bytes: body.length });
        return res.writeHead(413).end();
      }
    }
    try {
      const [status, payload] = await handler(req, body);
      res.writeHead(status, payload ? { "Content-Type": "application/json" } : {});
      res.end(payload ? JSON.stringify(payload) : undefined);
    } catch (e) {
      log("ERROR", "request failed", { path: req.url, error: String(e) });
      res.writeHead(500).end();
    }
  })
  .listen(CFG.port, () => log("INFO", `listening on ${CFG.port}`));
