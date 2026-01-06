// Parse JSON response
let jsonData = pm.response.json();

if (pm.response.code === 200) {

    let reservation = jsonData.reservation || {};
let reservationId = "N/A";

// ✅ PRIMARY: Reservation ID from top-level UUID field: reservation.id
if (reservation.id) {
  reservationId = String(reservation.id).trim() || "N/A";
}

// 🔁 (Optional) keep your old fallbacks ONLY if reservation.id is missing
function findReservationIdInProductCalendar(res) {
  if (!res || !Array.isArray(res.products)) return null;
  for (const product of res.products) {
    const pcs = product?.productCalendar;
    if (Array.isArray(pcs)) {
      for (const pc of pcs) {
        if (pc?.reservationID) return pc.reservationID;
      }
    }
  }
  return null;
}

if (reservationId === "N/A") {
  const commentId = reservation?.comments?.[0]?.reservationID;
  if (commentId) reservationId = commentId;
}

if (reservationId === "N/A") {
  const pcId = findReservationIdInProductCalendar(reservation);
  if (pcId) reservationId = pcId;
}

if (reservationId === "N/A" && reservation.reservationID) {
  reservationId = reservation.reservationID;
}


    // 🔢 Reservation basics + status emoji
    let reservationNumber = reservation.reservationNumber || "N/A";
    let status = reservation.status || "N/A";
    let statusEmoji = status === "BOOK" ? "✅" : (status === "CANCEL" ? "❌" : "⚪️");

    // 🔗 External Reservation Number (channel reservation reference)
    let externalReservationNumber = reservation.externalReservationNumber || "N/A";

    // 🏨 Reservation-level info
    let checkinDate = reservation.checkinDate || null;
    let checkoutDate = reservation.checkoutDate || null;
    let creationDate = reservation.creationDate || null; // keep null if missing so we can safely format

    // 👇 Distintos nombres posibles del campo de cancelación
    let cancellationDate =
      reservation.cancellationDate ||   // inglés estándar
      reservation.cancelationDate ||    // variante con 1 "l"
      reservation.cancelledDate  ||     // otra variante (UK)
      reservation.cancelDate      ||    // abreviado
      null;
   
    let creationChannels = reservation.creationChannelCodeList || [];
    let reservationType = reservation.reservationType || "N/A";
    let externalAgreementCode = reservation.externalAgreementCode || "N/A";

    // === 🏨 Find externalCustomerReference (e.g., "BN2181") ===
    function deepFindKey(obj, targetKey, maxDepth = 8) {
      if (!obj || typeof obj !== 'object' || maxDepth < 0) return undefined;
      if (Object.prototype.hasOwnProperty.call(obj, targetKey)) return obj[targetKey];
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = deepFindKey(item, targetKey, maxDepth - 1);
          if (found !== undefined) return found;
        }
        return undefined;
      }
      for (const k of Object.keys(obj)) {
        const val = obj[k];
        if (val && typeof val === 'object') {
          const found = deepFindKey(val, targetKey, maxDepth - 1);
          if (found !== undefined) return found;
        }
      }
      return undefined;
    }

    function findExternalCustomerReference(res) {
      if (res.externalCustomerReference) return res.externalCustomerReference;
      if (res.customer && res.customer.externalCustomerReference) return res.customer.externalCustomerReference;
      const any = deepFindKey(res, "externalCustomerReference");
      if (any) return any;
      try {
        const jsonStr = JSON.stringify(res);
        const m = jsonStr.match(/"externalCustomerReference"\s*:\s*"([^"]+)"/i) ||
                  jsonStr.match(/"(BN\d{3,6})"/);
        if (m) return m[1];
      } catch (e) {}
      return null;
    }

    let hotelCode = findExternalCustomerReference(reservation) || "N/A";
    if (typeof hotelCode === 'string') hotelCode = hotelCode.trim() || "N/A";

    // --- Date helpers (respetando offset del ISO) ---
    function getUTCOffset(iso) {
      if (!iso || typeof iso !== 'string') return "UTC";
      const m = iso.match(/([+-]\d{4})$/);
      return m ? `UTC${m[1]}` : "UTC";
    }

    function dateAdjustedToIsoOffset(iso) {
      // Normalize ISO offsets like +0000 to +00:00 so Date() can parse reliably
      const isoNorm = (iso && typeof iso === 'string')
        ? iso.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
        : iso;

      const m = iso && iso.match(/([+-])(\d{2})(\d{2})$/);
      const d = new Date(isoNorm);
      if (!m || isNaN(d.getTime())) return null;

      const sign = m[1] === '-' ? -1 : 1;
      const hh = parseInt(m[2], 10);
      const mm = parseInt(m[3], 10);
      const offsetMinutes = sign * (hh * 60 + mm);

      return new Date(d.getTime() + offsetMinutes * 60 * 1000);
    }


    function fmtDateISOToPrettyRespectingOffset(iso) {
      if (!iso || typeof iso !== 'string') return { dateStr: "N/A", timeStr: "" };
      const adj = dateAdjustedToIsoOffset(iso);
      if (!adj) return { dateStr: "N/A", timeStr: "" };
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        weekday: 'long',
        month: 'long',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(adj);
      const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
      const dateStr = `${map.weekday}, ${map.month} ${map.day} ${map.year}`;
      const timeStr = `${map.hour}:${map.minute}`;
      return { dateStr, timeStr };
    }

    function fullDateLine(iso) {
      if (!iso || typeof iso !== 'string') return "N/A";
      const { dateStr, timeStr } = fmtDateISOToPrettyRespectingOffset(iso);
      const utc = getUTCOffset(iso);
      return `${iso} ❗ ${dateStr} ❗ ${timeStr} ${utc}`;
    }

    const checkinLine  = fullDateLine(checkinDate);
    const checkoutLine = fullDateLine(checkoutDate);

    function fmtYYMMDDHH24FromIso(iso) {
      if (!iso || typeof iso !== 'string') return "N/A";
      const adj = dateAdjustedToIsoOffset(iso);
      if (!adj) return "N/A";
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false
      }).formatToParts(adj);
      const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
      return `${map.year}/${map.month}/${map.day}/${map.hour}`;
    }

    function creationLineFormat(iso) {
      if (!iso || typeof iso !== 'string') return "N/A";

      const base = `${iso} ❗ ${fmtYYMMDDHH24FromIso(iso)}`;

      // ⚠️ Splunk online retention: 90 days. Older logs are purged.
      const isoNorm = iso.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
      const d = new Date(isoNorm);
      const days90 = 90 * 24 * 60 * 60 * 1000;

      if (!isNaN(d.getTime()) && (Date.now() - d.getTime()) > days90) {
        return `${base} ⚠️ Logs Purged`;
      }

      return base;
    }

    const creationLine = creationDate ? creationLineFormat(creationDate) : "N/A";
    const cancellationLine = cancellationDate ? creationLineFormat(cancellationDate) : "N/A";

    // 🧾 gcloud commands for Splunk logs
    const GCLOUD_BUCKET = "gs://abvprp-logs-fluentd/logs";
    const GCLOUD_LOCAL  = "~/Documents/splunk/bablefish";

    const creationCmd = creationDate
      ? `gcloud storage cp -r --do-not-decompress '${GCLOUD_BUCKET}/20${fmtYYMMDDHH24FromIso(creationDate)}/trx.log/**' ${GCLOUD_LOCAL}`
      : "";

    const cancellationCmd = cancellationDate
      ? `gcloud storage cp -r --do-not-decompress '${GCLOUD_BUCKET}/20${fmtYYMMDDHH24FromIso(cancellationDate)}/trx.log/**' ${GCLOUD_LOCAL}`
      : "";

    // 🏨 Product Calendar entries
    let productCalendars = [];
    if (reservation.products && Array.isArray(reservation.products)) {
        reservation.products.forEach((product, i) => {
            if (product.productCalendar && Array.isArray(product.productCalendar)) {
                product.productCalendar.forEach((pc, j) => {
                    let emoji = pc.status === "BOOK" ? "✅" : (pc.status === "CANCEL" ? "❌" : "⚪️");
                    productCalendars.push({
                        index: `${i + 1}.${j + 1}`,
                        beginDate: pc.beginDate || "N/A",
                        departureDate: pc.departureDate || "N/A",
                        amount: pc.amount || 0,
                        currency: pc.currencyCode || "N/A",
                        adults: pc.adults || 0,
                        children: pc.children || 0,
                        creationDate: pc.creationDate || "N/A",
                        productID: pc.productID || "N/A",
                        priceID: pc.priceID || "N/A",
                        externalPriceCode: pc.externalPriceCode || "N/A",
                        status: pc.status || "N/A",
                        emoji,
                        reservationID: pc.reservationID || null
                    });
                });
            }
        });
    }

    // 👥 Parties
    let parties = [];
    if (reservation.parties && Array.isArray(reservation.parties)) {
        reservation.parties.forEach((p, i) => {
            parties.push({
                index: i + 1,
                firstName: p.firstName || "",
                lastName: p.name || "",
                partyType: p.partyType || "",
                primary: p.primaryYN === "Y" ? "⭐️" : "⚪️",
                // 👶 CHILD_AGE desde udfValues.CHILD_AGE
                childAge: (p.udfValues && p.udfValues.CHILD_AGE) ? p.udfValues.CHILD_AGE : "",
                fkReference: p.fkReference || "",
                fkID: p.fkID || ""
            });
        });
    }

    // 🔐 Authorizations
    let authEntries = [];
    if (reservation.authorizations && Array.isArray(reservation.authorizations)) {
        reservation.authorizations.forEach((a, i) => {
            let inactiveEmoji = a.inactivated ? "🔴" : "🟢";
            authEntries.push({
                index: i + 1,
                authorizationType: a.authorizationType || "N/A",
                authorizationReason: a.authorizationReason || "",
                lastModified: a.lastModified || "N/A",
                inactivated: inactiveEmoji
            });
        });
    }

    // 🧩 UDF Values
    let udf = reservation.udfValues || {};
    let udfEntries = Object.keys(udf)
        .filter(k => k !== "CREATION_USER_ID" && k !== "EPS_RETRIEVE_LINK")
        .map((key, i) => ({ index: i + 1, key, value: udf[key] }));

    // 🧾 Console summary
    if (reservation.comments && reservation.comments[0]?.reservationID) {
      console.log("🆔 reservationID (comments[0]):", reservation.comments[0].reservationID);
    }
    const pcFirstId = findReservationIdInProductCalendar(reservation);
    if (pcFirstId) console.log("🆔 reservationID (productCalendar):", pcFirstId);
    if (reservation.reservationID) console.log("🆔 reservationID (top-level):", reservation.reservationID);
    console.log("✅ reservationID usado:", reservationId);

    console.log("🔗 External Reservation Number:", externalReservationNumber);
    console.log("🏨 Hotel (externalCustomerReference):", hotelCode);
    console.log("🔢 Reservation Number:", reservationNumber);
    console.log("🔖 Status:", status);
    console.log("📦 Products:", productCalendars.length, "| 👥 Parties:", parties.length, "| 🔐 Auths:", authEntries.length, "| 🧩 UDF:", udfEntries.length);

    // ✅ Basic test
    pm.test("Reservation data extracted", function () {
        pm.expect(reservationId).not.eql("N/A");
    });

    // === 🔗 Config para fetch desde el Visualize ===
    const VIZ_CFG = {
      protocol: pm.variables.get("protocol") || pm.environment.get("protocol") || "https",
      host:     pm.variables.get("host")     || pm.environment.get("host")     || "localhost",
      port:     pm.variables.get("port")     || pm.environment.get("port")     || "443",
      sessionToken: pm.variables.get("sessionToken") || pm.environment.get("sessionToken") || ""
    };

    // 🧱 Build rows (ProductID + PriceID con links, botones y paneles colapsables)
    const productRows = productCalendars.map((pc, idx) => `
  <tr>
    <td>${pc.index}</td>
    <td>${pc.beginDate}</td>
    <td>${pc.departureDate}</td>
    <td style="text-align:right;">${Number(pc.amount || 0).toFixed(2)}</td>
    <td>${pc.currency}</td>
    <td>${pc.adults}</td>
    <td>${pc.children}</td>
    <td>${pc.externalPriceCode}</td>
    <td>
      <button data-action="get-product"
              data-row="${idx}"
              data-productid="${pc.productID}"
              title="Fetch product ${pc.productID}"
              style="padding:2px 8px; font-size:11px; cursor:pointer;">
        📦 Get Product
      </button>
    </td>
    <td>
      <button data-action="get-price"
              data-row="${idx}"
              data-priceid="${pc.priceID}"
              title="Fetch price ${pc.priceID}"
              style="padding:2px 8px; font-size:11px; cursor:pointer;">
        💰 Get Price
      </button>
    </td>
    <td style="text-align:center;">${pc.emoji} ${pc.status}</td>
    <td>${pc.creationDate}</td>
  </tr>
  <tr>
    <td colspan="12" style="background:#fafafa;">
      <!-- Panel PRODUCT -->
      <details id="productdet-${idx}" style="margin:6px 0; display:none;">
        <summary style="cursor:pointer;">📦 Product response (click to expand)</summary>
        <pre id="productout-${idx}" style="margin:6px 0; white-space:pre-wrap; word-break:break-word;"></pre>
      </details>
      <!-- Panel PRICE -->
      <details id="pricedet-${idx}" style="margin:6px 0; display:none;">
        <summary style="cursor:pointer;">💰 Price response (click to expand)</summary>
        <pre id="priceout-${idx}" style="margin:6px 0; white-space:pre-wrap; word-break:break-word;"></pre>
      </details>
    </td>
  </tr>
`).join("");


    const partyRows = parties.map(p => `
        <tr>
            <td>${p.index}</td>
            <td>${p.firstName}</td>
            <td>${p.lastName}</td>
            <td>${p.partyType}</td>
            <td style="text-align:center;">${p.primary}</td>
            <td>${p.childAge}</td>
            <td>${p.fkReference}</td>
            <td>${p.fkID}</td>
        </tr>
    `).join("");

    const authRows = authEntries.map(a => `
        <tr>
            <td>${a.index}</td>
            <td>${a.authorizationType}</td>
            <td>${a.authorizationReason}</td>
            <td>${a.lastModified}</td>
            <td style="text-align:center;">${a.inactivated}</td>
        </tr>
    `).join("");

    const udfRows = udfEntries.map(u => `
        <tr>
            <td>${u.index}</td>
            <td>${u.key}</td>
            <td>${u.value}</td>
        </tr>
    `).join("");

    // 🎨 Visualizer
    pm.visualizer.set(`
        <div style="font-family:Arial; padding:10px;">
            <h3 style="color:green;">✅ Reservation Summary</h3>
            <table border="1" cellpadding="6" style="border-collapse:collapse; font-size:13px; width:100%;">
                <tr><th align="left">🔢 Reservation Number</th><td>${reservationNumber}</td></tr>
                <tr><th align="left">🆔 Reservation ID</th><td>${reservationId}</td></tr>
                <tr><th align="left">🔗 External Resv #<i><sub>Tour Operator Order Number</sub></i></th><td>${externalReservationNumber}</td></tr>
                <tr><th align="left">🔖 Status</th><td>${statusEmoji} ${status}</td></tr>
                <tr><th align="left">📘 Type</th><td>${reservationType}</td></tr>
                <tr>
                  <th align="left">📄 Corporate Profile</th>
                  <td>${externalAgreementCode} | <i><sub>External Agreement Code</sub></i></td>
                </tr>
                <tr><th align="left">🏨 Hotel</th><td>${hotelCode}</td></tr>
                <tr><th align="left">📅 Check-in</th><td>${checkinLine}</td></tr>
                <tr><th align="left">📆 Check-out</th><td>${checkoutLine}</td></tr>
                <tr><th align="left">🕓 Creation Date</th><td>${creationLine}</td></tr>
                <tr><th>📁 download splunk command</th>
                    <td><code>${creationCmd}</code></td></tr>
                <tr><th align="left">🛑 Cancellation Date</th><td>${cancellationLine}</td></tr>
                <tr><th>📁 download splunk command</th>
                    <td><code>${cancellationCmd}</code></td></tr>
                <tr><th align="left">🌐 Creation Channels</th><td>${creationChannels.join(" 🚇 ")}</td></tr>
            </table>

            <h4 style="margin-top:20px;">🏨 Product Calendar Details</h4>
            <table border="1" cellpadding="6" style="border-collapse:collapse; font-size:12px; width:100%;">
                <thead style="background-color:#f0f9f1;">
                    <tr>
                        <th>#</th>
                        <th>Begin</th>
                        <th>Departure</th>
                        <th>Amount</th>
                        <th>Currency</th>
                        <th>Adults</th>
                        <th>Children</th>
                        <th>External Code</th>
                        <th>ProductID</th>
                        <th>PriceID</th>
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>${productRows}</tbody>
            </table>

            <h4 style="margin-top:20px;">👥 Parties</h4>
            <table border="1" cellpadding="6" style="border-collapse:collapse; font-size:12px; width:100%;">
                <thead style="background-color:#f0f9f1;">
                    <tr>
                        <th>#</th>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Type</th>
                        <th>⭐️ Primary</th>
                        <th>Child Age</th>
                        <th>FK Reference</th>
                        <th>FK ID</th>
                    </tr>
                </thead>
                <tbody>${partyRows}</tbody>
            </table>

            <h4 style="margin-top:20px;">🔐 Authorizations</h4>
            <table border="1" cellpadding="6" style="border-collapse:collapse; font-size:12px; width:100%;">
                <thead style="background-color:#f0f9f1;">
                    <tr>
                        <th>#</th>
                        <th>Type</th>
                        <th>Reason</th>
                        <th>Last Modified</th>
                        <th>Inactivated</th>
                    </tr>
                </thead>
                <tbody>${authRows}</tbody>
            </table>

            <h4 style="margin-top:20px;">🧩 UDF Values</h4>
            <table border="1" cellpadding="6" style="border-collapse:collapse; font-size:12px; width:100%;">
                <thead style="background-color:#f0f9f1;">
                    <tr>
                        <th>#</th>
                        <th>Key</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>${udfRows}</tbody>
            </table>
        </div>

        <!-- Script: botones Get Product / Get Price con paneles colapsables y Bearer auto -->
        <script>
        (function () {
          const CFG = ${JSON.stringify(VIZ_CFG)};
          const q  = (sel, root) => (root||document).querySelector(sel);
          const qa = (sel, root) => Array.from((root||document).querySelectorAll(sel));

          function authHeader(token){
            if (!token) return '';
            return token.startsWith('Bearer ') ? token : ('Bearer ' + token);
          }
          async function copy(text){
            try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
          }

          async function runFetch({type, id, rowIdx, path, detId, outId, icon}){
            const det = q('#' + detId + '-' + rowIdx);
            const out = q('#' + outId + '-' + rowIdx);
            if (!det || !out) return;

            const url = \`\${CFG.protocol}://\${CFG.host}:\${CFG.port}\${path}/\${id}\`;
            det.style.display = '';
            det.open = true;
            const sum = det.querySelector('summary');
            if (sum) {
              sum.innerHTML = \`⏳ Fetching \${type} — <code>\${id}</code> · <a href="#" data-copy="\${rowIdx}">copy URL</a>\`;
              sum.addEventListener('click', (e) => {
                const a = e.target.closest('a[data-copy]');
                if (a) { e.preventDefault(); copy(url).then(ok => { a.textContent = ok ? 'copied!' : 'copy failed'; setTimeout(()=>{ a.textContent='copy URL'; }, 1200); }); }
              }, { once:true });
            }
            out.textContent = '⏳ GET ' + url + ' ...';

            try {
              const res = await fetch(url, { method:'GET', headers:{ 'Authorization': authHeader(CFG.sessionToken) }});
              const txt = await res.text();
              let pretty = txt; try { pretty = JSON.stringify(JSON.parse(txt), null, 2); } catch {}
              out.textContent = pretty;
              const credHint = (res.status === 401 || res.status === 403) ? ' · 🔐 Check token/permissions' : '';
              if (sum) sum.innerHTML = \`\${icon} \${type} response — \${res.status} \${res.statusText}\${credHint} — <code>\${id}</code> · <a href="#" data-copy="\${rowIdx}">copy URL</a>\`;
            } catch (err) {
              if (sum) sum.textContent = \`❌ Error fetching \${type} — \${id}\`;
              out.textContent = '❌ Error: ' + (err && err.message ? err.message : String(err));
            }
          }

          // Botones de producto
          qa('[data-action="get-product"]').forEach(btn => {
            btn.addEventListener('click', async () => {
              if (btn.disabled) return;
              const original = btn.textContent;
              btn.disabled = true; btn.textContent = '…';
              await runFetch({
                type:'Product',
                id: btn.getAttribute('data-productid'),
                rowIdx: btn.getAttribute('data-row'),
                path:'/rest/v1/products',
                detId:'productdet',
                outId:'productout',
                icon:'📦'
              });
              btn.disabled = false; btn.textContent = original;
            });
          });

          // Botones de price
          qa('[data-action="get-price"]').forEach(btn => {
            btn.addEventListener('click', async () => {
              if (btn.disabled) return;
              const original = btn.textContent;
              btn.disabled = true; btn.textContent = '…';
              await runFetch({
                type:'Price',
                id: btn.getAttribute('data-priceid'),
                rowIdx: btn.getAttribute('data-row'),
                path:'/rest/v1/prices',
                detId:'pricedet',
                outId:'priceout',
                icon:'💰'
              });
              btn.disabled = false; btn.textContent = original;
            });
          });

        })();
        </script>
    `);

} else {
    console.log("❌ Request failed with status:", pm.response.code);
    pm.visualizer.set(`<h3 style="color:red;">❌ Request failed - Status ${pm.response.code}</h3>`);
}
