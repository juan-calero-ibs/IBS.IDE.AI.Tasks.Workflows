const currentName = pm.info.requestName || "Unnamed Request";
const currentTime = pm.response.responseTime;

/**
 * Convert Postman query params into a plain object.
 * If the same key appears multiple times, store as array.
 */
function getQueryParamsObject(url) {
    const result = {};

    if (!url || !url.query || !Array.isArray(url.query.all())) {
        return result;
    }

    url.query.all().forEach(param => {
        if (!param || param.disabled || !param.key) return;

        const key = param.key;
        const value = param.value !== undefined ? String(param.value) : "";

        if (Object.prototype.hasOwnProperty.call(result, key)) {
            if (Array.isArray(result[key])) {
                result[key].push(value);
            } else {
                result[key] = [result[key], value];
            }
        } else {
            result[key] = value;
        }
    });

    return result;
}

function normalizeValue(value) {
    if (Array.isArray(value)) {
        return [...value].map(String).sort();
    }
    return String(value);
}

function sameValue(a, b) {
    const na = normalizeValue(a);
    const nb = normalizeValue(b);

    if (Array.isArray(na) && Array.isArray(nb)) {
        if (na.length !== nb.length) return false;
        return na.every((v, i) => v === nb[i]);
    }

    return na === nb;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatValue(value) {
    if (Array.isArray(value)) {
        return value.join(", ");
    }
    return String(value);
}

function diffQueryParams(previousParams, currentParams) {
    const allKeys = Array.from(
        new Set([
            ...Object.keys(previousParams || {}),
            ...Object.keys(currentParams || {})
        ])
    ).sort();

    const changed = [];

    allKeys.forEach(key => {
        const hasPrev = Object.prototype.hasOwnProperty.call(previousParams, key);
        const hasCurr = Object.prototype.hasOwnProperty.call(currentParams, key);

        if (hasPrev && !hasCurr) {
            changed.push({
                key,
                type: "removed",
                previousValue: previousParams[key],
                currentValue: null
            });
            return;
        }

        if (!hasPrev && hasCurr) {
            changed.push({
                key,
                type: "added",
                previousValue: null,
                currentValue: currentParams[key]
            });
            return;
        }

        if (!sameValue(previousParams[key], currentParams[key])) {
            changed.push({
                key,
                type: "changed",
                previousValue: previousParams[key],
                currentValue: currentParams[key]
            });
        }
    });

    return changed;
}

// Current request query params
const currentParams = getQueryParamsObject(pm.request.url);

// Previous request info
const previousName = pm.environment.get("benchmark_prev_name");
const previousTimeRaw = pm.environment.get("benchmark_prev_time");
const previousParamsRaw = pm.environment.get("benchmark_prev_query_params");

const previousTime = previousTimeRaw !== null ? Number(previousTimeRaw) : null;
const previousParams = previousParamsRaw ? JSON.parse(previousParamsRaw) : null;

if (previousName !== null && previousTime !== null && previousParams !== null && !Number.isNaN(previousTime)) {
    const diff = currentTime - previousTime;
    const absDiff = Math.abs(diff);
    const faster = diff < 0 ? currentName : diff > 0 ? previousName : "Tie";
    const percentChange =
        previousTime > 0 ? ((diff / previousTime) * 100).toFixed(1) : "N/A";

    const changedParams = diffQueryParams(previousParams, currentParams);

    const currentBar = Math.max(8, Math.round((currentTime / Math.max(currentTime, previousTime)) * 100));
    const previousBar = Math.max(8, Math.round((previousTime / Math.max(currentTime, previousTime)) * 100));

    let changedParamsRows = "";
    if (changedParams.length === 0) {
        changedParamsRows = `
            <tr>
                <td colspan="4" style="padding:8px;">No query parameter differences</td>
            </tr>
        `;
    } else {
        changedParamsRows = changedParams.map(item => `
            <tr>
                <td style="padding:8px;">${escapeHtml(item.key)}</td>
                <td style="padding:8px;">${escapeHtml(item.type)}</td>
                <td style="padding:8px;">${item.previousValue === null ? "-" : escapeHtml(formatValue(item.previousValue))}</td>
                <td style="padding:8px;">${item.currentValue === null ? "-" : escapeHtml(formatValue(item.currentValue))}</td>
            </tr>
        `).join("");
    }

    const template = `
    <div style="font-family: Arial, sans-serif; padding: 16px; line-height: 1.4;">
        <h2 style="margin-top: 0;">Request Benchmark</h2>
        <p style="margin-bottom: 16px;">
            Comparing <strong>current request</strong> vs <strong>previously run request</strong>
        </p>

        <table style="border-collapse: collapse; width: 100%; margin-bottom: 18px;">
            <thead>
                <tr>
                    <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Request</th>
                    <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Time (ms)</th>
                    <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Relative</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding:8px;">${escapeHtml(previousName)}</td>
                    <td style="padding:8px;">${previousTime}</td>
                    <td style="padding:8px; width:50%;">
                        <div style="background:#e9ecef; border-radius:4px; height:16px; overflow:hidden;">
                            <div style="background:#6c757d; width:${previousBar}%; height:100%;"></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:8px;">${escapeHtml(currentName)}</td>
                    <td style="padding:8px;">${currentTime}</td>
                    <td style="padding:8px; width:50%;">
                        <div style="background:#e9ecef; border-radius:4px; height:16px; overflow:hidden;">
                            <div style="background:#0d6efd; width:${currentBar}%; height:100%;"></div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <h3 style="margin-bottom: 8px;">Performance Summary</h3>
        <p><strong>Faster:</strong> ${escapeHtml(faster)}</p>
        <p><strong>Difference:</strong> ${absDiff} ms</p>
        <p><strong>Change vs previous:</strong> ${percentChange === "N/A" ? "N/A" : percentChange + "%"}</p>
        <p><strong>Trend:</strong> ${
            diff < 0 ? "Current request is faster 🚀" :
            diff > 0 ? "Current request is slower 🐢" :
            "Same timing 🤝"
        }</p>

        <h3 style="margin: 20px 0 8px;">Different Query Parameters</h3>
        <table style="border-collapse: collapse; width: 100%;">
            <thead>
                <tr>
                    <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Parameter</th>
                    <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Type</th>
                    <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Previous</th>
                    <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Current</th>
                </tr>
            </thead>
            <tbody>
                ${changedParamsRows}
            </tbody>
        </table>
    </div>
    `;

    pm.visualizer.set(template);
} else {
    const template = `
    <div style="font-family: Arial, sans-serif; padding: 16px;">
        <h2 style="margin-top: 0;">Request Benchmark</h2>
        <p>No previous request found yet.</p>
        <p>Run another request, and this visualizer will compare it against this one 📊</p>

        <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
            <thead>
                <tr>
                    <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Current Request</th>
                    <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Time (ms)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding:8px;">${escapeHtml(currentName)}</td>
                    <td style="padding:8px;">${currentTime}</td>
                </tr>
            </tbody>
        </table>
    </div>
    `;

    pm.visualizer.set(template);
}

// Save current request as previous for next run
pm.environment.set("benchmark_prev_name", currentName);
pm.environment.set("benchmark_prev_time", String(currentTime));
pm.environment.set("benchmark_prev_query_params", JSON.stringify(currentParams));

pm.test("Response time captured for rolling benchmark", function () {
    pm.expect(currentTime).to.be.a("number");
});