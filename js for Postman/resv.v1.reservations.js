// Generate CURL to increase reservation rate by 50%

// Read reservation from the response
const json = pm.response.json();
let r = json.reservation;

// --- 1) Main product --- //
let prod = r.products[0];
let factor = 1.5;

// Base amount
let baseAmount = prod.amount || prod.totalAmount;
let inflated = +(baseAmount * factor).toFixed(2);

// --- 2) Inflate SELL PRICE --- //
prod.amount = inflated;
prod.amountFromPrice = inflated;
prod.subTotal = inflated;
prod.totalAmount = inflated;
prod.totalAmountFromPrice = inflated;

// Inflate productCalendar (sell price)
if (prod.productCalendar && prod.productCalendar.length > 0) {
    let pc = prod.productCalendar[0];
    pc.amount = inflated;
    pc.amountFromPrice = inflated;
    pc.totalAmount = inflated;
}

// --- 3) Inflate FULFILLMENT FIELDS --- //
function inflateField(obj, field) {
    if (obj[field] !== null && obj[field] !== undefined) {
        obj[field] = +(obj[field] * factor).toFixed(2);
    }
}

// Fulfillment fields on main product
[
  "fulfillmentAmount",
  "fulfillmentAmountFromPrice",
  "fulfillmentTotalAmount",
  "fulfillmentTotalAmountFromPrice",
  "fulfillmentTaxAmount",
  "fulfillmentTotalTaxAmount"
].forEach(f => inflateField(prod, f));

// Fulfillment fields on productCalendar
if (prod.productCalendar && prod.productCalendar.length > 0) {
    let pc = prod.productCalendar[0];

    [
      "fulfillmentAmount",
      "fulfillmentAmountFromPrice",
      "fulfillmentTotalAmount",
      "fulfillmentTotalAmountFromPrice",
      "fulfillmentTaxAmount",
      "fulfillmentTotalTaxAmount"
    ].forEach(f => inflateField(pc, f));
}

// --- 4) Update reservation summary --- //
if (r.reservationSummaries) {
    r.reservationSummaries.roomProductSubTotal = inflated;
}

// --- 5) Build JSON body --- //
let bodyJson = JSON.stringify(r, null, 4);

// writeReservation ID
let writeResId = pm.variables.get("writeReservationID") || r.id;

// --- 6) Build final CURL --- //
let curl = `
curl --location --request PUT 'http://localhost:8080/task/reservation_admin/writeReservation/${writeResId}' \\
--header 'Accept: application/json' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Basic YWRtaW46cGFzc3dvcmQx' \\
--data-raw '${bodyJson}'
`;

// --- 7) Display in Visualizer --- //
pm.visualizer.set("<pre>" + curl.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</pre>");
