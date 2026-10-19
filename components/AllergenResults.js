"use client";

import { useRef, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  ImageOff,
  ListChecks,
  RotateCcw,
  Salad,
  ScanSearch,
} from "lucide-react";
import AllergenBadge, { StatusLegend } from "./AllergenBadge";
import IngredientList from "./IngredientList";
import SafetyNotice from "./SafetyNotice";
import { ALLERGENS, ASSESSMENT_META, EVIDENCE_LABELS, MARKETS } from "@/lib/allergens";

const ASSESSMENT_STYLES = {
  red: "border-red-300 bg-red-50 text-red-900",
  orange: "border-orange-300 bg-orange-50 text-orange-900",
  slate: "border-slate-300 bg-slate-100 text-navy-800",
};

const SUMMARY_TILE = {
  detected: "border-red-300 bg-red-50 text-red-900",
  possible: "border-orange-300 bg-orange-50 text-orange-900",
  unknown: "border-dashed border-slate-400 bg-white text-navy-800",
  not_identified: "border-slate-300 bg-slate-100 text-navy-700",
};

function PersonalAlerts({ result, userAllergens }) {
  if (!userAllergens?.length) return null;
  const mine = result.allergens.filter((a) => userAllergens.includes(a.id));
  if (!mine.length) return null;

  const detected = mine.filter((a) => a.status === "detected");
  const unresolved = mine.filter((a) => a.status !== "detected");

  return (
    <section aria-labelledby="personal-alerts" className="space-y-3">
      <h2 id="personal-alerts" className="text-lg font-bold">
        Your allergy alerts
      </h2>
      {detected.map((a) => (
        <div
          key={a.id}
          role="alert"
          className="flex gap-3 rounded-2xl border-2 border-red-400 bg-red-50 p-4 text-red-950"
        >
          <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">{ALLERGENS[a.id].short}: detected or declared</p>
            <p className="mt-1 text-sm">{a.reason}</p>
          </div>
        </div>
      ))}
      {unresolved.length > 0 && (
        <div className="flex gap-3 rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 text-orange-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">Cannot be ruled out for you</p>
            <p className="mt-1 text-sm">
              {unresolved.map((a) => ALLERGENS[a.id].short).join(", ")}:{" "}
              {unresolved.some((a) => a.status === "possible")
                ? "some may be present, and "
                : ""}
              a photo cannot confirm these are absent. Verify the full ingredient label and
              manufacturer information before eating.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function FindingCard({ finding }) {
  return (
    <li
      className={`rounded-2xl border bg-white p-4 shadow-card ${
        finding.userAllergen ? "border-navy-800 ring-1 ring-navy-800/20" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold">{ALLERGENS[finding.id]?.name || finding.name}</h3>
        <AllergenBadge status={finding.status} />
        {finding.userAllergen && (
          <span className="rounded-full bg-navy-900 px-2.5 py-1 text-xs font-semibold text-white">
            Your allergy
          </span>
        )}
      </div>

      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-navy-700">Evidence source</dt>
          <dd className="mt-0.5">
            {EVIDENCE_LABELS[finding.evidenceType] || "Not specified"}
            {finding.confidence ? ` · ${finding.confidence} confidence` : ""}
          </dd>
        </div>
        {finding.possibleIngredient && (
          <div>
            <dt className="font-semibold text-navy-700">Possible ingredient responsible</dt>
            <dd className="mt-0.5">{finding.possibleIngredient}</dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="font-semibold text-navy-700">Explanation</dt>
          <dd className="mt-0.5 leading-relaxed">{finding.reason}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-semibold text-navy-700">Suggested verification</dt>
          <dd className="mt-0.5 leading-relaxed">{finding.recommendedAction}</dd>
        </div>
      </dl>
    </li>
  );
}

export default function AllergenResults({
  result,
  imageSrc,
  userAllergens = [],
  onScanAnother,
  onSave,
  saveState = "idle",
  saveError,
  extraActions,
}) {
  const [filter, setFilter] = useState("all");
  const ingredientsRef = useRef(null);
  const detailsRef = useRef(null);

  const assessment = ASSESSMENT_META[result.overallAssessment] || ASSESSMENT_META.verification_required;
  const counts = result.allergens.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const shown =
    filter === "attention"
      ? result.allergens.filter((a) => a.status !== "not_identified")
      : result.allergens;

  const marketName = MARKETS[result.market]?.name;

  function reviewPotential() {
    setFilter("attention");
    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    detailsRef.current?.focus({ preventScroll: true });
  }
  function viewIngredients() {
    ingredientsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    ingredientsRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className="space-y-6">
      {result.needsClearerImage && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-orange-300 bg-orange-50 p-4 text-orange-950">
          <ImageOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">The label was not fully readable</p>
            <p className="mt-1 text-sm">
              Please upload a clearer, well-lit, in-focus photo of the whole ingredient list. Until then,
              treat every result below as incomplete.
            </p>
          </div>
        </div>
      )}

      <PersonalAlerts result={result} userAllergens={userAllergens} />

      {/* Food identification */}
      <section aria-labelledby="identification" className="card overflow-hidden">
        <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
          <div className="flex min-h-[160px] items-center justify-center bg-slate-100">
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc} alt={`Photo of ${result.foodName}`} className="h-full max-h-72 w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 p-6 text-sm text-navy-600">
                <ImageOff className="h-6 w-6" aria-hidden="true" />
                No image saved
              </span>
            )}
          </div>
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              {result.mode === "label" ? "Packaged product" : "Identified food"}
            </p>
            <h2 id="identification" className="mt-1 text-2xl font-bold">
              {result.foodName}
            </h2>
            {result.brand && <p className="text-sm text-navy-600">Brand: {result.brand}</p>}
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-semibold text-navy-700">Category</dt>
                <dd>{result.foodCategory}</dd>
              </div>
              <div>
                <dt className="font-semibold text-navy-700">Identification confidence</dt>
                <dd className="capitalize">{result.identificationConfidence}</dd>
              </div>
            </dl>
            <p
              className={`mt-4 inline-flex rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                ASSESSMENT_STYLES[assessment.tone]
              }`}
            >
              Overall: {assessment.label}
            </p>
            <p className="mt-2 text-sm text-navy-600">
              Never means “safe”. {marketName ? `Checked against: ${marketName}.` : ""}
            </p>
          </div>
        </div>
      </section>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {onScanAnother && (
          <button type="button" onClick={onScanAnother} className="btn-primary">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Scan Another Food
          </button>
        )}
        <button type="button" onClick={viewIngredients} className="btn-secondary">
          <Salad className="h-4 w-4" aria-hidden="true" />
          View Ingredients
        </button>
        <button type="button" onClick={reviewPotential} className="btn-secondary">
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          Review Potential Allergens
        </button>
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saveState === "saved"}
            className="btn-secondary"
          >
            {saveState === "saved" ? (
              <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Bookmark className="h-4 w-4" aria-hidden="true" />
            )}
            {saveState === "saved" ? "Saved to History" : "Save to Scan History"}
          </button>
        )}
        {extraActions}
      </div>
      {saveError && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {saveError}
        </p>
      )}

      {/* Allergen summary */}
      <section aria-labelledby="summary" className="space-y-3">
        <h2 id="summary" className="text-lg font-bold">
          Allergen summary
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["detected", "possible", "unknown", "not_identified"].map((s) => (
            <li key={s} className={`rounded-2xl border p-3 ${SUMMARY_TILE[s]}`}>
              <p className="text-2xl font-bold">{counts[s] || 0}</p>
              <p className="text-xs font-semibold">
                {{
                  detected: "Detected / declared",
                  possible: "May be present",
                  unknown: "Unknown",
                  not_identified: "Not identified",
                }[s]}
              </p>
            </li>
          ))}
        </ul>
        <StatusLegend />
        <p className="text-sm text-navy-600">
          “Not identified” means nothing in the available information pointed to that allergen. It does
          not mean the food is free of it.
        </p>
      </section>

      {/* Allergen details */}
      <section
        ref={detailsRef}
        tabIndex={-1}
        aria-labelledby="details"
        className="scroll-mt-20 space-y-3 focus:outline-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="details" className="text-lg font-bold">
            Allergen details
          </h2>
          <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1 text-sm" role="group" aria-label="Filter allergens">
            {[
              ["all", "All"],
              ["attention", "Needs attention"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`min-h-[36px] rounded-lg px-3 font-medium ${
                  filter === key ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="card p-4 text-sm text-navy-700">
            No allergens were flagged from the available evidence. That is not confirmation the food is
            free of allergens.
          </p>
        ) : (
          <ul className="space-y-3">
            {shown.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </ul>
        )}
      </section>

      {/* Ingredients */}
      <section
        ref={ingredientsRef}
        tabIndex={-1}
        aria-labelledby="ingredients"
        className="card scroll-mt-20 p-5 focus:outline-none"
      >
        <h2 id="ingredients" className="mb-4 flex items-center gap-2 text-lg font-bold">
          <ScanSearch className="h-5 w-5 text-brand-700" aria-hidden="true" />
          Ingredients
        </h2>
        <IngredientList result={result} />
      </section>

      {/* Limitations */}
      <section aria-labelledby="limits" className="card p-5">
        <h2 id="limits" className="text-lg font-bold">
          Limitations of this assessment
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-navy-800">
          {result.limitations.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
          {result.crossContactRisk === "precautionary_statement_present" ? (
            <li>The packaging carries a precautionary (“may contain” / shared facility) statement.</li>
          ) : (
            <li>Cross-contact risk is unknown. It is never assumed to be zero.</li>
          )}
        </ul>
      </section>

      <SafetyNotice />
    </div>
  );
}
