// === APS Availability Visualizer ===
// Parses the API response and renders a compact dashboard in Postman Visualizer

// 1) Safely parse JSON
let payload = {};
try {
  payload = pm.response.json();
} catch (e) {
  payload = {};
}

// 2) Utilities
const fmtMoney = (n, c = "USD") =>
  (typeof n === "number" ? n : Number(n || 0)).toLocaleString("en-US", {
    style: "currency",
    currency: c || "USD",
    maximumFractionDigits: 2
  });

const safe = (v, d = "—") => (v === null || v === undefined || v === "" ? d : v);

const fmtDate = (s) => {
  if (!s) return "—";
  // Accept "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
  const iso = s.length === 10 ? `${s}T00:00:00` : s;
  const d = new Date(iso);
  if (isNaN(d)) return s;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
};

const yesNo = (b) => (b ? "Yes" : "No");

// 3) Extract root
const loc = (payload.locationAvailabilityList && payload.locationAvailabilityList[0]) || {};
const rates = Array.isArray(loc.availabilityList) ? loc.availabilityList : [];

// 4) Normalize rates for UI
const normRates = rates.map((r) => {
  const priceCal = Array.isArray(r.priceCalendar) ? r.priceCalendar : [];
  const nights = priceCal.map((p) => {
    const a = p && p.availability ? p.availability : {};
    return {
      date: safe(p && p.priceDateTime),
      priceAmount: a.priceAmount,
      basePriceAmount: a.basePriceAmount,
      taxTotal: a.taxTotal,
      subtotal: a.subtotal,
      total: a.total,
      currencyCode: a.currencyCode || r.currencyCode || "USD",
      refundable: !!a.refundable,
      priceCode: a.priceCode || r.priceCode || "—",
      priceDescription: a.priceDescription || r.priceDescription || "—",
      remaining: a.remaining,
      timeZone: a.timeZone || r.timeZone || loc.timeZone || ""
    };
  });

  const policies = Array.isArray(r.policies) ? r.policies.map((p) => ({
    type: safe(p.type),
    code: safe(p.code),
    rule: safe(p.amountRule),
    amount: p.amount,
    currencyCode: p.currencyCode || r.currencyCode || "USD",
    desc: safe(p.description),
    due: safe(p.dueDateTime)
  })) : [];

  return {
    priceCode: safe(r.priceCode),
    priceDescription: safe(r.priceDescription),
    refundable: !!r.refundable,
    inclusive: !!r.priceInclusive,
    avgPrice: r.averagePriceAmount,
    minPrice: r.minPriceAmount,
    maxPrice: r.maxPriceAmount,
    currencyCode: r.currencyCode || "USD",
    total: r.total,
    taxTotal: r.taxTotal,
    subtotal: r.subtotal,
    remaining: r.remaining,
    quantity: r.quantity,
    productCode: r.productCode,
    productDescription: r.productDescription,
    policies,
    nights
  };
}).sort((a,b) => String(a.priceCode).localeCompare(String(b.priceCode)));

// 5) Summary block
const summary = {
  hotelCode: safe(loc.destinationLocationCode),
  hotelName: safe(loc.destinationLocationDescription),
  beginDate: safe(loc.beginDate),
  endDate: safe(loc.endDate),
  duration: safe(loc.duration),
  currency: safe(loc.currencyCode, "USD"),
  remaining: safe(loc.remaining),
  min: safe(loc.minPriceAmount),
  minCode: safe(loc.minPriceCode),
  max: safe(loc.maxPriceAmount),
  maxCode: safe(loc.maxPriceCode),
  txId: safe(loc.transactionID),
  timestamp: safe(loc.timestamp),
  productType: safe(loc.productType, "ROOM")
};

// 6) Build template
const template = `
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root { --fg:#0f172a; --muted:#475569; --bg:#ffffff; --chip:#eef2ff; --ok:#065f46; --warn:#9a3412; --line:#e2e8f0; }
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:var(--fg); background:var(--bg); margin:16px; }
      h1 { font-size:18px; margin:0 0 8px; }
      h2 { font-size:16px; margin:16px 0 8px; }
      .grid { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:8px; }
      .card { border:1px solid var(--line); border-radius:12px; padding:12px; }
      .kv { display:flex; flex-direction:column; border:1px dashed var(--line); border-radius:10px; padding:10px; }
      .kv b { color:var(--muted); font-size:12px; font-weight:600; }
      .kv span { font-size:14px; }
      table { width:100%; border-collapse:collapse; }
      th, td { border-bottom:1px solid var(--line); padding:10px 8px; text-align:left; vertical-align:top; }
      th { font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
      .chip { display:inline-block; padding:2px 8px; border-radius:999px; background:var(--chip); font-size:12px; }
      .ok { color: var(--ok); font-weight:600; }
      .warn { color: var(--warn); font-weight:600; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      .small { font-size:12px; color:var(--muted); }
      .tight td { padding:6px 8px; }
    </style>
  </head>
  <body>
    <h1>Availability · {{hotelName}}</h1>
    <div class="grid">
      <div class="kv"><b>Hotel Code</b><span class="mono">{{hotelCode}}</span></div>
      <div class="kv"><b>Stay</b><span>{{begin}} → {{end}} ({{duration}} nights)</span></div>
      <div class="kv"><b>Inventory Remaining</b><span>{{remaining}}</span></div>
      <div class="kv"><b>Currency</b><span>{{currency}}</span></div>
      <div class="kv"><b>Min Price</b><span>{{min}} <span class="small">(code {{minCode}})</span></span></div>
      <div class="kv"><b>Max Price</b><span>{{max}} <span class="small">(code {{maxCode}})</span></span></div>
      <div class="kv"><b>Product Type</b><span>{{productType}}</span></div>
      <div class="kv"><b>Txn / Timestamp</b><span class="mono">{{txId}} · {{time}}</span></div>
    </div>

    <h2>Rate Plans</h2>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Rate</th>
            <th>Refundable</th>
            <th>Inclusive</th>
            <th>Avg Night</th>
            <th>Min → Max</th>
            <th>Total</th>
            <th>Room</th>
            <th>Remaining</th>
          </tr>
        </thead>
        <tbody>
          {{#each rates}}
          <tr>
            <td class="mono">{{priceCode}}</td>
            <td>{{priceDescription}}</td>
            <td>{{#if refundable}}<span class="ok">Yes</span>{{else}}<span class="warn">No</span>{{/if}}</td>
            <td>{{#if inclusive}}Yes{{else}}No{{/if}}</td>
            <td>{{avg}}</td>
            <td>{{min}} → {{max}}</td>
            <td>{{total}}</td>
            <td><span class="small">{{productDescription}}</span><div class="small mono">{{productCode}}</div></td>
            <td>{{remaining}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>

    {{#each rates}}
      <h2>Nightly Prices · Code {{priceCode}} — {{priceDescription}}</h2>
      <div class="card">
        <table class="tight">
          <thead>
            <tr>
              <th>Date</th>
              <th>Nightly</th>
              <th>Base</th>
              <th>Tax</th>
              <th>Total</th>
              <th>Refundable</th>
              <th>Remain</th>
              <th>Time Zone</th>
            </tr>
          </thead>
          <tbody>
            {{#each nights}}
              <tr>
                <td>{{dateNice}}</td>
                <td>{{priceNice}}</td>
                <td>{{baseNice}}</td>
                <td>{{taxNice}}</td>
                <td>{{totalNice}}</td>
                <td>{{#if refundable}}<span class="ok">Yes</span>{{else}}<span class="warn">No</span>{{/if}}</td>
                <td>{{remaining}}</td>
                <td>{{timeZone}}</td>
              </tr>
            {{/each}}
          </tbody>
        </table>
      </div>

      {{#if hasPolicies}}
      <div class="card">
        <h3 class="small">Policies · Code {{priceCode}}</h3>
        <table class="tight">
          <thead>
            <tr>
              <th>Type</th>
              <th>Rule</th>
              <th>Amount</th>
              <th>Due / Notes</th>
            </tr>
          </thead>
          <tbody>
            {{#each policies}}
              <tr>
                <td>{{type}} <span class="small mono">({{code}})</span></td>
                <td>{{rule}}</td>
                <td>{{amountNice}}</td>
                <td>{{desc}}<div class="small">{{dueNice}}</div></td>
              </tr>
            {{/each}}
          </tbody>
        </table>
      </div>
      {{/if}}

    {{/each}}

    <p class="small">Rendered by Postman Visualizer • All amounts shown in API currency.</p>
  </body>
</html>
`;

// 7) Prepare data for the template
const viewModel = {
  hotelCode: summary.hotelCode,
  hotelName: summary.hotelName,
  begin: fmtDate(summary.beginDate),
  end: fmtDate(summary.endDate),
  duration: summary.duration,
  remaining: summary.remaining,
  currency: summary.currency,
  min: typeof summary.min === "number" ? fmtMoney(summary.min, summary.currency) : "—",
  minCode: summary.minCode,
  max: typeof summary.max === "number" ? fmtMoney(summary.max, summary.currency) : "—",
  maxCode: summary.maxCode,
  txId: summary.txId,
  time: summary.timestamp,
  productType: summary.productType,
  rates: normRates.map(r => ({
    priceCode: r.priceCode,
    priceDescription: r.priceDescription,
    refundable: r.refundable,
    inclusive: r.inclusive,
    avg: typeof r.avgPrice === "number" ? fmtMoney(r.avgPrice, r.currencyCode) : "—",
    min: typeof r.minPrice === "number" ? fmtMoney(r.minPrice, r.currencyCode) : "—",
    max: typeof r.maxPrice === "number" ? fmtMoney(r.maxPrice, r.currencyCode) : "—",
    total: typeof r.total === "number" ? fmtMoney(r.total, r.currencyCode) : "—",
    taxTotal: typeof r.taxTotal === "number" ? fmtMoney(r.taxTotal, r.currencyCode) : "—",
    subtotal: typeof r.subtotal === "number" ? fmtMoney(r.subtotal, r.currencyCode) : "—",
    remaining: r.remaining,
    productCode: r.productCode,
    productDescription: r.productDescription,
    hasPolicies: r.policies.length > 0,
    policies: r.policies.map(p => ({
      type: p.type,
      code: p.code,
      rule: p.rule,
      amountNice: p.amount == null ? "—" : fmtMoney(p.amount, p.currencyCode),
      desc: p.desc,
      dueNice: p.due ? `Due: ${fmtDate(p.due)}` : ""
    })),
    nights: r.nights.map(n => ({
      dateNice: fmtDate(n.date),
      priceNice: typeof n.priceAmount === "number" ? fmtMoney(n.priceAmount, n.currencyCode) : "—",
      baseNice: typeof n.basePriceAmount === "number" ? fmtMoney(n.basePriceAmount, n.currencyCode) : "—",
      taxNice: typeof n.taxTotal === "number" ? fmtMoney(n.taxTotal, n.currencyCode) : "—",
      totalNice: typeof n.total === "number" ? fmtMoney(n.total, n.currencyCode) : "—",
      refundable: n.refundable,
      remaining: n.remaining == null ? "—" : n.remaining,
      timeZone: n.timeZone || ""
    }))
  }))
};

// 8) Render
pm.visualizer.set(template, viewModel);

// 9) Basic test assertions (optional, helpful in Collections/Dashboards)
pm.test("Availability parsed", function () {
  pm.expect(Array.isArray(rates)).to.eql(true);
});
pm.test("At least one rate returned", function () {
  pm.expect(viewModel.rates.length).to.be.above(0);
});
