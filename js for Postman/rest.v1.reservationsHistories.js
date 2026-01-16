/**
 * Postman Visualizer: Delta/Patch Explorer (FULL APP)
 *
 * ✅ Extract patch ops (objects with {op, path, fromValue?, value?}) ordered by appearance
 * ✅ Enrich each op with reservationHistory context: lastModified + lastModifiedByID
 * ✅ Filters:
 *    - Multi-select PATH filter
 *    - Multi-select lastModifiedByID filter
 *    - Path substring search
 * ✅ Grouping modes:
 *    - Strict: op + path + fromValue + value
 *    - Loose:  op + path
 * ✅ Diff-session grouping:
 *    - Toggle: group ops into sessions where lastModified is same (change batch)
 * ✅ lastModified time buckets:
 *    - Toggle: group sessions/ops into time buckets (hour/day/week)
 * ✅ Resolve lastModifiedByID to user names (editable mapping JSON in UI)
 * ✅ Counts histogram per path (moved to bottom)
 *
 * Paste into: Tests -> Visualizer
 */

const raw = pm.response.json();

/* -----------------------------
 * Utils
 * ----------------------------- */
function isObject(x) { return x && typeof x === "object" && !Array.isArray(x); }

function deepWalk(root, visit) {
  const stack = [{ value: root, pointer: "$" }];
  let seq = 0;
  while (stack.length) {
    const cur = stack.pop();
    const value = cur.value;
    const pointer = cur.pointer;

    visit(value, pointer, seq++);

    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) {
        stack.push({ value: value[i], pointer: pointer + "[" + i + "]" });
      }
    } else if (isObject(value)) {
      const keys = Object.keys(value);
      for (let i = keys.length - 1; i >= 0; i--) {
        const k = keys[i];
        stack.push({ value: value[k], pointer: pointer + "." + k });
      }
    }
  }
}

function looksLikePatchOp(o) {
  return isObject(o) && typeof o.op === "string" && typeof o.path === "string";
}

function safeStr(x) {
  if (x === null) return "null";
  if (x === undefined) return "undefined";
  if (typeof x === "string") return x;
  try { return JSON.stringify(x); } catch (e) { return String(x); }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* -----------------------------
 * Context enrichment (reservationHistory[x])
 * ----------------------------- */
function extractReservationContext(pointer, root) {
  // Example pointer: $.reservationsHistories[0].deltaHistory[5]
  const m = pointer.match(/reservationsHistories\[(\d+)\]/);
  if (!m) return {};
  const idx = Number(m[1]);
  const rh = root?.reservationsHistories?.[idx];
  if (!rh) return {};
  return {
    lastModified: rh.lastModified,
    lastModifiedByID: rh.lastModifiedByID
  };
}

/* -----------------------------
 * Parse lastModified into Date
 * Input: "2025-12-27T21:11:26.014+0000"
 * ----------------------------- */
function parseOhipDate(s) {
  if (!s || typeof s !== "string") return null;
  // Convert +0000 to +00:00 for Date parsing
  const fixed = s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const d = new Date(fixed);
  return isNaN(d.getTime()) ? null : d;
}

function pad2(n) { return (n < 10 ? "0" : "") + n; }

function bucketKey(date, bucketType) {
  if (!date) return "(no lastModified)";
  const y = date.getUTCFullYear();
  const m = pad2(date.getUTCMonth() + 1);
  const d = pad2(date.getUTCDate());
  const hh = pad2(date.getUTCHours());

  if (bucketType === "hour") return `${y}-${m}-${d} ${hh}:00Z`;
  if (bucketType === "day")  return `${y}-${m}-${d}Z`;
  if (bucketType === "week") {
    // ISO-ish week start (Monday) in UTC
    const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = tmp.getUTCDay(); // 0 Sun..6 Sat
    const diffToMon = (day === 0 ? -6 : 1 - day);
    tmp.setUTCDate(tmp.getUTCDate() + diffToMon);
    const yy = tmp.getUTCFullYear();
    const mm = pad2(tmp.getUTCMonth() + 1);
    const dd = pad2(tmp.getUTCDate());
    return `Week of ${yy}-${mm}-${dd}Z`;
  }
  return "(no bucket)";
}

/* -----------------------------
 * Signature grouping
 * ----------------------------- */
function sigStrict(p) {
  return [
    (p.op || "").toUpperCase(),
    p.path || "",
    safeStr(p.fromValue),
    safeStr(p.value)
  ].join(" | ");
}
function sigLoose(p) {
  return [
    (p.op || "").toUpperCase(),
    p.path || ""
  ].join(" | ");
}

/* -----------------------------
 * Extract ops (appearance order)
 * ----------------------------- */
const allFound = [];
deepWalk(raw, (val, pointer, seq) => {
  if (!looksLikePatchOp(val)) return;

  const ctx = extractReservationContext(pointer, raw);
  const lm = ctx.lastModified;
  const d = parseOhipDate(lm);

  allFound.push({
    seq,
    pointer,
    op: val.op,
    path: val.path,
    fromValue: val.fromValue,
    value: val.value,
    lastModified: lm,
    lastModifiedDateMs: d ? d.getTime() : null,
    lastModifiedByID: ctx.lastModifiedByID
  });
});
allFound.sort((a, b) => a.seq - b.seq);

/* -----------------------------
 * Distinct paths + counts
 * ----------------------------- */
const pathCounts = {};
const pathOrder = [];
const seenPath = new Set();
for (const it of allFound) {
  const p = it.path || "";
  pathCounts[p] = (pathCounts[p] || 0) + 1;
  if (!seenPath.has(p)) { seenPath.add(p); pathOrder.push(p); }
}
const maxPathCount = Math.max(1, ...Object.values(pathCounts));

const optionsPathHtml =
  pathOrder.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)} (${pathCounts[p] || 0})</option>`).join("");

const histogramHtml =
  pathOrder.map(p => {
    const c = pathCounts[p] || 0;
    const w = Math.round((c / maxPathCount) * 100);
    return `
      <div class="barRow" title="${escapeHtml(p)}: ${c}">
        <div class="barLabel">${escapeHtml(p)}</div>
        <div class="barTrack"><div class="barFill" style="width:${w}%"></div></div>
        <div class="barNum">${c}</div>
      </div>
    `;
  }).join("");

/* -----------------------------
 * Distinct lastModifiedByID + counts (for filter)
 * ----------------------------- */
const byCounts = {};
const byOrder = [];
const seenBy = new Set();
for (const it of allFound) {
  const id = it.lastModifiedByID || "(null)";
  byCounts[id] = (byCounts[id] || 0) + 1;
  if (!seenBy.has(id)) { seenBy.add(id); byOrder.push(id); }
}
const optionsByHtml =
  byOrder.map(id => `<option value="${escapeHtml(id)}">${escapeHtml(id)} (${byCounts[id] || 0})</option>`).join("");

/* -----------------------------
 * Template
 * ----------------------------- */
const template = `
<style>
  :root { --border:#e2e8f0; --muted:#64748b; --text:#0f172a; --bg:#ffffff; }
  body { font-family: Inter, Arial, sans-serif; color: var(--text); background: var(--bg); margin: 0; }
  .wrap { padding: 14px 16px 18px; }
  .top { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom: 10px; }
  .title { font-size: 18px; font-weight: 800; }
  .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .panel { border:1px solid var(--border); border-radius: 14px; padding: 12px; }
  .card { border:1px solid var(--border); border-radius: 14px; padding: 12px; }
  .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .rowTop { display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; }
  .pill { display:inline-flex; align-items:center; gap:8px; padding:4px 8px; border-radius: 999px; border:1px solid var(--border); font-size: 11px; }
  .small { font-size: 11px; color: var(--muted); }
  .k { color:#94a3b8; font-size: 11px; }
  code { background:#f1f5f9; padding: 1px 5px; border-radius: 6px; font-size: 11px; }
  pre { background:#0b1220; color:#e5e7eb; padding:10px; border-radius: 12px; overflow:auto; font-size: 11px; line-height: 1.35; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border-top: 1px solid var(--border); padding: 8px; font-size: 12px; vertical-align: top; }
  th { text-align: left; font-size: 12px; color: #334155; background: #f8fafc; position: sticky; top: 0; }
  select, input, textarea {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 12px;
    outline: none;
    background: white;
  }
  textarea { width: 520px; min-height: 110px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; }
  .btn {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 12px;
    cursor: pointer;
    background: white;
  }
  .btn.primary { background:#0f172a; color:white; border-color:#0f172a; }
  .btn:disabled { opacity:.6; cursor:not-allowed; }

  /* Histogram */
  .barRow { display:grid; grid-template-columns: 1fr 220px 44px; gap:10px; align-items:center; padding:6px 0; border-top:1px solid var(--border); }
  .barLabel { font-size: 11px; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .barTrack { height: 10px; border-radius: 999px; background:#f1f5f9; overflow:hidden; border:1px solid var(--border); }
  .barFill { height: 100%; background:#64748b; }
  .barNum { font-size: 11px; text-align:right; color:#0f172a; }

  .twoCol { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
  .tag { display:inline-flex; align-items:center; border:1px solid var(--border); border-radius:999px; padding:2px 8px; font-size:11px; color:#0f172a; background:#fff; }
</style>

<div class="wrap">
  <div class="top">
    <div>
      <div class="title">Delta/Patch Explorer</div>
      <div class="sub">Path + lastModifiedByID filters · Diff sessions · Time buckets · Name resolution · Grouping modes</div>
    </div>
    <div class="row">
      <span class="pill"><b id="countOps">${allFound.length}</b> ops</span>
      <span class="pill"><b id="countShown">0</b> shown</span>
      <span class="pill"><b id="countGroups">0</b> groups</span>
      <span class="pill"><b id="countSessions">0</b> sessions</span>
    </div>
  </div>

  <div class="panel">

    <div class="rowTop" style="justify-content:space-between;">
      <div class="rowTop">
        <div>
          <div class="small">Filter by path (multi-select)</div>
          <select id="pathSelect" multiple size="6" style="min-width:360px">${optionsPathHtml}</select>
          <div class="small" style="margin-top:6px">Tip: Cmd/Ctrl-click for multiple</div>
        </div>

        <div>
          <div class="small">Filter by lastModifiedByID (multi-select)</div>
          <select id="bySelect" multiple size="6" style="min-width:420px">${optionsByHtml}</select>
          <div class="small" style="margin-top:6px">IDs resolved to names via mapping below</div>
        </div>

        <div>
          <div class="small">Path substring search</div>
          <input id="pathSearch" placeholder="e.g. /lastModified" style="min-width:220px"/>
          <div style="margin-top:10px" class="row">
            <label class="small" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="looseGrouping"/>
              Group by <code>op + path</code> only
            </label>
          </div>
          <div style="margin-top:6px" class="row">
            <label class="small" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="groupBySession"/>
              Group by diff session (<code>same lastModified</code>)
            </label>
          </div>
          <div style="margin-top:6px" class="row">
            <label class="small" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="groupByBucket"/>
              Group by time bucket
            </label>
            <select id="bucketType">
              <option value="hour">Hour</option>
              <option value="day" selected>Day</option>
              <option value="week">Week</option>
            </select>
          </div>
          <div style="margin-top:6px" class="row">
            <label class="small" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="sortByTime"/>
              Sort sessions/ops by lastModified time (desc)
            </label>
          </div>
        </div>
      </div>

      <div class="row" style="align-items:flex-start;">
        <button class="btn" id="clearBtn">Clear</button>
        <button class="btn primary" id="copyFiltered">Copy filtered raw JSON</button>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <div style="font-weight:900;font-size:14px;">Resolve lastModifiedByID → User name</div>
      <div class="small">Paste JSON mapping below. Example: <code>{"5b56...":"John Doe","caf3...":"System"}</code></div>
      <div class="row" style="margin-top:10px; align-items:flex-start;">
        <textarea id="idMap" class="mono">{}</textarea>
        <div>
          <button class="btn primary" id="applyMap">Apply map</button>
          <div class="small" style="margin-top:8px">Tip: Keep this mapping in your Postman collection docs for reuse.</div>
          <div class="small" style="margin-top:8px">Current status: <span id="mapStatus" class="tag">not applied</span></div>
        </div>
      </div>
    </div>

    <div style="margin-top:12px;" class="card">
      <div style="font-weight:900;font-size:14px;">Results</div>
      <div class="small">Depending on toggles, view is grouped by: buckets → sessions → signatures</div>
      <div style="margin-top:10px; overflow:auto; max-height: 520px;">
        <table>
          <thead>
            <tr>
              <th style="width:60px;">#</th>
              <th>Group / Session / Signature</th>
              <th style="width:90px;">Count</th>
              <th style="width:260px;">Occurrences</th>
            </tr>
          </thead>
          <tbody id="groupsBody"></tbody>
        </table>
      </div>
    </div>

    <div style="margin-top:12px;" class="card">
      <div style="font-weight:800;margin-bottom:6px;">Raw list (ordered by appearance)</div>
      <pre id="rawPre"></pre>
    </div>

    <!-- Moved to bottom -->
    <div class="card" style="margin-top:12px">
      <div style="font-weight:900;font-size:14px;">Counts per path</div>
      <div class="small">Histogram from full dataset (not affected by filters)</div>
      <div style="margin-top:10px">${histogramHtml}</div>
    </div>
  </div>
</div>

<script>
  const ALL = ${JSON.stringify(allFound)};

  function safeStr(x){
    if (x === null) return "null";
    if (x === undefined) return "undefined";
    if (typeof x === "string") return x;
    try { return JSON.stringify(x); } catch (e) { return String(x); }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function sigStrict(p){
    return [(p.op||"").toUpperCase(), p.path||"", safeStr(p.fromValue), safeStr(p.value)].join(" | ");
  }
  function sigLoose(p){
    return [(p.op||"").toUpperCase(), p.path||""].join(" | ");
  }

  function parseDateMs(s, fallbackMs){
    if (!s) return fallbackMs ?? null;
    // "+0000" -> "+00:00"
    const fixed = String(s).replace(/([+-]\\d{2})(\\d{2})$/, "$1:$2");
    const d = new Date(fixed);
    const ms = d.getTime();
    return isNaN(ms) ? (fallbackMs ?? null) : ms;
  }

  function pad2(n){ return (n < 10 ? "0" : "") + n; }

  function bucketKeyFromMs(ms, type){
    if (!ms) return "(no lastModified)";
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = pad2(d.getUTCMonth() + 1);
    const day = pad2(d.getUTCDate());
    const hh = pad2(d.getUTCHours());

    if (type === "hour") return y + "-" + m + "-" + day + " " + hh + ":00Z";
    if (type === "day")  return y + "-" + m + "-" + day + "Z";
    if (type === "week") {
      const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const dow = tmp.getUTCDay(); // 0..6
      const diffToMon = (dow === 0 ? -6 : 1 - dow);
      tmp.setUTCDate(tmp.getUTCDate() + diffToMon);
      const yy = tmp.getUTCFullYear();
      const mm = pad2(tmp.getUTCMonth() + 1);
      const dd = pad2(tmp.getUTCDate());
      return "Week of " + yy + "-" + mm + "-" + dd + "Z";
    }
    return "(no bucket)";
  }

  function getSelectedValues(selectElId){
    const sel = document.getElementById(selectElId);
    const out = [];
    for (const opt of sel.options){
      if (opt.selected) out.push(opt.value);
    }
    return out;
  }

  // Editable ID->Name map
  let idToName = {};
  function resolveName(id){
    const key = id || "(null)";
    return idToName[key] || idToName[id] || id || "(null)";
  }

  function groupSignatures(items, loose){
    const groups = [];
    const map = new Map();
    for (const it of items){
      const key = loose ? sigLoose(it) : sigStrict(it);
      if (!map.has(key)){
        const g = {
          key,
          op: it.op,
          path: it.path,
          fromValue: it.fromValue,
          value: it.value,
          lastModified: it.lastModified,
          lastModifiedByID: it.lastModifiedByID,
          firstSeq: it.seq,
          items: []
        };
        map.set(key, g);
        groups.push(g);
      }
      map.get(key).items.push(it);
    }
    // preserve first appearance order within this scope
    groups.sort((a,b) => a.firstSeq - b.firstSeq);
    return groups;
  }

  function groupBySession(items){
    // Session key = lastModified (exact string)
    const sessions = [];
    const map = new Map();
    for (const it of items){
      const key = it.lastModified || "(no lastModified)";
      if (!map.has(key)){
        const s = {
          key,
          lastModified: it.lastModified,
          lastModifiedMs: it.lastModifiedDateMs || parseDateMs(it.lastModified, null),
          lastModifiedByID: it.lastModifiedByID,
          firstSeq: it.seq,
          items: []
        };
        map.set(key, s);
        sessions.push(s);
      }
      map.get(key).items.push(it);
    }
    // default: appearance order
    sessions.sort((a,b) => a.firstSeq - b.firstSeq);
    return sessions;
  }

  function groupByBucket(sessions, bucketType){
    const buckets = [];
    const map = new Map();
    for (const s of sessions){
      const k = bucketKeyFromMs(s.lastModifiedMs, bucketType);
      if (!map.has(k)){
        const b = { key: k, sessions: [], firstMs: s.lastModifiedMs ?? null, firstSeq: s.firstSeq };
        map.set(k, b);
        buckets.push(b);
      }
      const b = map.get(k);
      b.sessions.push(s);
      if (b.firstMs == null && s.lastModifiedMs != null) b.firstMs = s.lastModifiedMs;
      b.firstSeq = Math.min(b.firstSeq, s.firstSeq);
    }
    // default: appearance order
    buckets.sort((a,b) => a.firstSeq - b.firstSeq);
    return buckets;
  }

  function sortSessionsOrOps(list, enabled){
    if (!enabled) return list;
    // Desc by time, fallback to appearance
    return list.slice().sort((a,b) => {
      const am = (a.lastModifiedMs != null) ? a.lastModifiedMs : -Infinity;
      const bm = (b.lastModifiedMs != null) ? b.lastModifiedMs : -Infinity;
      if (bm !== am) return bm - am;
      return a.firstSeq - b.firstSeq;
    });
  }

  function applyFilters(){
    const selectedPaths = getSelectedValues("pathSelect");
    const selectedBy = getSelectedValues("bySelect");
    const q = document.getElementById("pathSearch").value.trim().toLowerCase();

    let filtered = ALL;

    if (selectedPaths.length){
      const set = new Set(selectedPaths);
      filtered = filtered.filter(x => set.has(x.path || ""));
    }
    if (selectedBy.length){
      const set = new Set(selectedBy);
      filtered = filtered.filter(x => set.has(x.lastModifiedByID || "(null)"));
    }
    if (q){
      filtered = filtered.filter(x => (x.path || "").toLowerCase().includes(q));
    }

    document.getElementById("countShown").textContent = filtered.length;
    return filtered;
  }

  function render(){
    const loose = document.getElementById("looseGrouping").checked;
    const groupSession = document.getElementById("groupBySession").checked;
    const groupBucket = document.getElementById("groupByBucket").checked;
    const bucketType = document.getElementById("bucketType").value;
    const sortByTime = document.getElementById("sortByTime").checked;

    const filtered = applyFilters();

    // Raw panel always = filtered ops in appearance order
    document.getElementById("rawPre").textContent = JSON.stringify(filtered, null, 2);

    // Build view structure:
    // If groupSession: sessions = groupBySession(filtered)
    // Else: sessions = [{key:"(no session)", items: filtered}]
    let sessions = [];
    if (groupSession){
      sessions = groupBySession(filtered);
    } else {
      sessions = [{
        key: "(no session)",
        lastModified: null,
        lastModifiedMs: null,
        lastModifiedByID: null,
        firstSeq: filtered.length ? filtered[0].seq : 0,
        items: filtered
      }];
    }

    sessions = sortSessionsOrOps(sessions, sortByTime);
    document.getElementById("countSessions").textContent = groupSession ? sessions.length : (filtered.length ? 1 : 0);

    // Bucket grouping sits above sessions (if enabled)
    let buckets = null;
    if (groupBucket) {
      buckets = groupByBucket(sessions, bucketType);
      // sort buckets by time (desc) if requested
      if (sortByTime) {
        buckets = buckets.slice().sort((a,b) => {
          const am = (a.firstMs != null) ? a.firstMs : -Infinity;
          const bm = (b.firstMs != null) ? b.firstMs : -Infinity;
          if (bm !== am) return bm - am;
          return a.firstSeq - b.firstSeq;
        });
      }
    }

    // Render rows
    const rows = [];

    function pushHeaderRow(label, count, metaHtml) {
      rows.push(
        "<tr>" +
          "<td class='mono'>—</td>" +
          "<td><div style='font-weight:900'>" + escapeHtml(label) + "</div>" +
          (metaHtml ? "<div class='small' style='margin-top:4px'>" + metaHtml + "</div>" : "") +
          "</td>" +
          "<td><b>" + count + "</b></td>" +
          "<td><span class='small'>—</span></td>" +
        "</tr>"
      );
    }

    function renderSignatureGroups(items) {
      const groups = groupSignatures(items, loose);
      for (let i = 0; i < groups.length; i++){
        const g = groups[i];
        const occ = g.items.map(it => "<span class='pill' title='" + escapeHtml(it.pointer) + "'>seq:" + it.seq + "</span>").join(" ");
        const who = resolveName(g.lastModifiedByID || "(null)");
        const lm = g.lastModified || "(no lastModified)";

        const fromTo = loose ? "" :
          "<div style='margin-top:4px'><span class='k'>from</span> <code>" + escapeHtml(g.fromValue) + "</code></div>" +
          "<div style='margin-top:4px'><span class='k'>to</span> <code>" + escapeHtml(g.value) + "</code></div>";

        rows.push(
          "<tr>" +
            "<td>" + (i + 1) + "</td>" +
            "<td>" +
              "<div><span class='k'>op</span> <code>" + escapeHtml(g.op) + "</code> &nbsp; " +
              "<span class='k'>path</span> <code>" + escapeHtml(g.path) + "</code></div>" +
              fromTo +
              "<div style='margin-top:4px'><span class='k'>lastModified</span> <code>" + escapeHtml(lm) + "</code></div>" +
              "<div style='margin-top:4px'><span class='k'>lastModifiedBy</span> <code>" + escapeHtml(who) + "</code></div>" +
            "</td>" +
            "<td><b>" + g.items.length + "</b></td>" +
            "<td>" + (occ || "<span class='small'>—</span>") + "</td>" +
          "</tr>"
        );
      }
      return groups.length;
    }

    let totalGroupsRendered = 0;

    if (buckets) {
      // buckets -> sessions -> signatures
      for (const b of buckets) {
        const totalOpsInBucket = b.sessions.reduce((sum, s) => sum + (s.items ? s.items.length : 0), 0);
        pushHeaderRow("🕒 " + b.key, totalOpsInBucket, "Bucket type: <code>" + escapeHtml(bucketType) + "</code>");

        for (const s of b.sessions) {
          const sessionLabel = groupSession ? ("🧬 Session: " + (s.lastModified || "(no lastModified)")) : "(no session)";
          const who = resolveName(s.lastModifiedByID || "(null)");
          const meta = (groupSession
            ? ("By: <code>" + escapeHtml(who) + "</code>")
            : ""
          );

          pushHeaderRow(sessionLabel, s.items.length, meta);
          totalGroupsRendered += renderSignatureGroups(s.items);
        }
      }
    } else {
      // sessions -> signatures
      for (const s of sessions) {
        if (groupSession) {
          const who = resolveName(s.lastModifiedByID || "(null)");
          pushHeaderRow("🧬 Session: " + (s.lastModified || "(no lastModified)"), s.items.length, "By: <code>" + escapeHtml(who) + "</code>");
        }
        totalGroupsRendered += renderSignatureGroups(s.items);
      }
    }

    document.getElementById("countGroups").textContent = totalGroupsRendered;
    document.getElementById("groupsBody").innerHTML = rows.join("");
  }

  // Mapping apply
  document.getElementById("applyMap").onclick = function(){
    const el = document.getElementById("idMap");
    const status = document.getElementById("mapStatus");
    try {
      const obj = JSON.parse(el.value || "{}");
      if (!obj || typeof obj !== "object") throw new Error("Map must be an object");
      idToName = obj;
      status.textContent = "applied";
      render();
    } catch (e) {
      status.textContent = "invalid JSON";
      alert("Invalid JSON mapping: " + e.message);
    }
  };

  // Filters / toggles
  document.getElementById("pathSelect").addEventListener("change", render);
  document.getElementById("bySelect").addEventListener("change", render);
  document.getElementById("pathSearch").addEventListener("input", render);

  document.getElementById("looseGrouping").addEventListener("change", render);
  document.getElementById("groupBySession").addEventListener("change", render);
  document.getElementById("groupByBucket").addEventListener("change", render);
  document.getElementById("bucketType").addEventListener("change", render);
  document.getElementById("sortByTime").addEventListener("change", render);

  document.getElementById("clearBtn").onclick = function(){
    // clear path multi-select
    const ps = document.getElementById("pathSelect");
    for (const opt of ps.options) opt.selected = false;

    // clear by multi-select
    const bs = document.getElementById("bySelect");
    for (const opt of bs.options) opt.selected = false;

    document.getElementById("pathSearch").value = "";
    document.getElementById("looseGrouping").checked = false;
    document.getElementById("groupBySession").checked = false;
    document.getElementById("groupByBucket").checked = false;
    document.getElementById("bucketType").value = "day";
    document.getElementById("sortByTime").checked = false;

    render();
  };

  document.getElementById("copyFiltered").onclick = function(){
    // copy raw filtered JSON (same as Raw panel)
    const selectedPaths = getSelectedValues("pathSelect");
    const selectedBy = getSelectedValues("bySelect");
    const q = document.getElementById("pathSearch").value.trim().toLowerCase();

    let filtered = ALL;
    if (selectedPaths.length) {
      const set = new Set(selectedPaths);
      filtered = filtered.filter(x => set.has(x.path || ""));
    }
    if (selectedBy.length) {
      const set = new Set(selectedBy);
      filtered = filtered.filter(x => set.has(x.lastModifiedByID || "(null)"));
    }
    if (q) filtered = filtered.filter(x => (x.path || "").toLowerCase().includes(q));

    const text = JSON.stringify(filtered, null, 2);
    try {
      navigator.clipboard.writeText(text);
      alert("Copied filtered raw JSON to clipboard.");
    } catch (e) {
      alert("Clipboard copy may be blocked. Copy from the Raw list panel instead.");
    }
  };

  // initial
  document.getElementById("countShown").textContent = ALL.length;
  render();
</script>
`;

pm.visualizer.set(template);
