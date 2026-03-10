import { useState } from "react";

const SERVICE_ID = import.meta.env.PUBLIC_EMAILJS_SERVICE;
const TEMPLATE_ID = import.meta.env.PUBLIC_EMAILJS_TEMPLATE;

const DESTINATIONS = [
  "Tijuana",
  "Rosarito",
  "Ensenada",
  "Mexicali",
  "La Paz",
  "Cabo San Lucas",
  "Los Cabos",
  "Loreto",
  "Other",
];
const FLOORS = ["Ground floor", "2nd floor", "3rd floor+"];
const STEPS = [
  "intro",
  "contact",
  "date",
  "origin",
  "destination",
  "items",
  "packing",
  "service",
  "review",
];

const css = {
  input: {
    width: "100%",
    padding: "0.7rem 1rem",
    border: "1.5px solid #dde4ff",
    borderRadius: "10px",
    fontSize: "0.95rem",
    color: "#1a3a86",
    outline: "none",
    fontFamily: "sans-serif",
    boxSizing: "border-box",
    background: "#fafbff",
  },
  label: {
    display: "block",
    marginBottom: "0.35rem",
    fontSize: "0.78rem",
    fontWeight: "600",
    color: "#4779db",
    fontFamily: "sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  btn: {
    background: "linear-gradient(135deg,#1a3a86,#4779db)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    padding: "0.9rem 2rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "sans-serif",
    width: "100%",
    boxShadow: "0 4px 16px rgba(71,121,219,0.35)",
    marginTop: "1rem",
  },
  h2: {
    color: "#1a3a86",
    fontSize: "1.45rem",
    fontWeight: "700",
    marginBottom: "0.4rem",
    lineHeight: 1.3,
  },
  sub: {
    color: "#777",
    fontSize: "0.9rem",
    marginBottom: "1.25rem",
    fontFamily: "sans-serif",
    lineHeight: 1.6,
  },
  col: { display: "flex", flexDirection: "column", gap: "1rem" },
};

function Opt({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.75rem 0.8rem",
        border: `2px solid ${selected ? "#1a3a86" : "#dde4ff"}`,
        borderRadius: "10px",
        cursor: "pointer",
        fontFamily: "sans-serif",
        textAlign: "left",
        background: selected ? "#f0f4ff" : "white",
        fontWeight: selected ? "600" : "400",
        color: selected ? "#1a3a86" : "#444",
        fontSize: "0.85rem",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export default function ContactWizard() {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    name: "",
    phone: "",
    email: "",
    moveDate: "",
    flexible: false,
    originAddr: "",
    originMaps: "",
    originFloor: "",
    originAccess: "",
    destCity: "",
    destAddr: "",
    destMaps: "",
    destFloor: "",
    destAccess: "",
    items: "",
    value: "",
    photos: "",
    packing: "",
    service: "",
  });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const s = STEPS[step];
  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  const canNext = () => {
    if (s === "contact") return d.name.trim() && d.phone.trim();
    if (s === "date") return d.moveDate || d.flexible;
    if (s === "origin") return d.originAddr.trim() && d.originFloor;
    if (s === "destination")
      return d.destCity && d.destAddr.trim() && d.destFloor;
    if (s === "items") return d.items.trim();
    if (s === "packing") return d.packing;
    if (s === "service") return d.service;
    return true;
  };

  const submit = async () => {
    setSending(true);
    setErr("");
    const body = `NEW QUOTE\n\nContact: ${d.name} | ${d.phone} | ${d.email}\nDate: ${d.flexible ? "Flexible" : d.moveDate}\n\nFrom: ${d.originAddr} (${d.originFloor}, ${d.originAccess})\nMaps: ${d.originMaps || "N/A"}\n\nTo: ${d.destCity} - ${d.destAddr} (${d.destFloor}, ${d.destAccess})\nMaps: ${d.destMaps || "N/A"}\n\nItems: ${d.items}\nValue: ${d.value || "N/A"}\nPhotos: ${d.photos}\n\nPacking: ${d.packing}\nService: ${d.service}`;
    try {
      await window.emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        from_name: d.name,
        reply_to: d.email || d.phone,
        phone: d.phone,
        message: body,
        destination: d.destCity,
        move_date: d.flexible ? "Flexible" : d.moveDate,
        current_location: d.originAddr,
        move_type: d.service,
        contact_preferences: "Phone/WhatsApp",
      });
      setDone(true);
    } catch (e) {
      setErr("Error sending. Please contact us directly.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 1rem",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "3rem 2rem",
            maxWidth: "440px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              color: "white",
              fontSize: "1.75rem",
            }}
          >
            ✓
          </div>
          <h2
            style={{
              color: "#1a3a86",
              fontSize: "1.5rem",
              marginBottom: "0.75rem",
            }}
          >
            Request Received!
          </h2>
          <p
            style={{ color: "#555", lineHeight: 1.7, fontFamily: "sans-serif" }}
          >
            Thank you <strong>{d.name}</strong>. We will contact you at{" "}
            <strong>{d.phone}</strong> shortly with your quote.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto 1.25rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
          }}
        >
          <span
            style={{
              color: "#1a3a86",
              fontSize: "0.78rem",
              fontWeight: "600",
              textTransform: "uppercase",
            }}
          >
            Step {Math.max(step, 1)} of {STEPS.length - 1}
          </span>
          <span style={{ color: "#4779db", fontSize: "0.78rem" }}>
            {progress}%
          </span>
        </div>
        <div
          style={{ height: "4px", background: "#dde4ff", borderRadius: "99px" }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg,#1a3a86,#4779db)",
              borderRadius: "99px",
              transition: "width 0.4s",
            }}
          />
        </div>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "2rem 1.75rem",
          maxWidth: "560px",
          margin: "0 auto",
          boxShadow: "0 20px 60px rgba(26,58,134,0.1)",
          border: "1px solid #e8edff",
        }}
      >
        {s === "intro" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📦</div>
            <h2 style={css.h2}>Let's plan your move to Baja</h2>
            <p style={{ ...css.sub, fontSize: "1rem" }}>
              Just a few quick questions — takes about 2 minutes.
            </p>
            <div
              style={{
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                marginBottom: "1.5rem",
              }}
            >
              {[
                ["📍", "Pickup and delivery locations"],
                ["📅", "Approximate move date"],
                ["🛋️", "What you are moving"],
                ["✅", "Service preferences"],
              ].map(([icon, text]) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    gap: "0.6rem",
                    alignItems: "center",
                    fontSize: "0.9rem",
                    color: "#444",
                  }}
                >
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <button onClick={next} style={css.btn}>
              Get My Free Quote →
            </button>
          </div>
        )}

        {s === "contact" && (
          <div>
            <h2 style={css.h2}>Nice to meet you! 👋</h2>
            <p style={css.sub}>Start with your basic contact info.</p>
            <div style={css.col}>
              <div>
                <label style={css.label}>Full name *</label>
                <input
                  style={css.input}
                  value={d.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label style={css.label}>Phone / WhatsApp *</label>
                <input
                  style={css.input}
                  type="tel"
                  value={d.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+1 (619) 000-0000"
                />
              </div>
              <div>
                <label style={css.label}>Email</label>
                <input
                  style={css.input}
                  type="email"
                  value={d.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <button
              onClick={next}
              disabled={!canNext()}
              style={{ ...css.btn, opacity: canNext() ? 1 : 0.4 }}
            >
              Continue →
            </button>
          </div>
        )}

        {s === "date" && (
          <div>
            <h2 style={css.h2}>When are you moving? 📅</h2>
            <p style={css.sub}>Approximate is fine — we can adjust.</p>
            <div style={css.col}>
              {!d.flexible && (
                <div>
                  <label style={css.label}>Approximate date</label>
                  <input
                    style={css.input}
                    type="date"
                    value={d.moveDate}
                    onChange={(e) => set("moveDate", e.target.value)}
                  />
                </div>
              )}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  padding: "0.75rem 1rem",
                  border: `2px solid ${d.flexible ? "#1a3a86" : "#dde4ff"}`,
                  borderRadius: "10px",
                  background: d.flexible ? "#f0f4ff" : "white",
                }}
              >
                <input
                  type="checkbox"
                  checked={d.flexible}
                  onChange={(e) => set("flexible", e.target.checked)}
                  style={{
                    width: "18px",
                    height: "18px",
                    accentColor: "#1a3a86",
                  }}
                />
                <span style={{ fontSize: "0.9rem", color: "#444" }}>
                  My dates are flexible
                </span>
              </label>
            </div>
            <button
              onClick={next}
              disabled={!canNext()}
              style={{ ...css.btn, opacity: canNext() ? 1 : 0.4 }}
            >
              Continue →
            </button>
          </div>
        )}

        {s === "origin" && (
          <div>
            <h2 style={css.h2}>Pickup location 📍</h2>
            <p style={css.sub}>Where are we picking up from?</p>
            <div style={css.col}>
              <div>
                <label style={css.label}>Full address *</label>
                <input
                  style={css.input}
                  value={d.originAddr}
                  onChange={(e) => set("originAddr", e.target.value)}
                  placeholder="1234 Main St, San Diego, CA"
                />
              </div>
              <div>
                <label style={css.label}>Google Maps link (optional)</label>
                <input
                  style={css.input}
                  value={d.originMaps}
                  onChange={(e) => set("originMaps", e.target.value)}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div>
                <label style={css.label}>Floor *</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.5rem",
                  }}
                >
                  {FLOORS.map((f) => (
                    <Opt
                      key={f}
                      label={f}
                      selected={d.originFloor === f}
                      onClick={() => set("originFloor", f)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label style={css.label}>Access</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.5rem",
                  }}
                >
                  {["Elevator", "Stairs", "Both"].map((a) => (
                    <Opt
                      key={a}
                      label={a}
                      selected={d.originAccess === a}
                      onClick={() => set("originAccess", a)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={next}
              disabled={!canNext()}
              style={{ ...css.btn, opacity: canNext() ? 1 : 0.4 }}
            >
              Continue →
            </button>
          </div>
        )}

        {s === "destination" && (
          <div>
            <h2 style={css.h2}>Delivery location 🏡</h2>
            <p style={css.sub}>Where are we delivering in Baja?</p>
            <div style={css.col}>
              <div>
                <label style={css.label}>City *</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.5rem",
                  }}
                >
                  {DESTINATIONS.map((c) => (
                    <Opt
                      key={c}
                      label={c}
                      selected={d.destCity === c}
                      onClick={() => set("destCity", c)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label style={css.label}>Full address *</label>
                <input
                  style={css.input}
                  value={d.destAddr}
                  onChange={(e) => set("destAddr", e.target.value)}
                  placeholder="Calle, Colonia, Ciudad"
                />
              </div>
              <div>
                <label style={css.label}>Google Maps link (optional)</label>
                <input
                  style={css.input}
                  value={d.destMaps}
                  onChange={(e) => set("destMaps", e.target.value)}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div>
                <label style={css.label}>Floor *</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.5rem",
                  }}
                >
                  {FLOORS.map((f) => (
                    <Opt
                      key={f}
                      label={f}
                      selected={d.destFloor === f}
                      onClick={() => set("destFloor", f)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label style={css.label}>Access</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.5rem",
                  }}
                >
                  {["Elevator", "Stairs", "Both"].map((a) => (
                    <Opt
                      key={a}
                      label={a}
                      selected={d.destAccess === a}
                      onClick={() => set("destAccess", a)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={next}
              disabled={!canNext()}
              style={{ ...css.btn, opacity: canNext() ? 1 : 0.4 }}
            >
              Continue →
            </button>
          </div>
        )}

        {s === "items" && (
          <div>
            <h2 style={css.h2}>What are you moving? 🛋️</h2>
            <p style={css.sub}>
              A rough description is enough. You can send photos via WhatsApp
              later.
            </p>
            <div style={css.col}>
              <div>
                <label style={css.label}>Describe your items *</label>
                <textarea
                  style={{
                    ...css.input,
                    minHeight: "90px",
                    resize: "vertical",
                  }}
                  value={d.items}
                  onChange={(e) => set("items", e.target.value)}
                  placeholder="e.g. Bedroom set, dining table, 15 boxes, 2 sofas, TV..."
                />
              </div>
              <div>
                <label style={css.label}>
                  Estimated value in USD (needed for customs)
                </label>
                <input
                  style={css.input}
                  value={d.value}
                  onChange={(e) => set("value", e.target.value)}
                  placeholder="e.g. $5,000"
                />
              </div>
              <div>
                <label style={css.label}>Do you have photos?</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.5rem",
                  }}
                >
                  {[
                    ["Yes, via WhatsApp", "Yes"],
                    ["I'll take them later", "Later"],
                    ["No", "No"],
                  ].map(([label, val]) => (
                    <Opt
                      key={val}
                      label={label}
                      selected={d.photos === val}
                      onClick={() => set("photos", val)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={next}
              disabled={!canNext()}
              style={{ ...css.btn, opacity: canNext() ? 1 : 0.4 }}
            >
              Continue →
            </button>
          </div>
        )}

        {s === "packing" && (
          <div>
            <h2 style={css.h2}>Packing service? 📦</h2>
            <p style={css.sub}>
              We can pack everything for you, or you can handle it yourself.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              {[
                [
                  "Full packing",
                  "We bring boxes, wrap, and pack all your items.",
                  "Full",
                ],
                [
                  "Partial — fragile items only",
                  "We pack what needs extra care.",
                  "Partial",
                ],
                [
                  "I will pack myself",
                  "Everything arrives already packed and ready.",
                  "Self",
                ],
              ].map(([label, desc, val]) => (
                <button
                  key={val}
                  onClick={() => set("packing", val)}
                  style={{
                    padding: "0.85rem 1rem",
                    border: `2px solid ${d.packing === val ? "#1a3a86" : "#dde4ff"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontFamily: "sans-serif",
                    background: d.packing === val ? "#f0f4ff" : "white",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "600",
                      color: d.packing === val ? "#1a3a86" : "#333",
                      marginBottom: "0.2rem",
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#999" }}>
                    {desc}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={next}
              disabled={!canNext()}
              style={{ ...css.btn, opacity: canNext() ? 1 : 0.4 }}
            >
              Continue →
            </button>
          </div>
        )}

        {s === "service" && (
          <div>
            <h2 style={css.h2}>Service level? ✨</h2>
            <p style={css.sub}>Choose the experience that fits your needs.</p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {[
                [
                  "Standard",
                  "We deliver to the ground floor or main entrance.",
                  "Standard",
                ],
                [
                  "White Glove — Premium",
                  "We place items in every room, unpack, assemble furniture, and remove packaging.",
                  "White Glove",
                ],
              ].map(([label, desc, val]) => (
                <button
                  key={val}
                  onClick={() => set("service", val)}
                  style={{
                    padding: "1rem 1.25rem",
                    border: `2px solid ${d.service === val ? "#1a3a86" : "#dde4ff"}`,
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontFamily: "sans-serif",
                    background: d.service === val ? "#f0f4ff" : "white",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "700",
                      color: d.service === val ? "#1a3a86" : "#333",
                      fontSize: "1rem",
                      marginBottom: "0.3rem",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "#888",
                      lineHeight: 1.5,
                    }}
                  >
                    {desc}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={next}
              disabled={!canNext()}
              style={{ ...css.btn, opacity: canNext() ? 1 : 0.4 }}
            >
              Review my request →
            </button>
          </div>
        )}

        {s === "review" && (
          <div>
            <h2 style={css.h2}>Review your request ✅</h2>
            <p style={css.sub}>
              Everything look good? Submit and we will get back to you with a
              quote.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1.25rem",
              }}
            >
              {[
                ["👤 Contact", `${d.name} — ${d.phone}`],
                ["📅 Date", d.flexible ? "Flexible" : d.moveDate],
                ["📍 From", d.originAddr],
                ["🏡 To", `${d.destCity} — ${d.destAddr}`],
                ["🛋️ Items", d.items],
                ["📦 Packing", d.packing],
                ["✨ Service", d.service],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    padding: "0.6rem 0.85rem",
                    background: "#f8faff",
                    borderRadius: "8px",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.82rem",
                      minWidth: "100px",
                      color: "#4779db",
                      fontWeight: "600",
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      color: "#333",
                      lineHeight: 1.4,
                    }}
                  >
                    {value || "—"}
                  </span>
                </div>
              ))}
            </div>
            {err && (
              <div
                style={{
                  background: "#fef2f2",
                  color: "#dc2626",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  marginBottom: "0.75rem",
                }}
              >
                {err}
              </div>
            )}
            <button
              onClick={submit}
              disabled={sending}
              style={{ ...css.btn, opacity: sending ? 0.7 : 1 }}
            >
              {sending ? "Sending…" : "Submit Quote Request 🚀"}
            </button>
            <p
              style={{
                fontSize: "0.75rem",
                color: "#aaa",
                textAlign: "center",
                marginTop: "0.75rem",
              }}
            >
              Your information is private and will never be shared.
            </p>
          </div>
        )}
      </div>

      {step > 1 && step < STEPS.length - 1 && (
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button
            onClick={back}
            style={{
              background: "none",
              border: "none",
              color: "#4779db",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontFamily: "sans-serif",
            }}
          >
            ← Go back
          </button>
        </div>
      )}
    </div>
  );
}
