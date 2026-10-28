// Creates (or updates) the Retell LLM + agent that calls leads who skipped the details step.
//
//   RETELL_API_KEY=... VOICE_ID=... WEBHOOK_URL=https://<service>/retell/webhook node retell-setup.mjs
//   add AGENT_ID=... to update that agent (and its LLM) instead of creating new ones.
//
// The prompt is kept short on purpose: it is re-sent on every turn, so every word costs latency and tokens.
// Structured data is pulled out after the call (post_call_analysis_data), not during it.

const { RETELL_API_KEY, VOICE_ID, WEBHOOK_URL, AGENT_ID } = process.env;
const COMPANY_PHONE = process.env.COMPANY_PHONE || "+52 664 388 6256";
if (!RETELL_API_KEY || !VOICE_ID || !WEBHOOK_URL) {
  console.error("RETELL_API_KEY, VOICE_ID and WEBHOOK_URL are required");
  process.exit(1);
}

const PROMPT = `You are Sofia, a friendly coordinator at Arnian Moving, a family company that moves households between the U.S. and Baja California. You are calling {{name}}, who filled out a quote request on our website a few minutes ago: moving from {{from}} to {{to}}, date: {{move_date}}.

Goal: collect what our moving team needs to prepare the quote. A team member will contact them shortly with it.

Opening: you have already said "Hi, is this {{first_name}}?"
- When they answer, give context before any question, in your own words: you're Sofia from Arnian Moving, they sent a quote request on our website a few minutes ago for their move from {{from}} to {{to}}, and you have a few quick questions so the team can put together an accurate quote. Ask if now is a good time.
- If they sound confused at any point, calmly re-explain why you're calling. Never give up after one confused answer.

Never give prices, estimates, discounts, delivery times or promises. If asked, say the team will review everything and send the quote shortly.

Keep it short and easy, about 2–3 minutes. Have a relaxed conversation, not a questionnaire. Cover these, combining them naturally and skipping anything they already mentioned:
1. What kind of place they're moving out of (house or apartment, floor) and into.
2. What they're moving: the main furniture and appliances, roughly. Ask "anything else?" only once.
3. Whether they'd like help packing, and whether they want us to unpack and set things up at the new place.
If the conversation is flowing, you may also ask: any vehicles or very special items, and a rough value for customs. Skip these if they seem busy or unsure.
Never ask for their email or phone, or what's already in the request ({{from}}, {{to}}, {{move_date}}). Email on file: {{email}}. If it is "none", at the very end you may ask once whether they'd like the quote by email.

Style: sound like a real person on the phone: warm, relaxed, brief, one short question per turn. React naturally ("oh nice", "got it", "perfect") and use light fillers now and then. Accept "I'm not sure" happily and move on. Speak English. If they would rather speak Spanish, say a bilingual teammate will call them, ask the best time, and end the call. Only if they directly ask whether you are a person or AI, say honestly that you are Arnian Moving's virtual assistant and keep going.

Time: this call has lasted {{session_duration}}. Once it reaches 7 minutes, wrap up on your next turn whatever is missing: kindly say you don't want to take more of their time, that what they shared is plenty for the team to get started, and that someone will follow up with anything else. Then end the call.

Closing: never recap or list back what they told you. Just say something like "Perfect, that's all I need. Someone from our team will reach out very soon with your quote," thank them and end the call.

If they did not request a quote or ask not to be called, apologize, say they won't be called again, and end the call. If it's a bad time, ask when to call back and end the call. If they want to talk to a person now, give them our number, ${COMPANY_PHONE}.`;


const str = (name, description) => ({ type: "string", name, description });
const ANALYSIS = [
  { type: "system-presets", name: "call_summary", description: "Two or three sentences in Spanish summarizing the move and anything the team must know." },
  { type: "system-presets", name: "user_sentiment" },
  str("origin_address", "Pickup address or area."),
  str("origin_access", "Pickup home type, floor, stairs/elevator and access notes."),
  str("dest_address", "Delivery address or area."),
  str("dest_access", "Delivery floor, stairs/elevator and access notes."),
  str("items", "Main furniture and items, comma separated."),
  str("boxes", "Approximate number of boxes."),
  str("special_items", "Fragile, heavy or high-value items."),
  str("vehicles", "Vehicles, boats, golf carts or motorcycles to move."),
  str("value_usd", "Approximate total value in USD."),
  { type: "enum", name: "packing", description: "Packing service wanted.", choices: ["Full", "Partial", "Self", "Unknown"] },
  { type: "enum", name: "service", description: "Delivery service wanted.", choices: ["Standard", "White Glove", "Unknown"] },
  str("move_date", "Move date or date range, and flexibility."),
  str("storage", "Whether storage is needed and for how long."),
  str("residency_status", "Mexican residency status: temporary resident, permanent resident, tourist, citizen or unknown."),
  str("email", "Customer email if given during the call."),
  str("language", "Language the customer preferred: English or Spanish."),
  str("best_time_to_call", "When the customer prefers to be contacted."),
  str("extra_notes", "Anything else the customer wanted the team to know."),
  { type: "boolean", name: "did_not_request_quote", description: "True if the person says they never asked for a quote or asks not to be called." },
];

async function retell(method, path, body) {
  const res = await fetch(`https://api.retellai.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${RETELL_API_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

const llmBody = {
  model_config: {
    type: "cascading",
    primary: { model: process.env.LLM_MODEL || "gpt-5.4-mini", tier: process.env.LLM_TIER || "fast" },
    temperature: 0.2,
  },
  general_prompt: PROMPT,
  // She speaks first so a missed "hello" can never leave the line silent (reminders only fire after
  // agent speech), but only a short question, after a pause long enough to bring the phone to the ear.
  begin_message: "Hi, is this {{first_name}}?",
  start_speaker: "agent",
  default_dynamic_variables: { first_name: "there", name: "the customer", from: "unknown", to: "unknown", move_date: "not set", email: "none" },
  general_tools: [
    { type: "end_call", name: "end_call", description: "End the call once goodbyes are said, or right away if they did not request a quote." },
  ],
};

const agentBody = {
  agent_name: "Arnian Moving – quote follow-up",
  voice_id: VOICE_ID,
  voice_speed: 1,
  enable_dynamic_voice_speed: true,
  // English only: a single language transcribes better and answers faster than multilingual STT.
  language: "en-US",
  // Barely-there office hum: enough to feel human, not enough to read as noise.
  ambient_sound: "call-center",
  ambient_sound_volume: 0.2,
  handbook_config: { natural_filler_words: true, high_empathy: true },
  // Plain noise cancellation. The "background speech" mode erased a real caller's voice entirely.
  denoising_mode: "noise-cancellation",
  begin_message_delay_ms: 1800,
  // No answer to the greeting: up to two "Hello? Can you hear me?" nudges 6s apart, then the silence timeout ends it.
  reminder_trigger_ms: 6000,
  reminder_max_count: 2,
  webhook_url: WEBHOOK_URL,
  webhook_events: ["call_analyzed"],
  post_call_analysis_data: ANALYSIS,
  post_call_analysis_model: process.env.ANALYSIS_MODEL || "gpt-4.1-mini",
  voicemail_option: {
    action: {
      type: "static_text",
      text: `Hi, this is Arnian Moving about the quote you requested. We'll try you again later, or call us at ${COMPANY_PHONE}. Thanks!`,
    },
  },
  ivr_option: { action: { type: "hangup" } },
  responsiveness: 1,
  // Low enough that a "yeah" or "uh-huh" while she talks doesn't cut her off mid-sentence.
  interruption_sensitivity: 0.45,
  // Dynamic mode waited up to ~2.5s on hesitant speakers; a fixed fast turn-taking feels snappier.
  enable_dynamic_responsiveness: false,
  end_call_after_silence_ms: 20000,
  // The prompt wraps up kindly at 7 minutes; this is only the hard stop if that ever fails.
  max_call_duration_ms: 8 * 60 * 1000,
  ring_duration_ms: 30000,
};

let agent;
if (AGENT_ID) {
  // Published versions are frozen: edit the draft (making one from the latest version if needed),
  // including the draft's own LLM version, then publish it. The response engine itself can't change.
  agent = await retell("GET", `/get-agent/${AGENT_ID}`);
  if (agent.is_published) agent = await retell("POST", `/create-agent-version/${AGENT_ID}`, { base_version: agent.version });
  const { llm_id, version } = agent.response_engine;
  await retell("PATCH", `/update-retell-llm/${llm_id}?version=${version}`, llmBody);
  console.log("llm_id:", llm_id, "version:", version);
  agent = await retell("PATCH", `/update-agent/${AGENT_ID}`, agentBody);
} else {
  const llm = await retell("POST", "/create-retell-llm", llmBody);
  console.log("llm_id:", llm.llm_id);
  agent = await retell("POST", "/create-agent", { ...agentBody, response_engine: { type: "retell-llm", llm_id: llm.llm_id } });
}
console.log("agent_id:", agent.agent_id);

// Calls use "latest_published", so nothing goes live until this runs.
await retell("POST", `/publish-agent-version/${agent.agent_id}`, { version: agent.version });
console.log("published version:", agent.version);
