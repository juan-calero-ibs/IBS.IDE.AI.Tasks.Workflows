// ✅ Postman Visualizer — Channel Parameters (grouped + searchable + JSON viewer)
// Put this in the **Tests** tab (or Pre-request if you prefer), then open **Visualize**.

let data = {};
try { data = pm.response.json() || {}; } catch (e) { data = {}; }

const rows = Array.isArray(data.channelParameters) ? data.channelParameters : [];

// ---------- helpers ----------
const esc = (v) => {
  const s = (v === null || v === undefined) ? "" : String(v);
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
};

const fmt = (v) => (v === null || v === undefined || v === "") ? "—" : String(v);

const parseMaybeJSON = (val) => {
  if (typeof val !== "string") return null;
  const t = val.trim();
  if (!t) return null;
  if (!(t.startsWith("{") || t.startsWith("[") || t.startsWith("\""))) return null;
  try { return JSON.parse(t); } catch (e) { return null; }
};

const safeStringify = (obj) => {
  try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); }
};

const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

const toDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

// ---------- derive summary ----------
const channelIds = uniq(rows.map(r => r.channelID));
const customerIds = uniq(rows.map(r => r.customerID));
const fkRefs = uniq(rows.map(r => r.fkReference));
const paramNames = uniq(rows.map(r => r.parameterName));

const lastModifiedDates = rows
  .map(r => toDate(r.lastModified))
  .filter(Boolean)
  .sort((a,b) => b.getTime() - a.getTime());

const mostRecentLastModified = lastModifiedDates.length ? lastModifiedDates[0].toISOString() : "—";

// group by channelID
const byChannel = {};
for (const r of rows) {
  const key = r.channelID || "—";
  byChannel[key] = byChannel[key] || [];
  byChannel[key].push(r);
}

// Prepare group cards (sorted by channelID, then orderBy, then parameterName)
const channelCards = Object.keys(byChannel).sort().map((chId) => {
  const items = byChannel[chId].slice().sort((a,b) => {
    const ao = (a.orderBy === null || a.orderBy === undefined) ? 999999 : Number(a.orderBy);
    const bo = (b.orderBy === null || b.orderBy === undefined) ? 999999 : Number(b.orderBy);
    if (ao !== bo) return ao - bo;
    const an = (a.parameterName || "").localeCompare(b.parameterName || "");
    if (an !== 0) return an;
    return (a.id || "").localeCompare(b.id || "");
  });

  const inactiveCount = items.filter(x => x.inactivated === true).length;
  const hasSystemFlag = items.some(x => x.systemFlag === true);

  return {
    channelID: chId,
    count: items.length,
    inactiveCount,
    hasSystemFlag,
    items
  };
});

// ---------- template ----------
const template = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Channel Parameters</title>
  <style>
    :root{
      --bg:#0b1220;
      --card:#0f1a33;
      --card2:#0c1730;
      --txt:#e8eefc;
      --muted:#a7b3d3;
      --border:rgba(255,255,255,.12);
      --pill:rgba(255,255,255,.10);
      --good:#19c37d;
      --warn:#f5c542;
      --bad:#ff5c5c;
      --accent:#6ea8fe;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
    }

    body{
      margin:0;
      padding:16px 18px 28px;
      font-family: var(--sans);
      background: linear-gradient(180deg, var(--bg), #070b14 60%);
      color: var(--txt);
    }

    .top{
      display:flex;
      gap:14px;
      align-items:flex-start;
      justify-content:space-between;
      flex-wrap:wrap;
      margin-bottom: 14px;
    }

    .title{
      display:flex;
      flex-direction:column;
      gap:4px;
      min-width: 260px;
    }

    h1{
      font-size:18px;
      margin:0;
      letter-spacing:.2px;
    }

    .sub{
      color: var(--muted);
      font-size:12px;
    }

    .controls{
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
      justify-content:flex-end;
    }

    input[type="text"], select{
      background: rgba(255,255,255,.06);
      border: 1px solid var(--border);
      color: var(--txt);
      border-radius: 10px;
      padding: 8px 10px;
      outline: none;
      font-size: 12px;
      min-width: 220px;
    }

    select{ min-width: 190px; }

    .btn{
      cursor:pointer;
      user-select:none;
      border-radius:10px;
      border:1px solid var(--border);
      padding:8px 10px;
      font-size:12px;
      background: rgba(255,255,255,.06);
      color: var(--txt);
    }
    .btn:hover{ border-color: rgba(255,255,255,.25); }

    .grid{
      display:grid;
      grid-template-columns: repeat(4, minmax(160px, 1fr));
      gap: 10px;
      margin: 12px 0 14px;
    }

    .stat{
      background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 10px 12px;
    }
    .stat .k{
      color: var(--muted);
      font-size: 11px;
      margin-bottom: 4px;
    }
    .stat .v{
      font-size: 13px;
      font-family: var(--mono);
      word-break: break-word;
    }

    .wrap{
      display:flex;
      flex-direction:column;
      gap:10px;
    }

    .card{
      background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow:hidden;
    }

    .cardHeader{
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding: 12px 12px;
      gap: 10px;
      background: rgba(0,0,0,.15);
      border-bottom: 1px solid rgba(255,255,255,.08);
    }

    .cardHeaderLeft{
      display:flex;
      flex-direction:column;
      gap:4px;
      min-width: 200px;
    }
    .cardHeaderLeft .ch{
      font-family: var(--mono);
      font-size: 12px;
      color: var(--txt);
    }
    .pillRow{
      display:flex;
      gap:6px;
      flex-wrap:wrap;
    }
    .pill{
      font-size:11px;
      padding: 3px 8px;
      border-radius: 999px;
      background: var(--pill);
      border: 1px solid rgba(255,255,255,.10);
      color: var(--muted);
    }
    .pill.good{ color: #b8ffe1; border-color: rgba(25,195,125,.35); }
    .pill.warn{ color: #ffe9a8; border-color: rgba(245,197,66,.35); }
    .pill.bad{ color: #ffb3b3; border-color: rgba(255,92,92,.35); }

    .cardHeaderRight{
      display:flex;
      gap:8px;
      align-items:center;
      flex-wrap:wrap;
      justify-content:flex-end;
    }

    details{
      border-top: 1px solid rgba(255,255,255,.06);
    }

    summary{
      list-style:none;
      cursor:pointer;
      padding: 10px 12px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      background: rgba(0,0,0,.08);
    }
    summary::-webkit-details-marker{ display:none; }

    .sumLeft{
      display:flex;
      flex-direction:column;
      gap:3px;
      min-width: 220px;
    }
    .pname{
      font-family: var(--mono);
      font-size: 12px;
      color: var(--txt);
      word-break: break-word;
    }
    .pdesc{
      font-size: 11px;
      color: var(--muted);
      word-break: break-word;
    }
    .sumRight{
      display:flex;
      gap:8px;
      align-items:center;
      flex-wrap:wrap;
      justify-content:flex-end;
    }

    .val{
      font-family: var(--mono);
      font-size: 12px;
      color: var(--txt);
      padding: 3px 8px;
      border-radius: 10px;
      border: 1px solid rgba(110,168,254,.25);
      background: rgba(110,168,254,.10);
      max-width: 520px;
      overflow:hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .body{
      padding: 10px 12px 12px;
      display:grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 10px;
    }

    .kv{
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 12px;
      padding: 10px 10px;
      background: rgba(0,0,0,.12);
    }
    .kv h3{
      margin:0 0 8px;
      font-size: 12px;
      color: var(--muted);
      font-weight: 600;
      letter-spacing: .2px;
    }

    table{
      width:100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    td{
      padding: 6px 4px;
      border-top: 1px solid rgba(255,255,255,.06);
      vertical-align: top;
      word-break: break-word;
    }
    td.k{
      color: var(--muted);
      width: 40%;
    }
    td.v{
      font-family: var(--mono);
      color: var(--txt);
      width: 60%;
    }

    .jsonBox{
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 12px;
      background: rgba(0,0,0,.18);
      overflow:hidden;
      display:flex;
      flex-direction:column;
      min-height: 180px;
    }
    .jsonHeader{
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding: 8px 10px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      gap: 10px;
    }
    .jsonHeader .label{
      font-size: 12px;
      color: var(--muted);
      font-weight: 600;
    }
    .jsonHeader .actions{
      display:flex;
      gap:8px;
      align-items:center;
      flex-wrap:wrap;
      justify-content:flex-end;
    }
    .mini{
      cursor:pointer;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,.10);
      padding: 6px 8px;
      font-size: 11px;
      background: rgba(255,255,255,.06);
      color: var(--txt);
    }
    .mini:hover{ border-color: rgba(255,255,255,.22); }

    pre{
      margin:0;
      padding: 10px;
      font-size: 11px;
      line-height: 1.35;
      color: #dce6ff;
      overflow:auto;
      font-family: var(--mono);
      white-space: pre;
    }

    .muted{ color: var(--muted); }

    .hint{
      margin-top: 6px;
      font-size: 11px;
      color: var(--muted);
    }

    @media (max-width: 980px){
      .grid{ grid-template-columns: repeat(2, minmax(160px, 1fr)); }
      .body{ grid-template-columns: 1fr; }
      input[type="text"]{ min-width: 180px; }
      select{ min-width: 160px; }
    }
  </style>
</head>
<body>
  <div class="top">
    <div class="title">
      <h1>⚙️ Channel Parameters</h1>
      <div class="sub">
        Total: <b>{{total}}</b> · Channels: <b>{{channelsCount}}</b> · Customers: <b>{{customersCount}}</b> · Most recent lastModified: <b>{{mostRecentLastModified}}</b>
      </div>
    </div>

    <div class="controls">
      <input id="q" type="text" placeholder="Search (parameterName / value / channelID / customerID / fkReference)..." />
      <select id="channelFilter">
        <option value="">All channelIDs</option>
        {{#channels}}
          <option value="{{.}}">{{.}}</option>
        {{/channels}}
      </select>
      <select id="inactiveFilter">
        <option value="">All</option>
        <option value="false">Active only</option>
        <option value="true">Inactive only</option>
      </select>
      <button class="btn" id="expandAll">Expand all</button>
      <button class="btn" id="collapseAll">Collapse all</button>
    </div>
  </div>

  <div class="grid">
    <div class="stat">
      <div class="k">Unique parameterName</div>
      <div class="v">{{uniqueParamNames}}</div>
    </div>
    <div class="stat">
      <div class="k">Unique fkReference</div>
      <div class="v">{{uniqueFkRefs}}</div>
    </div>
    <div class="stat">
      <div class="k">Unique channelID</div>
      <div class="v">{{channelsCount}}</div>
    </div>
    <div class="stat">
      <div class="k">Unique customerID</div>
      <div class="v">{{customersCount}}</div>
    </div>
  </div>

  <div class="wrap" id="wrap">
    {{#channelCards}}
    <div class="card channelCard" data-channel="{{channelID}}">
      <div class="cardHeader">
        <div class="cardHeaderLeft">
          <div class="ch">channelID: {{channelID}}</div>
          <div class="pillRow">
            <span class="pill">{{count}} params</span>
            {{#inactiveCount}}
              <span class="pill warn">{{inactiveCount}} inactive</span>
            {{/inactiveCount}}
            {{#hasSystemFlag}}
              <span class="pill good">systemFlag present</span>
            {{/hasSystemFlag}}
          </div>
        </div>

        <div class="cardHeaderRight">
          <span class="pill muted">filterable</span>
        </div>
      </div>

      {{#items}}
      <details class="paramRow"
        data-paramname="{{parameterName}}"
        data-value="{{parameterValue}}"
        data-channel="{{channelID}}"
        data-customer="{{customerID}}"
        data-fkref="{{fkReference}}"
        data-inactivated="{{inactivated}}">
        <summary>
          <div class="sumLeft">
            <div class="pname">{{parameterName}}</div>
            <div class="pdesc">{{shortDescription}}{{#longDescription}} · {{longDescription}}{{/longDescription}}</div>
          </div>

          <div class="sumRight">
            <div class="val" title="{{parameterValue}}">{{parameterValue}}</div>
            {{#inactivated}}
              <span class="pill bad">inactive</span>
            {{/inactivated}}
            {{^inactivated}}
              <span class="pill good">active</span>
            {{/inactivated}}
            {{#systemFlag}}
              <span class="pill warn">systemFlag</span>
            {{/systemFlag}}
          </div>
        </summary>

        <div class="body">
          <div class="kv">
            <h3>Fields</h3>
            <table>
              <tr><td class="k">id</td><td class="v">{{id}}</td></tr>
              <tr><td class="k">fkReference</td><td class="v">{{fkReference}}</td></tr>
              <tr><td class="k">fkID</td><td class="v">{{fkID}}</td></tr>
              <tr><td class="k">customerID</td><td class="v">{{customerID}}</td></tr>
              <tr><td class="k">externalReference</td><td class="v">{{externalReference}}</td></tr>
              <tr><td class="k">parameterType</td><td class="v">{{parameterType}}</td></tr>
              <tr><td class="k">orderBy</td><td class="v">{{orderBy}}</td></tr>
              <tr><td class="k">beginDate</td><td class="v">{{beginDate}}</td></tr>
              <tr><td class="k">lastModified</td><td class="v">{{lastModified}}</td></tr>
              <tr><td class="k">lastModifiedByID</td><td class="v">{{lastModifiedByID}}</td></tr>
              <tr><td class="k">parentID</td><td class="v">{{parentID}}</td></tr>
              <tr><td class="k">systemFlag</td><td class="v">{{systemFlag}}</td></tr>
              <tr><td class="k">inactivated</td><td class="v">{{inactivated}}</td></tr>
            </table>
            <div class="hint">Tip: many parameterValue fields can contain JSON — see the right panel.</div>
          </div>

          <div class="jsonBox">
            <div class="jsonHeader">
              <div class="label">parameterValue JSON (auto-detect)</div>
              <div class="actions">
                <button class="mini copyBtn" type="button">Copy JSON</button>
                <button class="mini rawBtn" type="button">Copy Raw Value</button>
              </div>
            </div>
            <pre class="jsonPre">{{jsonPretty}}</pre>
          </div>
        </div>
      </details>
      {{/items}}
    </div>
    {{/channelCards}}
  </div>

  <script>
    (function(){
      const q = document.getElementById('q');
      const channelFilter = document.getElementById('channelFilter');
      const inactiveFilter = document.getElementById('inactiveFilter');
      const expandAll = document.getElementById('expandAll');
      const collapseAll = document.getElementById('collapseAll');

      function normalize(s){ return (s || '').toString().toLowerCase(); }

      function applyFilters(){
        const query = normalize(q.value);
        const ch = channelFilter.value;
        const inact = inactiveFilter.value;

        const channelCards = Array.from(document.querySelectorAll('.channelCard'));
        channelCards.forEach(card => {
          const cardChannel = card.getAttribute('data-channel') || '';
          const paramRows = Array.from(card.querySelectorAll('.paramRow'));

          let anyVisible = false;

          paramRows.forEach(row => {
            const p = normalize(row.getAttribute('data-paramname'));
            const v = normalize(row.getAttribute('data-value'));
            const c = normalize(row.getAttribute('data-channel'));
            const cust = normalize(row.getAttribute('data-customer'));
            const fk = normalize(row.getAttribute('data-fkref'));
            const isInactive = (row.getAttribute('data-inactivated') === 'true');

            const matchesQuery = !query || [p,v,c,cust,fk].some(x => x.includes(query));
            const matchesChannel = !ch || (cardChannel === ch);
            const matchesInactive =
              !inact || (inact === 'true' ? isInactive : !isInactive);

            const show = matchesQuery && matchesChannel && matchesInactive;
            row.style.display = show ? '' : 'none';
            if (show) anyVisible = true;
          });

          card.style.display = anyVisible ? '' : 'none';
        });
      }

      q.addEventListener('input', applyFilters);
      channelFilter.addEventListener('change', applyFilters);
      inactiveFilter.addEventListener('change', applyFilters);

      expandAll.addEventListener('click', () => {
        document.querySelectorAll('details.paramRow').forEach(d => {
          if (d.style.display !== 'none') d.open = true;
        });
      });

      collapseAll.addEventListener('click', () => {
        document.querySelectorAll('details.paramRow').forEach(d => d.open = false);
      });

      // Copy buttons
      document.querySelectorAll('details.paramRow').forEach(d => {
        const pre = d.querySelector('.jsonPre');
        const copyBtn = d.querySelector('.copyBtn');
        const rawBtn = d.querySelector('.rawBtn');

        copyBtn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const txt = pre ? pre.textContent : '';
          navigator.clipboard.writeText(txt || '');
          copyBtn.textContent = 'Copied!';
          setTimeout(() => copyBtn.textContent = 'Copy JSON', 900);
        });

        rawBtn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const raw = d.getAttribute('data-value') || '';
          navigator.clipboard.writeText(raw);
          rawBtn.textContent = 'Copied!';
          setTimeout(() => rawBtn.textContent = 'Copy Raw Value', 900);
        });
      });

      applyFilters();
    })();
  </script>
</body>
</html>
`;

// ---------- view model ----------
const view = {
  total: rows.length,
  channelsCount: channelIds.length,
  customersCount: customerIds.length,
  uniqueFkRefs: fkRefs.length,
  uniqueParamNames: paramNames.length,
  mostRecentLastModified: mostRecentLastModified,

  channels: channelIds.sort(),

  channelCards: channelCards.map(ch => ({
    channelID: fmt(ch.channelID),
    count: ch.count,
    inactiveCount: ch.inactiveCount,
    hasSystemFlag: ch.hasSystemFlag,

    items: ch.items.map(r => {
      const val = r.parameterValue;
      const parsed = parseMaybeJSON(val);
      const jsonPretty = parsed ? safeStringify(parsed) : safeStringify(val);

      return {
        // summary
        parameterName: esc(fmt(r.parameterName)),
        parameterValue: esc(fmt(r.parameterValue)),
        shortDescription: esc(fmt(r.shortDescription)),
        longDescription: esc(fmt(r.longDescription)),
        // fields
        id: esc(fmt(r.id)),
        fkReference: esc(fmt(r.fkReference)),
        fkID: esc(fmt(r.fkID)),
        customerID: esc(fmt(r.customerID)),
        externalReference: esc(fmt(r.externalReference)),
        parameterType: esc(fmt(r.parameterType)),
        orderBy: esc(fmt(r.orderBy)),
        beginDate: esc(fmt(r.beginDate)),
        lastModified: esc(fmt(r.lastModified)),
        lastModifiedByID: esc(fmt(r.lastModifiedByID)),
        parentID: esc(fmt(r.parentID)),
        systemFlag: !!r.systemFlag,
        inactivated: !!r.inactivated,

        // json panel
        jsonPretty: esc(jsonPretty)
      };
    })
  }))
};

// Render
pm.visualizer.set(template, view);
