// ===== 1) Parse JSON body safely =====
let body;
try {
  body = pm.response.json();
} catch {
  body = {};
}

const traces = Array.isArray(body.messageTraces) ? body.messageTraces : [];

// ===== 2) Extract distinct channels =====
const channelsMap = {};
traces.forEach(t => {
  const code = t.channelCode || "N/A";
  const id = t.channelID || "N/A";
  if (!channelsMap[code]) channelsMap[code] = id;
});
const channels = Object.entries(channelsMap).map(([code, id]) => ({ code, id }));

// ===== 3) Channel → Emoji map =====
const channelEmojis = {
  "SUPPLY_HILTON": "🏨",
  "SUPPLY_EAN": "🌎",
  "SUPPLY_HOTELBEDS": "🛏️",
  "SUPPLY_DERBYSOFT": "🎯",
  "DERBYSOFT_SUPPLY": "🎯",
  "DERBYSOFT_SUPPLY_SEAMLESS": "♾️",
  "SUPPLY_HBSI": "🛰️",
  "SUPPLY_EMERGING": "🚀",
  "SUPPLY_BONOTEL": "🧳",
  "SUPPLY_AGODA": "💼",
  "SUPPLY_BOOKING": "📘",
  "SUPPLY_TRAVELCLICK": "🕹️",
  "SUPPLY_RATEGAIN": "📡",
  "SUPPLY_SITEMINDER": "🔗",
  "SUPPLY_EXPEDIA": "🌀",
  "SUPPLY_TEST": "⚙️",
  "N/A": "❓"
};

// ===== 4) Helper: pretty-print JSON =====
function safePretty(val) {
  try {
    if (val == null) return "∅";
    if (typeof val === "string") return JSON.stringify(JSON.parse(val.trim()), null, 2);
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
  } catch {
    return String(val);
  }
}

// ===== 5) Build rows =====
const rows = traces.map(t => {
  const emoji = channelEmojis[t.channelCode] || "❔";

  // 🧾 Try to extract firstName from messageData.contactPerson.firstName
  let firstName = "";
  try {
    const msg = typeof t.messageData === "string" ? JSON.parse(t.messageData) : t.messageData;
    firstName = msg?.contactPerson?.firstName || "";
  } catch {
    firstName = "";
  }

  const fkRef = t.fkReference || "N/A";
  const fkRefWithName = firstName ? `${fkRef}(${firstName})` : fkRef;

  return {
    timestamp: t.timestamp || "N/A",
    direction: `${emoji} ${t.direction || "N/A"}`,
    messageType: t.messageType || "N/A",
    fkReference: fkRefWithName,
    messageDataPretty: safePretty(t.messageData)
  };
});

// ===== 6) Template with Channels + Message Traces =====
const template = `
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#111; background:#fff; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
  th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 10px; vertical-align: top; text-align: left; }
  th { font-size: 12px; color: #666; text-transform: uppercase; background:#fafafa; }
  details { margin: 4px 0; }
  summary { cursor: pointer; font-weight: 600; }
  pre { background: #0b1020; color: #e5e7eb; border-radius: 8px; padding: 10px; overflow: auto; font-size: 12px; }
  .muted { font-size:12px; color:#666; margin:8px 0 12px; }
  h2 { margin-top: 0; }
</style>

<h2>📡 Channels (<span style="color:#888;">{{channels.length}}</span>)</h2>
{{#if channels.length}}
<table>
  <thead>
    <tr>
      <th>Channel Code</th>
      <th>Channel ID</th>
    </tr>
  </thead>
  <tbody>
    {{#each channels}}
      <tr>
        <td>{{lookup ../channelEmojis code}} {{code}}</td>
        <td><code>{{id}}</code></td>
      </tr>
    {{/each}}
  </tbody>
</table>
{{else}}
<p class="muted">No channels found in messageTraces.</p>
{{/if}}

<h2>📜 Message Traces (<span style="color:#888;">{{rows.length}}</span>)</h2>
<div class="muted">Expand <b>messageData</b> below to view parsed JSON content.</div>

<table>
  <thead>
    <tr>
      <th>Timestamp</th>
      <th>Direction</th>
      <th>Message Type</th>
      <th>fkReference</th>
      <th>messageData</th>
    </tr>
  </thead>
  <tbody>
    {{#if rows.length}}
      {{#each rows}}
        <tr>
          <td><code>{{timestamp}}</code></td>
          <td>{{direction}}</td>
          <td>{{messageType}}</td>
          <td>{{fkReference}}</td>
          <td>
            <details>
              <summary>Show parsed messageData</summary>
              <pre>{{{messageDataPretty}}}</pre>
            </details>
          </td>
        </tr>
      {{/each}}
    {{else}}
      <tr><td colspan="5">No <code>messageTraces</code> found in response.</td></tr>
    {{/if}}
  </tbody>
</table>
`;

// ===== 7) Render =====
pm.visualizer.set(template, { rows, channels, channelEmojis });


