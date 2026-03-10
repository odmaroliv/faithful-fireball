import { useState, useEffect } from "react";

const SERVICE_ID = import.meta.env.PUBLIC_EMAILJS_SERVICE;
const TEMPLATE_ID = import.meta.env.PUBLIC_EMAILJS_TEMPLATE;
const IMGBB_KEY = import.meta.env.PUBLIC_IMGBB_KEY;
const IMGBB_ALBUM = import.meta.env.PUBLIC_IMGBB_ALBUM;

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

const EMPTY = {
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
};

const css = {
  input: {
    width: "100%",
    padding: "0.85rem 1rem",
    border: "2px solid #dde4ff",
    borderRadius: "10px",
    fontSize: "1.05rem",
    color: "#1a3a86",
    outline: "none",
    fontFamily: "sans-serif",
    boxSizing: "border-box",
    background: "#fafbff",
  },
  label: {
    display: "block",
    marginBottom: "0.45rem",
    fontSize: "0.9rem",
    fontWeight: "700",
    color: "#1a3a86",
    fontFamily: "sans-serif",
  },
  btnPrimary: {
    background: "linear-gradient(135deg,#1a3a86,#4779db)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    padding: "1rem 2rem",
    fontSize: "1.1rem",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "sans-serif",
    width: "100%",
    boxShadow: "0 4px 16px rgba(71,121,219,0.35)",
    marginTop: "1rem",
    letterSpacing: "0.02em",
  },
  btnBack: {
    background: "white",
    color: "#1a3a86",
    border: "2px solid #dde4ff",
    borderRadius: "12px",
    padding: "0.85rem 2rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "sans-serif",
    width: "100%",
    marginTop: "0.6rem",
  },
  h2: {
    color: "#1a3a86",
    fontSize: "1.55rem",
    fontWeight: "800",
    marginBottom: "0.4rem",
    lineHeight: 1.3,
  },
  sub: {
    color: "#666",
    fontSize: "1rem",
    marginBottom: "1.25rem",
    fontFamily: "sans-serif",
    lineHeight: 1.7,
  },
  col: { display: "flex", flexDirection: "column", gap: "1.1rem" },
  hint: {
    background: "#f0f4ff",
    border: "1px solid #dde4ff",
    borderRadius: "8px",
    padding: "0.6rem 0.9rem",
    fontSize: "0.88rem",
    color: "#4779db",
    fontFamily: "sans-serif",
    marginBottom: "1rem",
    lineHeight: 1.5,
  },
};

function Opt({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.55rem 0.9rem",
        border: `2px solid ${selected ? "#1a3a86" : "#dde4ff"}`,
        borderRadius: "8px",
        cursor: "pointer",
        fontFamily: "sans-serif",
        textAlign: "center",
        background: selected ? "#f0f4ff" : "white",
        fontWeight: selected ? "700" : "400",
        color: selected ? "#1a3a86" : "#444",
        fontSize: "0.9rem",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {selected && <span style={{ marginRight: "0.3rem" }}>✓</span>}
      {label}
    </button>
  );
}

function BackBtn({ onBack }) {
  return (
    <button onClick={onBack} style={css.btnBack}>
      ← Go back
    </button>
  );
}

export default function ContactWizard() {
  const [step, setStep] = useState(() => {
    try {
      return parseInt(localStorage.getItem("cw_step") || "0");
    } catch {
      return 0;
    }
  });
  const [d, setD] = useState(() => {
    try {
      const saved = localStorage.getItem("cw_data");
      return saved ? { ...EMPTY, ...JSON.parse(saved) } : EMPTY;
    } catch {
      return EMPTY;
    }
  });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [photoErr, setPhotoErr] = useState("");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("cw_step", String(step));
      localStorage.setItem("cw_data", JSON.stringify(d));
    } catch {}
  }, [step, d]);

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

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files).slice(0, 8);
    setPhotoErr("");
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

  const submit = async () => {
    setSending(true);
    setErr("");
    let photoLinks = "";
    if (uploadedPhotos.length > 0) {
      setUploadingPhotos(true);
      const urls = await uploadPhotosToImgBB();
      setUploadingPhotos(false);
      if (urls.length > 0)
        photoLinks =
          "\n\nPHOTOS:\n" +
          urls.map((u, i) => `Photo ${i + 1}: ${u}`).join("\n");
    }
    const body = `NEW QUOTE\n\nContact: ${d.name} | ${d.phone} | ${d.email}\nDate: ${d.flexible ? "Flexible" : d.moveDate}\n\nFrom: ${d.originAddr} (${d.originFloor}, ${d.originAccess})\nMaps: ${d.originMaps || "N/A"}\n\nTo: ${d.destCity} - ${d.destAddr} (${d.destFloor}, ${d.destAccess})\nMaps: ${d.destMaps || "N/A"}\n\nItems: ${d.items}\nValue: ${d.value || "N/A"}\nPhotos: ${d.photos}\n\nPacking: ${d.packing}\nService: ${d.service}${photoLinks}`;
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
      try {
        localStorage.removeItem("cw_step");
        localStorage.removeItem("cw_data");
      } catch {}
      setDone(true);
    } catch (e) {
      setErr(
        "There was an error sending your request. Please try again or contact us directly by phone or WhatsApp.",
      );
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
            maxWidth: "480px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              color: "white",
              fontSize: "2rem",
            }}
          >
            ✓
          </div>
          <h2
            style={{
              color: "#1a3a86",
              fontSize: "1.6rem",
              marginBottom: "0.75rem",
              fontWeight: "800",
            }}
          >
            Request Sent!
          </h2>
          <p
            style={{
              color: "#555",
              lineHeight: 1.8,
              fontFamily: "sans-serif",
              fontSize: "1.05rem",
            }}
          >
            Thank you, <strong>{d.name}</strong>.<br />
            We will call or message you at <strong>{d.phone}</strong> shortly to
            confirm your quote.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      {/* Card */}
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "2.25rem 2rem",
          maxWidth: "580px",
          margin: "0 auto",
          boxShadow: "0 20px 60px rgba(26,58,134,0.1)",
          border: "1px solid #e8edff",
        }}
      >
        {/* INTRO */}
        {s === "intro" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>📦</div>
            <h2 style={{ ...css.h2, fontSize: "1.7rem" }}>
              Get Your Free Moving Quote
            </h2>
            <p style={{ ...css.sub, fontSize: "1.05rem" }}>
              Answer a few simple questions and we will prepare your
              personalized quote. It only takes about 2 minutes.
            </p>

            {/* AI highlight box */}
            <div
              style={{
                textAlign: "left",
                background: "linear-gradient(135deg,#eef1ff,#f0f4ff)",
                border: "2px solid #c7d2ff",
                borderRadius: "14px",
                padding: "1.1rem 1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{
                    background: "linear-gradient(135deg,#6366f1,#4779db)",
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    padding: "0.25rem 0.65rem",
                    borderRadius: "99px",
                    letterSpacing: "0.05em",
                  }}
                >
                  ✦ AI-Powered
                </span>
                <span
                  style={{
                    fontSize: "1rem",
                    fontWeight: "800",
                    color: "#1a3a86",
                  }}
                >
                  No need to write any list
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "#444",
                  margin: "0 0 0.75rem",
                  lineHeight: 1.65,
                }}
              >
                When we ask about your belongings, you can simply{" "}
                <strong>take a few photos</strong> of each room and upload them.
                Our AI will read the photos and create the inventory list
                automatically.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "flex-start",
                  fontSize: "0.88rem",
                  color: "#6366f1",
                  fontWeight: "600",
                }}
              >
                <span>📸</span>
                <span>
                  You take the photo → AI creates the list → We prepare your
                  quote
                </span>
              </div>
            </div>

            {/* Steps summary */}
            {/* <div
              style={{
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                marginBottom: "1.75rem",
                background: "#f8faff",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
              }}
            >
              {[
                ["📍", "Where you are moving from and to"],
                ["📅", "When you plan to move"],
                ["📸", "Photos of your belongings (AI reads them for you)"],
                ["✅", "What type of service you need"],
              ].map(([icon, text]) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "center",
                    fontSize: "0.95rem",
                    color: "#444",
                  }}
                >
                  <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>
                    {icon}
                  </span>
                  <span>{text}</span>
                </div>
              ))}
            </div> */}

            <button
              onClick={next}
              style={{
                ...css.btnPrimary,
                fontSize: "1.2rem",
                padding: "1.1rem 2rem",
              }}
            >
              👉 Tap here to start
            </button>
          </div>
        )}

        {/* CONTACT */}
        {s === "contact" && (
          <div>
            <h2 style={css.h2}>Your contact information</h2>
            <p style={css.sub}>
              We need your name and phone number to send you the quote.
            </p>
            <div style={css.col}>
              <div>
                <label style={css.label}>Your full name *</label>
                <input
                  style={css.input}
                  value={d.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Example: Maria Garcia"
                />
              </div>
              <div>
                <label style={css.label}>Your phone number (WhatsApp) *</label>
                <input
                  style={css.input}
                  type="tel"
                  value={d.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="Example: +1 (619) 555-0000"
                />
              </div>
              <div>
                <label style={css.label}>
                  Your email address{" "}
                  <span style={{ fontWeight: "400", color: "#888" }}>
                    (optional)
                  </span>
                </label>
                <input
                  style={css.input}
                  type="email"
                  value={d.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="Example: maria@gmail.com"
                />
              </div>
            </div>
            <button
              onClick={next}
              disabled={!canNext()}
              style={{ ...css.btnPrimary, opacity: canNext() ? 1 : 0.4 }}
            >
              Continue →
            </button>
            <BackBtn onBack={back} />
            {s !== "intro" && (
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "0.85rem",
                  borderTop: "1px solid #eef0ff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      color: "#aab4d4",
                      fontSize: "0.72rem",
                      fontWeight: "600",
                    }}
                  >
                    Step {Math.max(step, 1)} of {STEPS.length - 1}
                  </span>
                  <span style={{ color: "#aab4d4", fontSize: "0.72rem" }}>
                    {progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    background: "#eef0ff",
                    borderRadius: "99px",
                  }}
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
            )}
          </div>
        )}

        {/* DATE */}
        {s === "date" && (
          <div>
            <h2 style={css.h2}>When do you plan to move? 📅</h2>
            <p style={css.sub}>
              If you are not sure of the exact date, that is okay — just check
              the box below.
            </p>
            <div style={css.col}>
              {!d.flexible && (
                <div>
                  <label style={css.label}>Approximate move date</label>
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
                  gap: "0.9rem",
                  cursor: "pointer",
                  padding: "1rem 1.1rem",
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
                    width: "22px",
                    height: "22px",
                    accentColor: "#1a3a86",
                    cursor: "pointer",
                  }}
                />
                <span
                  style={{
                    fontSize: "1rem",
                    color: "#333",
                    fontWeight: d.flexible ? "700" : "400",
                  }}
                >
                  I do not have a date yet — my schedule is flexible
                </span>
              </label>
            </div>
            <button
              onClick={next}
              disabled={!canNext()}
              style={{ ...css.btnPrimary, opacity: canNext() ? 1 : 0.4 }}
            >
              Continue →
            </button>
            <BackBtn onBack={back} />
            {s !== "intro" && (
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "0.85rem",
                  borderTop: "1px solid #eef0ff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      color: "#aab4d4",
                      fontSize: "0.72rem",
                      fontWeight: "600",
                    }}
                  >
                    Step {Math.max(step, 1)} of {STEPS.length - 1}
                  </span>
                  <span style={{ color: "#aab4d4", fontSize: "0.72rem" }}>
                    {progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    background: "#eef0ff",
                    borderRadius: "99px",
                  }}
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
            )}
          </div>
        )}

        {/* ORIGIN */}
        {s === "origin" && (
          <div>
            <h2 style={css.h2}>Pickup address 📍</h2>
            <p style={css.sub}>
              Where will we pick up your belongings? This is your current
              address in the United States.
            </p>
            <div style={css.hint}>
              💡 Tip: You can copy your address from Google Maps and paste it
              here.
            </div>
            <div style={css.col}>
              <div>
                <label style={css.label}>Full street address *</label>
                <input
                  style={css.input}
                  value={d.originAddr}
                  onChange={(e) => set("originAddr", e.target.value)}
                  placeholder="Example: 1234 Main St, San Diego, CA 92154"
                />
              </div>
              <div>
                <label style={css.label}>
                  Google Maps link{" "}
                  <span style={{ fontWeight: "400", color: "#888" }}>
                    (optional — helps us plan the route)
                  </span>
                </label>
                <input
                  style={css.input}
                  value={d.originMaps}
                  onChange={(e) => set("originMaps", e.target.value)}
                  placeholder="Paste the link from Google Maps here"
                />
              </div>
              <div>
                <label style={css.label}>
                  Which floor are your belongings on? *
                </label>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
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
                <label style={css.label}>How do you access the floor?</label>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  {[
                    "There is an elevator",
                    "Stairs only",
                    "Both elevator and stairs",
                  ].map((a, i) => {
                    const val = ["Elevator", "Stairs", "Both"][i];
                    return (
                      <Opt
                        key={val}
                        label={a}
                        selected={d.originAccess === val}
                        onClick={() => set("originAccess", val)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            <button
              onClick={next}
              disabled={!canNext()}
              style={{ ...css.btnPrimary, opacity: canNext() ? 1 : 0.4 }}
            >
              Continue →
            </button>
            <BackBtn onBack={back} />
            {s !== "intro" && (
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "0.85rem",
                  borderTop: "1px solid #eef0ff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      color: "#aab4d4",
                      fontSize: "0.72rem",
                      fontWeight: "600",
                    }}
                  >
                    Step {Math.max(step, 1)} of {STEPS.length - 1}
                  </span>
                  <span style={{ color: "#aab4d4", fontSize: "0.72rem" }}>
                    {progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    background: "#eef0ff",
                    borderRadius: "99px",
                  }}
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
            )}
          </div>
        )}

        {/* DESTINATION */}
        {s === "destination" && (
          <div>
            <h2 style={css.h2}>Delivery address 🏡</h2>
            <p style={css.sub}>
              Where will we deliver your belongings in Baja California?
            </p>
            <div style={css.col}>
              <div>
                <label style={css.label}>Select your destination city *</label>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
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
                <label style={css.label}>Full street address *</label>
                <input
                  style={css.input}
                  value={d.destAddr}
                  onChange={(e) => set("destAddr", e.target.value)}
                  placeholder="Example: Calle Principal 123, Colonia Centro"
                />
              </div>
              <div>
                <label style={css.label}>
                  Google Maps link{" "}
                  <span style={{ fontWeight: "400", color: "#888" }}>
                    (optional)
                  </span>
                </label>
                <input
                  style={css.input}
                  value={d.destMaps}
                  onChange={(e) => set("destMaps", e.target.value)}
                  placeholder="Paste the link from Google Maps here"
                />
              </div>
              <div>
                <label style={css.label}>
                  Which floor will we deliver to? *
                </label>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
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
                <label style={css.label}>How do you access the floor?</label>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  {[
                    "There is an elevator",
                    "Stairs only",
                    "Both elevator and stairs",
                  ].map((a, i) => {
                    const val = ["Elevator", "Stairs", "Both"][i];
                    return (
                      <Opt
                        key={val}
                        label={a}
                        selected={d.destAccess === val}
                        onClick={() => set("destAccess", val)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            <button
              onClick={next}
              disabled={!canNext()}
              style={{ ...css.btnPrimary, opacity: canNext() ? 1 : 0.4 }}
            >
              Continue →
            </button>
            <BackBtn onBack={back} />
            {s !== "intro" && (
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "0.85rem",
                  borderTop: "1px solid #eef0ff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      color: "#aab4d4",
                      fontSize: "0.72rem",
                      fontWeight: "600",
                    }}
                  >
                    Step {Math.max(step, 1)} of {STEPS.length - 1}
                  </span>
                  <span style={{ color: "#aab4d4", fontSize: "0.72rem" }}>
                    {progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    background: "#eef0ff",
                    borderRadius: "99px",
                  }}
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
            )}
          </div>
        )}

        {/* ITEMS */}
        {s === "items" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.25rem",
              }}
            >
              <h2 style={{ ...css.h2, marginBottom: 0 }}>
                What are you moving? 🛋️
              </h2>
              <span
                style={{
                  background: "linear-gradient(135deg,#6366f1,#4779db)",
                  color: "white",
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "99px",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                ✦ AI-Powered
              </span>
            </div>
            <p style={css.sub}>
              Upload photos of your belongings and our AI will generate the
              inventory list for you automatically.
            </p>
            <div style={css.col}>
              <div>
                <label style={css.label}>
                  Upload photos{" "}
                  <span style={{ fontWeight: "400", color: "#888" }}>
                    (up to 8 photos)
                  </span>
                </label>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "1.25rem",
                    border: "2px dashed #c7d2ff",
                    borderRadius: "12px",
                    cursor: "pointer",
                    background: "#f8faff",
                    transition: "border-color 0.2s",
                  }}
                >
                  <span style={{ fontSize: "2rem" }}>📸</span>
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: "#4779db",
                      fontWeight: "600",
                    }}
                  >
                    Tap to select photos
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#aaa" }}>
                    JPG, PNG — max 10MB each
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotos}
                    style={{ display: "none" }}
                  />
                </label>
                {photoErr && (
                  <p
                    style={{
                      color: "#dc2626",
                      fontSize: "0.82rem",
                      marginTop: "0.4rem",
                    }}
                  >
                    {photoErr}
                  </p>
                )}
                {uploadedPhotos.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    {uploadedPhotos.map((p, i) => (
                      <div
                        key={i}
                        style={{
                          position: "relative",
                          width: "80px",
                          height: "80px",
                        }}
                      >
                        <img
                          src={p.preview}
                          alt={p.name}
                          style={{
                            width: "80px",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "2px solid #dde4ff",
                          }}
                        />
                        <button
                          onClick={() => removePhoto(i)}
                          style={{
                            position: "absolute",
                            top: "-6px",
                            right: "-6px",
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={css.label}>
                  Or describe your belongings manually *
                </label>
                <div style={css.hint}>
                  💡 Example: "1 bed, dresser, dining table with 4 chairs, sofa,
                  10 boxes, TV"
                </div>
                <textarea
                  style={{
                    ...css.input,
                    minHeight: "80px",
                    resize: "vertical",
                  }}
                  value={d.items}
                  onChange={(e) => set("items", e.target.value)}
                  placeholder="Write a list of the main items you are moving..."
                />
              </div>
              <div>
                <label style={css.label}>
                  Approximate total value in US dollars{" "}
                  <span style={{ fontWeight: "400", color: "#888" }}>
                    (required for customs paperwork)
                  </span>
                </label>
                <input
                  style={css.input}
                  value={d.value}
                  onChange={(e) => set("value", e.target.value)}
                  placeholder="Example: $3,000"
                />
              </div>
            </div>
            <button
              onClick={next}
              disabled={!canNext()}
              style={{ ...css.btnPrimary, opacity: canNext() ? 1 : 0.4 }}
            >
              Continue →
            </button>
            <BackBtn onBack={back} />
            {s !== "intro" && (
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "0.85rem",
                  borderTop: "1px solid #eef0ff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      color: "#aab4d4",
                      fontSize: "0.72rem",
                      fontWeight: "600",
                    }}
                  >
                    Step {Math.max(step, 1)} of {STEPS.length - 1}
                  </span>
                  <span style={{ color: "#aab4d4", fontSize: "0.72rem" }}>
                    {progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    background: "#eef0ff",
                    borderRadius: "99px",
                  }}
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
            )}
          </div>
        )}

        {/* PACKING */}
        {s === "packing" && (
          <div>
            <h2 style={css.h2}>Do you need packing help? 📦</h2>
            <p style={css.sub}>
              We can pack your belongings for you, or you can pack them yourself
              before we arrive.
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
                  "Yes — pack everything for me",
                  "You do not need to pack anything. We bring boxes and all materials.",
                  "Full",
                ],
                [
                  "Only fragile or special items",
                  "We carefully pack delicate items like dishes, artwork, or electronics.",
                  "Partial",
                ],
                [
                  "No — I will pack everything myself",
                  "Everything will be boxed and ready when you arrive.",
                  "Self",
                ],
              ].map(([label, desc, val]) => (
                <button
                  key={val}
                  onClick={() => set("packing", val)}
                  style={{
                    padding: "1rem 1.1rem",
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
                      fontWeight: "700",
                      color: d.packing === val ? "#1a3a86" : "#333",
                      marginBottom: "0.3rem",
                      fontSize: "1rem",
                    }}
                  >
                    {d.packing === val ? "✓ " : ""}
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.88rem",
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
              style={{ ...css.btnPrimary, opacity: canNext() ? 1 : 0.4 }}
            >
              Continue →
            </button>
            <BackBtn onBack={back} />
            {s !== "intro" && (
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "0.85rem",
                  borderTop: "1px solid #eef0ff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      color: "#aab4d4",
                      fontSize: "0.72rem",
                      fontWeight: "600",
                    }}
                  >
                    Step {Math.max(step, 1)} of {STEPS.length - 1}
                  </span>
                  <span style={{ color: "#aab4d4", fontSize: "0.72rem" }}>
                    {progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    background: "#eef0ff",
                    borderRadius: "99px",
                  }}
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
            )}
          </div>
        )}

        {/* SERVICE */}
        {s === "service" && (
          <div>
            <h2 style={css.h2}>What type of delivery? ✨</h2>
            <p style={css.sub}>
              Choose how you would like us to deliver your belongings.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {[
                [
                  "Standard delivery",
                  "We unload everything at the entrance or ground floor of your home.",
                  "Standard",
                ],
                [
                  "White Glove — Full service",
                  "We carry everything to each room, unpack boxes, assemble furniture, and remove all packing materials. This is our most complete service.",
                  "White Glove",
                ],
              ].map(([label, desc, val]) => (
                <button
                  key={val}
                  onClick={() => set("service", val)}
                  style={{
                    padding: "1.1rem 1.25rem",
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
                      fontWeight: "800",
                      color: d.service === val ? "#1a3a86" : "#333",
                      fontSize: "1.05rem",
                      marginBottom: "0.35rem",
                    }}
                  >
                    {d.service === val ? "✓ " : ""}
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: "#777",
                      lineHeight: 1.6,
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
              style={{ ...css.btnPrimary, opacity: canNext() ? 1 : 0.4 }}
            >
              Review my request →
            </button>
            <BackBtn onBack={back} />
            {s !== "intro" && (
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "0.85rem",
                  borderTop: "1px solid #eef0ff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      color: "#aab4d4",
                      fontSize: "0.72rem",
                      fontWeight: "600",
                    }}
                  >
                    Step {Math.max(step, 1)} of {STEPS.length - 1}
                  </span>
                  <span style={{ color: "#aab4d4", fontSize: "0.72rem" }}>
                    {progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    background: "#eef0ff",
                    borderRadius: "99px",
                  }}
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
            )}
          </div>
        )}

        {/* REVIEW */}
        {s === "review" && (
          <div>
            <h2 style={css.h2}>Review your information ✅</h2>
            <p style={css.sub}>
              Please check that everything is correct before submitting. You can
              go back to change anything.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1.5rem",
              }}
            >
              {[
                ["👤 Name & phone", `${d.name} — ${d.phone}`],
                [
                  "📅 Move date",
                  d.flexible ? "Flexible (no specific date)" : d.moveDate,
                ],
                ["📍 Pickup", d.originAddr],
                ["🏡 Delivery", `${d.destCity} — ${d.destAddr}`],
                ["🛋️ Items", d.items],
                [
                  "📸 Photos",
                  uploadedPhotos.length > 0
                    ? `${uploadedPhotos.length} photo(s) attached`
                    : "None",
                ],
                ["📦 Packing", d.packing],
                ["✨ Service", d.service],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    padding: "0.7rem 0.9rem",
                    background: "#f8faff",
                    borderRadius: "8px",
                    alignItems: "flex-start",
                    border: "1px solid #eef0ff",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.88rem",
                      minWidth: "120px",
                      color: "#4779db",
                      fontWeight: "700",
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.88rem",
                      color: "#333",
                      lineHeight: 1.5,
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
                  padding: "0.85rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  marginBottom: "0.85rem",
                  lineHeight: 1.6,
                  border: "1px solid #fecaca",
                }}
              >
                {err}
              </div>
            )}
            <button
              onClick={submit}
              disabled={sending}
              style={{
                ...css.btnPrimary,
                opacity: sending ? 0.7 : 1,
                fontSize: "1.15rem",
                padding: "1.1rem",
              }}
            >
              {uploadingPhotos
                ? "📸 Uploading your photos, please wait…"
                : sending
                  ? "⏳ Sending your request…"
                  : "✅ Send my quote request"}
            </button>
            <p
              style={{
                fontSize: "0.82rem",
                color: "#aaa",
                textAlign: "center",
                marginTop: "0.85rem",
                lineHeight: 1.6,
              }}
            >
              Your information is private and will never be shared with anyone.
            </p>
            <BackBtn onBack={back} />
            {s !== "intro" && (
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "0.85rem",
                  borderTop: "1px solid #eef0ff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      color: "#aab4d4",
                      fontSize: "0.72rem",
                      fontWeight: "600",
                    }}
                  >
                    Step {Math.max(step, 1)} of {STEPS.length - 1}
                  </span>
                  <span style={{ color: "#aab4d4", fontSize: "0.72rem" }}>
                    {progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    background: "#eef0ff",
                    borderRadius: "99px",
                  }}
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
