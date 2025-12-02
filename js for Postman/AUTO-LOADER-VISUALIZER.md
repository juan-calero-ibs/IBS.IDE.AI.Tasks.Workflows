# 🚀 Postman Visualizer Auto-Loader
A unified script that automatically detects the API endpoint and loads the correct Visualizer renderer for APS/UMT requests.

This eliminates having to paste individual scripts inside each request.

---

## 1️⃣ Auto-loader Script (paste in **Tests** tab at Collection level)

```javascript
// === Generic Visualizer Auto-Loader ===============================
// 1) Parses JSON response
// 2) Builds a key from the URL path: /rest/v1/reservations/conf
//    → rest.v1.reservations.conf
// 3) Looks up and runs the matching visualizer
// =================================================================

// 1. Parse JSON response safely
let jsonData = {};
try {
    jsonData = pm.response.json();
} catch (e) {
    console.warn('Response is not JSON, visualizer skipped:', e);
    pm.visualizer.set(
        `<pre style="font-family: monospace; white-space: pre-wrap;">
No JSON body in response. Status: {{status}}

Raw body:
{{body}}
</pre>`,
        {
            status: pm.response.code + ' ' + pm.response.status,
            body: pm.response.text()
        }
    );
    return;
}

// 2. Build visualizer key from request path
const rawPath = pm.request.url.getPath();            // e.g. "/rest/v1/reservations/conf"
const visualizerKey = rawPath
    .replace(/^\/+|\/+$/g, '')                        // trim leading/trailing "/"
    .replace(/\//g, '.');                             // replace "/" with "."

// 3. Registry of visualizer functions by key
//    👉 Add your endpoint-specific renderers here.
const visualizers = {
    // Example:
    // 'rest.v1.reservations.conf': visualize_reservations_conf,
    // 'rest.v1.availability.hotels': visualize_availability_hotels,
};

// 4. Default visualizer (fallback)
function defaultVisualizer(pm, data) {
    const template = `
        <h2>🔍 Default JSON Viewer</h2>
        <p>No specific visualizer was found for <code>{{key}}</code>.</p>
        <pre style="font-family: monospace; white-space: pre-wrap; background:#f5f5f5; padding:8px;">
{{json}}
        </pre>
    `;
    pm.visualizer.set(template, {
        key: visualizerKey,
        json: JSON.stringify(data, null, 2)
    });
}

// 5. Resolve and execute the visualizer
const renderer = visualizers[visualizerKey] || defaultVisualizer;
renderer(pm, jsonData);
