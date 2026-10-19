"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileJson, FileSpreadsheet, History, ImageOff, Info, Trash2 } from "lucide-react";
import AllergenResults from "./AllergenResults";
import { ASSESSMENT_META, ALLERGENS } from "@/lib/allergens";
import {
  clearHistory,
  deleteHistory,
  downloadTextFile,
  historyToCsv,
  historyToJson,
  loadHistory,
} from "@/lib/storage";
import { useProfile } from "@/lib/use-profile";

const TONE = {
  red: "border-red-300 bg-red-50 text-red-900",
  orange: "border-orange-300 bg-orange-50 text-orange-900",
  slate: "border-slate-300 bg-slate-100 text-navy-800",
};

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function ScanHistory() {
  const [records, setRecords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [message, setMessage] = useState("");
  const { profile } = useProfile();

  useEffect(() => {
    setRecords(loadHistory());
    setLoaded(true);
  }, []);

  const open = records.find((r) => r.id === openId);

  function remove(id) {
    if (!window.confirm("Delete this scan from your history?")) return;
    const res = deleteHistory(id);
    if (!res.ok) setMessage(res.error);
    setRecords(loadHistory());
    if (openId === id) setOpenId(null);
  }

  function clearAll() {
    if (!window.confirm("Delete ALL saved scans from this device? This cannot be undone.")) return;
    const res = clearHistory();
    if (!res.ok) setMessage(res.error);
    setRecords(loadHistory());
    setOpenId(null);
  }

  const stamp = new Date().toISOString().slice(0, 10);

  if (open) {
    return (
      <div>
        <button type="button" onClick={() => setOpenId(null)} className="btn-secondary mb-5">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to history
        </button>
        <p className="mb-4 text-sm text-navy-600">Scanned {formatDate(open.savedAt)}</p>
        <AllergenResults
          result={open.result}
          imageSrc={open.thumbnail}
          userAllergens={profile.allergens}
          extraActions={
            <button type="button" onClick={() => remove(open.id)} className="btn-danger">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete this scan
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Scan History</h1>
      <p className="mt-2 max-w-2xl text-navy-700">Scans you chose to save appear here.</p>

      <div className="mt-5 flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-navy-700 shadow-card">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
        <p>
          History is stored only in this browser (up to 50 scans). It may be lost if you clear browser
          data or use private browsing, so export anything you need to keep. Only a small thumbnail is
          saved, never the original photo.
        </p>
      </div>

      {message && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-800">
          {message}
        </p>
      )}

      {loaded && records.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => downloadTextFile(`allerscan-history-${stamp}.json`, historyToJson(records), "application/json")}
          >
            <FileJson className="h-4 w-4" aria-hidden="true" />
            Export JSON
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => downloadTextFile(`allerscan-history-${stamp}.csv`, historyToCsv(records), "text/csv")}
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>
          <button type="button" className="btn-danger" onClick={clearAll}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear history
          </button>
        </div>
      )}

      {loaded && records.length === 0 && (
        <div className="card mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <History className="h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="font-semibold">No saved scans yet</p>
          <p className="max-w-sm text-sm text-navy-600">
            After a scan, choose “Save to Scan History” to keep the result on this device.
          </p>
          <Link href="/scan" className="btn-primary mt-2">
            Scan Food
          </Link>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {records.map((r) => {
          const meta = ASSESSMENT_META[r.overallAssessment] || ASSESSMENT_META.verification_required;
          const flagged = r.result.allergens.filter((a) => a.status === "detected" || a.status === "possible");
          return (
            <li key={r.id} className="card flex gap-4 p-3 sm:p-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-24">
                {r.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="h-6 w-6 text-slate-400" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold">{r.foodName}</h2>
                <p className="text-xs text-navy-600">
                  {formatDate(r.savedAt)} · {r.mode === "label" ? "Label scan" : "Food scan"} · Analysis {r.status}
                </p>
                <p className={`mt-2 inline-flex rounded-lg border px-2 py-0.5 text-xs font-semibold ${TONE[meta.tone]}`}>
                  {meta.label}
                </p>
                <p className="mt-2 text-sm text-navy-800">
                  {flagged.length
                    ? flagged
                        .map((a) => `${ALLERGENS[a.id]?.short || a.name}${a.status === "possible" ? " (possible)" : ""}`)
                        .join(", ")
                    : "No allergens flagged. This does not confirm the food is allergen-free."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setOpenId(r.id)} className="btn-secondary min-h-[40px] px-3">
                    <Download className="h-4 w-4 rotate-180" aria-hidden="true" />
                    Open result
                  </button>
                  <button type="button" onClick={() => remove(r.id)} className="btn-danger min-h-[40px] px-3">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>Delete</span>
                    <span className="sr-only"> {r.foodName}</span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
