// Local-only persistence (browser localStorage). No account, no server storage.
// Data can be lost if the person clears browser data or uses private browsing.
// Only a small thumbnail is kept for each scan, never the original photo.

import { DEFAULT_MARKET, ALLERGEN_IDS, MARKET_IDS, ALLERGENS, STATUS_META } from "./allergens";

const PROFILE_KEY = "allerscan.profile.v1";
const HISTORY_KEY = "allerscan.history.v1";
export const MAX_HISTORY = 50;

function hasStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function read(key, fallback) {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (!hasStorage()) return { ok: false, error: "Your browser is blocking local storage." };
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save: browser storage is full or unavailable." };
  }
}

// ---------- Profile ----------

export function defaultProfile() {
  return { allergens: [], market: DEFAULT_MARKET };
}

export function loadProfile() {
  const stored = read(PROFILE_KEY, null);
  if (!stored || typeof stored !== "object") return defaultProfile();
  return {
    allergens: Array.isArray(stored.allergens)
      ? stored.allergens.filter((id) => ALLERGEN_IDS.includes(id))
      : [],
    market: MARKET_IDS.includes(stored.market) ? stored.market : DEFAULT_MARKET,
  };
}

export function saveProfile(profile) {
  const res = write(PROFILE_KEY, profile);
  if (res.ok && typeof window !== "undefined") {
    window.dispatchEvent(new Event("allerscan:profile"));
  }
  return res;
}

// ---------- History ----------

export function loadHistory() {
  const items = read(HISTORY_KEY, []);
  return Array.isArray(items) ? items : [];
}

export function addHistory({ result, thumbnail }) {
  const record = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    mode: result.mode,
    foodName: result.foodName,
    overallAssessment: result.overallAssessment,
    status: "completed",
    thumbnail: thumbnail || null,
    result,
  };
  const next = [record, ...loadHistory()].slice(0, MAX_HISTORY);
  const res = write(HISTORY_KEY, next);
  return res.ok ? { ok: true, record } : res;
}

export function deleteHistory(id) {
  return write(HISTORY_KEY, loadHistory().filter((r) => r.id !== id));
}

export function clearHistory() {
  return write(HISTORY_KEY, []);
}

// ---------- Export ----------

function names(result, status) {
  return result.allergens
    .filter((a) => a.status === status)
    .map((a) => ALLERGENS[a.id]?.short || a.name)
    .join("; ");
}

// Prevent spreadsheet formula injection and escape for CSV.
function csvCell(value) {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function historyToCsv(records) {
  const header = [
    "scanned_at", "mode", "food_name", "overall_assessment",
    "detected", "possible", "unknown", "not_identified", "visible_ingredients",
  ];
  const rows = records.map((r) =>
    [
      r.savedAt,
      r.mode,
      r.foodName,
      r.overallAssessment,
      names(r.result, "detected"),
      names(r.result, "possible"),
      names(r.result, "unknown"),
      names(r.result, "not_identified"),
      (r.result.visibleIngredients || []).join("; "),
    ].map(csvCell).join(",")
  );
  return [header.join(","), ...rows].join("\r\n");
}

export function historyToJson(records) {
  // Thumbnails are left out to keep the report small and readable.
  const slim = records.map(({ thumbnail, ...rest }) => rest);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      disclaimer:
        "AI-generated, informational only. Not a confirmation that any food is safe for someone with a food allergy.",
      statusLegend: Object.fromEntries(Object.entries(STATUS_META).map(([k, v]) => [k, v.label])),
      scans: slim,
    },
    null,
    2
  );
}

export function downloadTextFile(filename, text, mime) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
