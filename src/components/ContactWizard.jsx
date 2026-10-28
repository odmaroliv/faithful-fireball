import { useState, useEffect, useRef } from "react";
import { siteConfig } from "../config/site";

const EMAILJS_KEY = import.meta.env.PUBLIC_EMAILJS_KEY;
const SERVICE_ID = import.meta.env.PUBLIC_EMAILJS_SERVICE;
const TEMPLATE_ID = import.meta.env.PUBLIC_EMAILJS_TEMPLATE;
const IMGBB_KEY = import.meta.env.PUBLIC_IMGBB_KEY;
// Optional: the label of a Google Ads "Lead" conversion (the part after "AW-666721564/").
// When it is not set, only the generic generate_lead event is sent.
const ADS_ID = "AW-666721564";
const ADS_LEAD_LABEL = import.meta.env.PUBLIC_ADS_LEAD_LABEL;

const DIRECTIONS = [
  { label: "From the U.S. to Baja", value: "us-baja" },
  { label: "From Baja to the U.S.", value: "baja-us" },
  { label: "Somewhere else", value: "other" },
];
const BAJA_CITIES = [
  "Tijuana",
  "Rosarito",
  "Ensenada",
  "Tecate",
  "Mexicali",
  "San Felipe",
  "San Quintín",
  "Loreto",
  "La Paz",
  "Todos Santos",
  "Los Barriles",
  "San José del Cabo",
  "Cabo San Lucas",
  "Other",
];
const FLOORS = ["Ground floor", "2nd floor", "3rd floor+"];
const BOX_COUNT_OPTIONS = ["0", "1-5", "6-10", "11-20", "20+", "Not sure"];
const PACKING_OPTIONS = [
  {
    label: "Pack everything for me",
    desc: "You do not need to pack anything. We bring boxes and all materials.",
    value: "Full",
  },
  {
    label: "Only fragile or special items",
    desc: "We carefully pack delicate items like dishes, artwork, or electronics.",
    value: "Partial",
  },
  {
    label: "I will pack everything myself",
    desc: "Everything will be boxed and ready when we arrive.",
    value: "Self",
  },
];
const SERVICE_OPTIONS = [
  {
    label: "Standard delivery",
    desc: "We unload everything at the entrance or ground floor of your home.",
    value: "Standard",
  },
  {
    label: "White Glove — full service",
    desc: "We carry everything to each room, unpack boxes, assemble furniture, and take away all packing materials.",
    value: "White Glove",
  },
];
// Baja California (Norte & Sur) area codes we serve — used to guess +52 vs +1
// when the visitor's phone number was typed without a country code.
const MX_AREA_CODES = ["664", "661", "646", "665", "686", "624", "612", "613", "615", "653"];

function phoneToWhatsAppLink(raw) {
  if (!raw) return "";
  let v = raw.trim();

  // Already has a country code written as "+..." — trust it as-is.
  if (v.startsWith("+")) {
    return `https://wa.me/${v.slice(1).replace(/\D/g, "")}`;
  }

  let digits = v.replace(/\D/g, "");
  if (!digits) return "";

  // "00" international prefix (e.g. 0052...) -> treat like a "+"
  if (digits.startsWith("00")) {
    return `https://wa.me/${digits.slice(2)}`;
  }

  // Already includes the US/Canada country code (11 digits starting with 1).
  if (digits.length === 11 && digits.startsWith("1")) {
    return `https://wa.me/${digits}`;
  }

  // Already includes the Mexico country code (12 digits starting with 52).
  if (digits.length === 12 && digits.startsWith("52")) {
    return `https://wa.me/${digits}`;
  }

  // No country code present — infer it from the area code.
  if (digits.length === 10) {
    const areaCode = digits.slice(0, 3);
    const cc = MX_AREA_CODES.includes(areaCode) ? "52" : "1";
    return `https://wa.me/${cc}${digits}`;
  }

  // Anything else (unusual length): send as typed, best effort.
  return `https://wa.me/${digits}`;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

// Builds a ready-to-drop-in HTML snippet: a link when the value is present,
// or a muted "not provided" fallback — so the email template never needs conditionals.
// Only http(s)/mailto URLs are turned into real links; anything else (e.g. a
// "javascript:" link someone pasted into an address field) is shown as plain text.
function linkOrFallback(url, label, fallback = "No proporcionado") {
  if (!url || !/^(https?:|mailto:)/i.test(url)) {
    return `<span style="color:#9ca3af;">${url ? escapeHtml(label) : fallback}</span>`;
  }
  return `<a href="${escapeHtml(url)}" style="color:#4779db;text-decoration:none;">${escapeHtml(label)}</a>`;
}

// Analytics never gets in the way of the form: every call is optional and guarded.
function track(event, params = {}) {
  try {
    window.gtag?.("event", event, params);
  } catch {}
  try {
    if (event === "generate_lead") window.fbq?.("track", "Lead");
    else window.fbq?.("trackCustom", event, params);
  } catch {}
}

// Which side of the move is in Baja (picked from a list) and which is typed in.
function sideOf(direction, end) {
  if (direction === "us-baja") return end === "from" ? "text" : "baja";
  if (direction === "baja-us") return end === "from" ? "baja" : "text";
  return "text";
}

function placeOf(d, end) {
  const chip = d[`${end}Chip`];
  if (sideOf(d.direction, end) === "baja" && chip !== "Other") return chip;
  return d[`${end}Text`].trim();
}

// Step 1–2 capture the lead and send it right away; the rest are optional
// details that arrive as a second email, so nobody is lost halfway through.
const STEPS = ["route", "contact", "sent", "items", "home", "service"];
const LEAD_STEPS = 2;
const DETAIL_STEPS = STEPS.length - LEAD_STEPS - 1;

const EMPTY = {
  direction: "",
  fromChip: "",
  fromText: "",
  toChip: "",
  toText: "",
  moveDate: "",
  flexible: false,
  name: "",
  phone: "",
  email: "",
  items: "",
  boxesCount: "",
  value: "",
  originAddr: "",
  originFloor: "",
  destAddr: "",
  destFloor: "",
  accessNotes: "",
  packing: "",
  service: "",
};

const inputCls =
  "w-full rounded-lg border-2 border-brand-border bg-white px-4 py-3 text-base text-brand-gray placeholder:text-brand-gray/50 focus:border-brand-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/40 transition-colors";
const labelCls = "mb-2 block text-sm font-semibold text-brand-primary";
const hintCls =
  "mb-4 rounded-lg border border-brand-border bg-brand-bg px-4 py-2.5 text-sm leading-relaxed text-brand-gray/80";
const h2Cls = "mb-2 text-2xl font-bold leading-tight text-brand-primary focus:outline-none";
const subCls = "mb-6 text-base leading-relaxed text-brand-gray/80";
const colCls = "flex flex-col gap-5";
const optionalCls = "font-normal text-brand-gray/60";

function ChevronLeftIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function CameraIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

function XMarkIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SpinnerIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className || ""}`} aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function Opt({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/50 ${
        selected
          ? "border-brand-primary bg-brand-bg text-brand-primary"
          : "border-brand-border bg-white text-brand-gray hover:border-brand-secondary/50"
      }`}
    >
      {label}
    </button>
  );
}

function OptGroup({ id, label, children }) {
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className={labelCls}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function RadioCard({ label, desc, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/50 ${
        selected ? "border-brand-primary bg-brand-bg" : "border-brand-border bg-white hover:border-brand-secondary/50"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
          selected ? "border-brand-primary bg-brand-primary" : "border-brand-border bg-white"
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
      <span>
        <span className={`block font-semibold ${selected ? "text-brand-primary" : "text-brand-gray"}`}>
          {label}
        </span>
        {desc && <span className="mt-1 block text-sm leading-relaxed text-brand-gray/80">{desc}</span>}
      </span>
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-primary to-brand-secondary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-secondary/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <SpinnerIcon className="h-5 w-5" />}
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-brand-border bg-white px-6 py-3 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/50"
    >
      {children}
    </button>
  );
}

function BackBtn({ onBack }) {
  return (
    <SecondaryButton onClick={onBack}>
      <ChevronLeftIcon className="h-4 w-4" />
      Back
    </SecondaryButton>
  );
}

function StepProgress({ current, total, label }) {
  const progress = Math.round((current / total) * 100);
  return (
    <div className="mt-6 border-t border-brand-border/50 pt-4">
      <div className="mb-1.5 flex justify-between text-xs font-medium text-brand-gray/70">
        <span>
          {label} {current} of {total}
        </span>
        <span aria-hidden="true">{progress}%</span>
      </div>
      <div
        className="h-1.5 rounded-full bg-brand-border/40"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} ${current} of ${total}`}
      >
        <div
          className="h-full rounded-full bg-brand-secondary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function Errors({ list }) {
  if (!list.length) return null;
  return (
    <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
      {list.length === 1 ? (
        list[0]
      ) : (
        <>
          <p className="font-semibold">Almost there — please add:</p>
          <ul className="mt-1 list-disc pl-5">
            {list.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ContactFallback() {
  return (
    <p className="mt-2">
      You can also reach us directly:{" "}
      <a className="font-semibold underline" href={`tel:${siteConfig.contact.phoneLink}`}>
        call {siteConfig.contact.phone}
      </a>{" "}
      or{" "}
      <a
        className="font-semibold underline"
        href={`https://wa.me/${siteConfig.contact.whatsapp.replace(/\D/g, "")}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        message us on WhatsApp
      </a>
      .
    </p>
  );
}

function PlaceField({ end, d, set }) {
  const side = sideOf(d.direction, end);
  const label = end === "from" ? "Moving from" : "Moving to";
  const chipKey = `${end}Chip`;
  const textKey = `${end}Text`;
  const textId = `cw-${end}-text`;

  if (side === "baja") {
    return (
      <div className="flex flex-col gap-3">
        <OptGroup id={`cw-${end}-label`} label={`${label} *`}>
          {BAJA_CITIES.map((c) => (
            <Opt key={c} label={c} selected={d[chipKey] === c} onClick={() => set(chipKey, c)} />
          ))}
        </OptGroup>
        {d[chipKey] === "Other" && (
          <div>
            <label htmlFor={textId} className="sr-only">
              {label}: city or town
            </label>
            <input
              id={textId}
              className={inputCls}
              value={d[textKey]}
              onChange={(e) => set(textKey, e.target.value)}
              placeholder="City or town"
              autoComplete="off"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={textId} className={labelCls}>
        {label} *
      </label>
      <input
        id={textId}
        className={inputCls}
        value={d[textKey]}
        onChange={(e) => set(textKey, e.target.value)}
        placeholder={
          d.direction === "other" ? "City, state or country" : "City or ZIP code — e.g. San Diego, CA"
        }
        autoComplete="off"
      />
    </div>
  );
}

export default function ContactWizard() {
  const [step, setStep] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem("cw2_step") || "0");
      // Never reopen on the "sent" screen or later — those belong to a request already sent.
      return saved > 0 && saved < LEAD_STEPS ? saved : 0;
    } catch {
      return 0;
    }
  });
  const [d, setD] = useState(() => {
    try {
      const saved = localStorage.getItem("cw2_data");
      return saved ? { ...EMPTY, ...JSON.parse(saved) } : EMPTY;
    } catch {
      return EMPTY;
    }
  });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [showMissing, setShowMissing] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const headingRef = useRef(null);
  const firstRender = useRef(true);

  useEffect(() => {
    try {
      localStorage.setItem("cw2_step", String(step));
      localStorage.setItem("cw2_data", JSON.stringify(d));
    } catch {}
  }, [step, d]);

  // Move keyboard / screen-reader focus to the new question on every step change
  // (but not on page load, which would scroll the page to the form).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, done]);

  const s = STEPS[step];
  const set = (k, v) => {
    setShowMissing(false);
    setD((p) => ({ ...p, [k]: v }));
  };
  const setDirection = (v) => {
    setShowMissing(false);
    setD((p) => ({ ...p, direction: v, fromChip: "", fromText: "", toChip: "", toText: "" }));
  };
  const go = (to) => {
    setShowMissing(false);
    setErr("");
    setStep(to);
    track("quote_step", { step_name: STEPS[to] });
  };
  const back = () => go(Math.max(step - 1, 0));

  const missing = () => {
    const m = [];
    if (s === "route") {
      if (!d.direction) m.push("Which direction you are moving");
      else {
        if (!placeOf(d, "from")) m.push("Where you are moving from");
        if (!placeOf(d, "to")) m.push("Where you are moving to");
      }
      if (!d.moveDate && !d.flexible) m.push("An approximate date, or check “not sure yet”");
    }
    if (s === "contact") {
      if (!d.name.trim()) m.push("Your name");
      if (d.phone.replace(/\D/g, "").length < 7) m.push("A phone number we can call or text");
    }
    return m;
  };

  const tryNext = (action) => {
    if (missing().length) {
      setShowMissing(true);
      return;
    }
    action();
  };

  const compressImage = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 1200;
          let w = img.width,
            h = img.height;
          if (w > MAX) {
            h = Math.round((h * MAX) / w);
            w = MAX;
          } else if (h > MAX) {
            w = Math.round((w * MAX) / h);
            h = MAX;
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              const r2 = new FileReader();
              r2.onload = () => resolve(r2.result.split(",")[1]);
              r2.readAsDataURL(blob);
            },
            "image/jpeg",
            0.75,
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files).slice(0, 8);
    const previews = files.map((f) => ({
      name: f.name,
      preview: URL.createObjectURL(f),
      file: f,
    }));
    setUploadedPhotos((prev) => [...prev, ...previews].slice(0, 8));
  };

  const removePhoto = (i) =>
    setUploadedPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const uploadPhotosToImgBB = async () => {
    const results = [];
    for (const p of uploadedPhotos) {
      try {
        const b64 = await compressImage(p.file);
        const formData = new FormData();
        formData.append("key", IMGBB_KEY);
        formData.append("image", b64);
        formData.append("name", p.name);
        formData.append("privacy", "hidden");
        formData.append("expiration", "864000");
        const res = await fetch("https://api.imgbb.com/1/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) results.push(data.data.url);
      } catch {}
    }
    return results;
  };

  // stage "lead": just route + contact, sent as soon as we have a phone number.
  // stage "details": everything, sent only if the visitor chooses to add more.
  const send = async (stage) => {
    const isLead = stage === "lead";
    const from = placeOf(d, "from");
    const to = placeOf(d, "to");
    const date = d.flexible ? "Flexible / not sure yet" : d.moveDate;
    const pending = "Pendiente — confirmar por teléfono";

    let photoUrls = [];
    if (!isLead && uploadedPhotos.length > 0) {
      setUploadingPhotos(true);
      photoUrls = await uploadPhotosToImgBB();
      setUploadingPhotos(false);
    }
    const photoLinks =
      photoUrls.length > 0 ? "\n\nPHOTOS:\n" + photoUrls.map((u, i) => `Photo ${i + 1}: ${u}`).join("\n") : "";
    const origin = [d.originAddr || from, d.originFloor].filter(Boolean).join(" — ");
    const dest = [d.destAddr || to, d.destFloor].filter(Boolean).join(" — ");

    const body = isLead
      ? `NUEVO CONTACTO — llamar para cotizar\n\nContact: ${d.name} | ${d.phone} | ${d.email || "sin email"}\nDate: ${date}\nFrom: ${from}\nTo: ${to}\n\nEl cliente todavía no envía detalles de artículos o servicio.`
      : `DETALLES DE COTIZACIÓN\n\nContact: ${d.name} | ${d.phone} | ${d.email || "sin email"}\nDate: ${date}\n\nFrom: ${origin}\nTo: ${dest}\nAccess notes: ${d.accessNotes || "N/A"}\n\nItems: ${d.items || "N/A"}\nBoxes: ${d.boxesCount || "N/A"}\nValue: ${d.value || "N/A"}\n\nPacking: ${d.packing || "N/A"}\nService: ${d.service || "N/A"}${photoLinks}`;

    const photosHtml =
      photoUrls.length > 0
        ? photoUrls
            .map((u, i) => linkOrFallback(u, `Foto ${i + 1}`))
            .join(' <span style="color:#c9d8f0;">&bull;</span> ')
        : `<span style="color:#9ca3af;">${isLead ? pending : "Ninguna"}</span>`;

    await window.emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      // Plain fields: EmailJS HTML-escapes {{var}} on its own — don't double-escape here.
      name: d.name,
      from_name: d.name,
      reply_to: d.email || d.phone,
      email: d.email || "No proporcionado",
      phone: d.phone,
      message: body,
      destination: to,
      move_date: date,
      current_location: from,
      move_type: isLead ? pending : d.service || "No indicado",
      contact_preferences: "Teléfono/WhatsApp",
      fecha_envio: new Date().toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Tijuana",
      }),
      subject: isLead
        ? `Nuevo contacto — ${d.name} (${from} → ${to})`
        : `Detalles de cotización — ${d.name} (${from} → ${to})`,
      year: new Date().getFullYear(),

      origin_address: isLead ? from : d.originAddr || from,
      origin_floor_access: isLead ? pending : d.originFloor || "No indicado",

      dest_city: to,
      dest_address: isLead ? pending : d.destAddr || to,
      dest_floor_access: isLead ? pending : [d.destFloor, d.accessNotes].filter(Boolean).join(", ") || "No indicado",

      items: isLead ? pending : d.items || "No indicado",
      boxes: isLead ? pending : d.boxesCount || "No indicado",
      value: !isLead && d.value ? `$${d.value} USD` : isLead ? pending : "No proporcionado",
      packing: isLead ? pending : d.packing || "No indicado",
      service: isLead ? pending : d.service || "No indicado",

      // HTML fragments built in JS (already escaped where user input is involved) —
      // use {{{triple-brace}}} for these in the template so EmailJS does not re-escape them.
      whatsapp_link: phoneToWhatsAppLink(d.phone),
      email_link: linkOrFallback(d.email ? `mailto:${d.email}` : "", d.email),
      origin_maps_html: linkOrFallback("", ""),
      dest_maps_html: linkOrFallback("", ""),
      photos_html: photosHtml,
    }, EMAILJS_KEY);
  };

  const sendLead = async () => {
    setSending(true);
    setErr("");
    try {
      await send("lead");
      track("generate_lead", { direction: d.direction });
      if (ADS_LEAD_LABEL) {
        try {
          window.gtag?.("event", "conversion", { send_to: `${ADS_ID}/${ADS_LEAD_LABEL}` });
        } catch {}
      }
      go(STEPS.indexOf("sent"));
    } catch {
      setErr("We could not send your request just now.");
    } finally {
      setSending(false);
    }
  };

  const sendDetails = async () => {
    setSending(true);
    setErr("");
    try {
      await send("details");
      track("quote_details_sent");
      finish();
    } catch {
      setErr("We could not send these details, but we already have your contact info and will call you.");
    } finally {
      setSending(false);
    }
  };

  const finish = () => {
    try {
      localStorage.removeItem("cw2_step");
      localStorage.removeItem("cw2_data");
    } catch {}
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-custom-lg sm:p-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary">
            <CheckIcon className="h-8 w-8 text-white" />
          </div>
          <h2 ref={headingRef} tabIndex={-1} className={h2Cls}>
            Thank you, {d.name.split(" ")[0]}
          </h2>
          <p className="text-base leading-relaxed text-brand-gray/80">
            We have everything we need. We will call or message you at{" "}
            <strong className="text-brand-gray">{d.phone}</strong> to go over your quote.
          </p>
        </div>
      </div>
    );
  }

  const missingList = showMissing ? missing() : [];
  const detailIndex = step - LEAD_STEPS;

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-brand-border bg-white p-6 shadow-custom-lg sm:p-10">
        {/* ROUTE */}
        {s === "route" && (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className={h2Cls}>
              Get your free moving quote
            </h2>
            <p className={subCls}>
              Two quick questions and we will call you back. No obligation, and your information stays with us.
            </p>
            <div className={colCls}>
              <OptGroup id="cw-direction-label" label="Where are you moving? *">
                {DIRECTIONS.map((o) => (
                  <Opt key={o.value} label={o.label} selected={d.direction === o.value} onClick={() => setDirection(o.value)} />
                ))}
              </OptGroup>
              {d.direction && (
                <>
                  <PlaceField end="from" d={d} set={set} />
                  <PlaceField end="to" d={d} set={set} />
                </>
              )}
              <div>
                <label htmlFor="cw-date" className={labelCls}>
                  Approximate move date
                </label>
                {!d.flexible && (
                  <input
                    id="cw-date"
                    className={`${inputCls} mb-3`}
                    type="date"
                    value={d.moveDate}
                    onChange={(e) => set("moveDate", e.target.value)}
                  />
                )}
                <label
                  className={`flex cursor-pointer items-center gap-3.5 rounded-lg border-2 p-4 transition-colors ${
                    d.flexible ? "border-brand-primary bg-brand-bg" : "border-brand-border bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={d.flexible}
                    onChange={(e) => set("flexible", e.target.checked)}
                    className="h-5 w-5 flex-none accent-brand-primary"
                  />
                  <span className={`text-base text-brand-gray ${d.flexible ? "font-semibold" : ""}`}>
                    I am not sure yet — my dates are flexible
                  </span>
                </label>
              </div>
            </div>
            <Errors list={missingList} />
            <PrimaryButton onClick={() => tryNext(() => go(1))}>
              Continue
              <ChevronRightIcon className="h-5 w-5" />
            </PrimaryButton>
            <StepProgress current={1} total={LEAD_STEPS} label="Step" />
          </div>
        )}

        {/* CONTACT */}
        {s === "contact" && (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className={h2Cls}>
              Who should we call?
            </h2>
            <p className={subCls}>
              A real person from our team will call or text you to talk through your move and prepare your quote.
            </p>
            <div className={colCls}>
              <div>
                <label htmlFor="cw-name" className={labelCls}>
                  Your name *
                </label>
                <input
                  id="cw-name"
                  className={inputCls}
                  value={d.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Example: Maria Garcia"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="cw-phone" className={labelCls}>
                  Phone number (call, text or WhatsApp) *
                </label>
                <input
                  id="cw-phone"
                  className={inputCls}
                  type="tel"
                  value={d.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="Example: +1 (619) 555-0000"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label htmlFor="cw-email" className={labelCls}>
                  Email <span className={optionalCls}>(optional)</span>
                </label>
                <input
                  id="cw-email"
                  className={inputCls}
                  type="email"
                  value={d.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="Example: maria@gmail.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <Errors list={missingList} />
            {err && (
              <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
                {err}
                <ContactFallback />
              </div>
            )}
            <PrimaryButton onClick={() => tryNext(sendLead)} disabled={sending} loading={sending}>
              {sending ? "Sending…" : "Request my call back"}
            </PrimaryButton>
            <BackBtn onBack={back} />
            <StepProgress current={2} total={LEAD_STEPS} label="Step" />
          </div>
        )}

        {/* SENT — lead is already with us; details are optional */}
        {s === "sent" && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary">
              <CheckIcon className="h-7 w-7 text-white" />
            </div>
            <h2 ref={headingRef} tabIndex={-1} className={h2Cls}>
              Got it, {d.name.split(" ")[0]}. We will call you.
            </h2>
            <p className={subCls}>
              Your request is in. We will reach you at <strong className="text-brand-gray">{d.phone}</strong>.
            </p>
            <div className="mb-2 rounded-xl border border-brand-border bg-brand-bg p-5 text-left">
              <p className="text-sm font-semibold text-brand-primary">Want a more accurate quote on that first call?</p>
              <p className="mt-1 text-sm leading-relaxed text-brand-gray/80">
                Tell us a little about what you are moving. It takes about a minute, and every question is optional.
              </p>
            </div>
            <PrimaryButton onClick={() => go(STEPS.indexOf("items"))}>
              Add details
              <ChevronRightIcon className="h-5 w-5" />
            </PrimaryButton>
            <SecondaryButton onClick={finish}>No thanks, just call me</SecondaryButton>
          </div>
        )}

        {/* ITEMS */}
        {s === "items" && (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className={h2Cls}>
              What are you moving?
            </h2>
            <p className={subCls}>Photos of each room, a short list, or both — whatever is easier.</p>
            <div className={colCls}>
              <div>
                <p className={labelCls}>
                  Photos <span className={optionalCls}>(up to 8)</span>
                </p>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-border bg-brand-bg/60 p-6 text-center transition-colors hover:border-brand-secondary focus-within:border-brand-secondary">
                  <CameraIcon className="h-8 w-8 text-brand-secondary" />
                  <span className="text-sm font-semibold text-brand-primary">Choose photos</span>
                  <span className="text-xs text-brand-gray/70">Kept private and used only for your quote</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotos} className="sr-only" />
                </label>
                {uploadedPhotos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {uploadedPhotos.map((p, i) => (
                      <div key={i} className="relative h-20 w-20">
                        <img
                          src={p.preview}
                          alt={`Photo ${i + 1}`}
                          className="h-20 w-20 rounded-lg border-2 border-brand-border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-sm"
                          aria-label={`Remove photo ${i + 1}`}
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="cw-items" className={labelCls}>
                  Main items <span className={optionalCls}>(optional)</span>
                </label>
                <div className={hintCls}>Example: "Queen bed, dresser, dining table with 4 chairs, sofa, TV"</div>
                <textarea
                  id="cw-items"
                  className={`${inputCls} min-h-[80px] resize-y`}
                  value={d.items}
                  onChange={(e) => set("items", e.target.value)}
                />
              </div>
              <OptGroup id="cw-boxes-label" label="About how many boxes?">
                {BOX_COUNT_OPTIONS.map((c) => (
                  <Opt key={c} label={c} selected={d.boxesCount === c} onClick={() => set("boxesCount", c)} />
                ))}
              </OptGroup>
              <div>
                <label htmlFor="cw-value" className={labelCls}>
                  Approximate total value in USD <span className={optionalCls}>(used for customs paperwork)</span>
                </label>
                <input
                  id="cw-value"
                  className={inputCls}
                  inputMode="decimal"
                  value={d.value}
                  onChange={(e) => set("value", e.target.value)}
                  placeholder="Example: 3,000"
                />
              </div>
            </div>
            <PrimaryButton onClick={() => go(step + 1)}>
              Continue
              <ChevronRightIcon className="h-5 w-5" />
            </PrimaryButton>
            <BackBtn onBack={back} />
            <StepProgress current={detailIndex} total={DETAIL_STEPS} label="Optional details" />
          </div>
        )}

        {/* HOME — addresses and access */}
        {s === "home" && (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className={h2Cls}>
              About both homes
            </h2>
            <p className={subCls}>
              Helps us send the right truck and crew. Skip anything you do not know yet.
            </p>
            <div className={colCls}>
              <div>
                <label htmlFor="cw-origin-addr" className={labelCls}>
                  Pickup address <span className={optionalCls}>(optional)</span>
                </label>
                <input
                  id="cw-origin-addr"
                  className={inputCls}
                  value={d.originAddr}
                  onChange={(e) => set("originAddr", e.target.value)}
                  placeholder={placeOf(d, "from") || "Street, city"}
                  autoComplete="off"
                />
              </div>
              <OptGroup id="cw-origin-floor-label" label="Pickup floor">
                {FLOORS.map((f) => (
                  <Opt key={f} label={f} selected={d.originFloor === f} onClick={() => set("originFloor", f)} />
                ))}
              </OptGroup>
              <div>
                <label htmlFor="cw-dest-addr" className={labelCls}>
                  Delivery address <span className={optionalCls}>(optional)</span>
                </label>
                <input
                  id="cw-dest-addr"
                  className={inputCls}
                  value={d.destAddr}
                  onChange={(e) => set("destAddr", e.target.value)}
                  placeholder={placeOf(d, "to") || "Street, city"}
                  autoComplete="off"
                />
              </div>
              <OptGroup id="cw-dest-floor-label" label="Delivery floor">
                {FLOORS.map((f) => (
                  <Opt key={f} label={f} selected={d.destFloor === f} onClick={() => set("destFloor", f)} />
                ))}
              </OptGroup>
              <div>
                <label htmlFor="cw-access" className={labelCls}>
                  Anything we should know about access?
                </label>
                <textarea
                  id="cw-access"
                  className={`${inputCls} min-h-[70px] resize-y`}
                  value={d.accessNotes}
                  onChange={(e) => set("accessNotes", e.target.value)}
                  placeholder="Stairs only, elevator, narrow or dirt road, gated community…"
                />
              </div>
            </div>
            <PrimaryButton onClick={() => go(step + 1)}>
              Continue
              <ChevronRightIcon className="h-5 w-5" />
            </PrimaryButton>
            <BackBtn onBack={back} />
            <StepProgress current={detailIndex} total={DETAIL_STEPS} label="Optional details" />
          </div>
        )}

        {/* SERVICE — packing and delivery level */}
        {s === "service" && (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className={h2Cls}>
              How much help would you like?
            </h2>
            <p className={subCls}>Not sure? Leave it blank and we will talk it through on the call.</p>
            <div className={colCls}>
              <div role="group" aria-labelledby="cw-packing-label">
                <p id="cw-packing-label" className={labelCls}>
                  Packing
                </p>
                <div className="flex flex-col gap-3">
                  {PACKING_OPTIONS.map((opt) => (
                    <RadioCard
                      key={opt.value}
                      label={opt.label}
                      desc={opt.desc}
                      selected={d.packing === opt.value}
                      onClick={() => set("packing", opt.value)}
                    />
                  ))}
                </div>
              </div>
              <div role="group" aria-labelledby="cw-service-label">
                <p id="cw-service-label" className={labelCls}>
                  Delivery
                </p>
                <div className="flex flex-col gap-3">
                  {SERVICE_OPTIONS.map((opt) => (
                    <RadioCard
                      key={opt.value}
                      label={opt.label}
                      desc={opt.desc}
                      selected={d.service === opt.value}
                      onClick={() => set("service", opt.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
            {err && (
              <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
                {err}
              </div>
            )}
            <PrimaryButton onClick={sendDetails} disabled={sending} loading={sending}>
              {uploadingPhotos ? "Uploading your photos…" : sending ? "Sending…" : "Send details"}
            </PrimaryButton>
            <BackBtn onBack={back} />
            <StepProgress current={detailIndex} total={DETAIL_STEPS} label="Optional details" />
          </div>
        )}
      </div>
    </div>
  );
}
