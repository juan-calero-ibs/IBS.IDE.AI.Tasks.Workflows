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

// ===== 4) Helpers: detect + pretty JSON/XML =====
function looksLikeXml(str) {
  if (typeof str !== "string") return false;
  const s = str.trim();
  // basic heuristics: starts with "<", contains a closing tag or xml prolog
  return s.startsWith("<") && (s.includes("</") || s.startsWith("<?xml"));
}

function looksLikeJson(str) {
  if (typeof str !== "string") return false;
  const s = str.trim();
  return (s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"));
}

function formatXml(xml) {
  try {
    const s = String(xml ?? "").trim();
    if (!s) return "∅";

    // Minify-ish first (remove whitespace between tags) to normalize
    const normalized = s.replace(/>\s+</g, "><");

    // Indent by splitting on tag boundaries
    const tokens = normalized.replace(/</g, "\n<").split("\n").filter(Boolean);

    let indent = 0;
    const out = tokens.map(line => {
      const l = line.trim();

      // Decrease indent on closing tags
      if (/^<\/.+>/.test(l)) indent = Math.max(indent - 1, 0);

      const padded = "  ".repeat(indent) + l;

      // Increase indent on opening tags that are not self-closing and not xml declaration
      if (
        /^<[^!?\/][^>]*?>$/.test(l) &&   // opening tag
        !/\/>$/.test(l) &&               // not self-closing
        !/^<\?xml/.test(l)               // not prolog
      ) {
        indent += 1;
      }

      return padded;
    });

    return out.join("\n");
  } catch {
    return String(xml);
  }
}

function safePretty(val) {
  try {
    if (val == null) return "∅";

    // If it's already an object (JSON), pretty it
    if (typeof val === "object") {
      return JSON.stringify(val, null, 2);
    }

    // It's a string: decide JSON vs XML vs plain text
    const s = String(val).trim();
    if (!s) return "∅";

    if (looksLikeJson(s)) {
      return JSON.stringify(JSON.parse(s), null, 2);
    }

    if (looksLikeXml(s)) {
      return formatXml(s);
    }

    // Fallback: return as-is
    return s;
  } catch {
    return String(val);
  }
}

// Extract firstName safely from messageData IF JSON.
// If XML, we'll leave firstName blank unless you later want XML parsing.
function extractFirstName(messageData) {
  try {
    if (messageData == null) return "";

    if (typeof messageData === "object") {
      return messageData?.contactPerson?.firstName || "";
    }

    const s = String(messageData).trim();
    if (looksLikeJson(s)) {
      const msg = JSON.parse(s);
      return msg?.contactPerson?.firstName || "";
    }

    // XML or unknown format: don't guess (no XML parser here)
    return "";
  } catch {
    return "";
  }
}

// ===== 5) Build rows =====
const rows = traces.map(t => {
  const emoji = channelEmojis[t.channelCode] || "❔";

  const firstName = extractFirstName(t.messageData);

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
  pre { background: #0b1020; color: #e5e7eb; border-radius: 8px; padding: 10px; overflow: auto; font-size: 12px; white-space: pre; }
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
<div class="muted">Expand <b>messageData</b> below to view parsed JSON/XML content.</div>

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
              <summary>Show formatted messageData</summary>
              <pre>{{messageDataPretty}}</pre>
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
