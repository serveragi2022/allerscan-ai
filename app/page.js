import Link from "next/link";
import { Camera, FileSearch, ImagePlus, ListChecks, ScanBarcode } from "lucide-react";
import AllergenBadge, { StatusLegend } from "@/components/AllergenBadge";
import SafetyNotice from "@/components/SafetyNotice";
import { ALLERGENS, ALLERGEN_IDS } from "@/lib/allergens";

const STEPS = [
  {
    icon: Camera,
    title: "Photograph or upload",
    text: "Take a photo of a meal, or of the front and back of a packaged product.",
  },
  {
    icon: FileSearch,
    title: "AI reads what it can",
    text: "A vision model identifies the food, visible ingredients, and any ingredient label text.",
  },
  {
    icon: ListChecks,
    title: "Review, then verify",
    text: "See detected, possible and unknown allergens with evidence, and what to check next.",
  },
];

// Illustrative only. Never produced by a real scan.
const EXAMPLE = [
  {
    name: "Wheat",
    status: "detected",
    evidence: "Ingredient label",
    reason: "“Wheat flour” is listed in the ingredients and declared in the Contains statement.",
  },
  {
    name: "Milk and dairy",
    status: "possible",
    evidence: "Visual inference (AI guess)",
    reason: "The creamy sauce may contain milk or cream, but its ingredients are not shown.",
  },
  {
    name: "Sesame",
    status: "unknown",
    evidence: "No evidence available",
    reason: "Part of the label is cut off, so sesame cannot be assessed.",
  },
  {
    name: "Peanuts",
    status: "not_identified",
    evidence: "No evidence available",
    reason: "Nothing in the available information points to peanuts. This is not proof they are absent.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-14">
      <section className="rounded-3xl bg-gradient-to-br from-brand-50 via-white to-white p-6 ring-1 ring-brand-100 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">AllerScan AI</p>
        <h1 className="mt-2 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Know What&apos;s in Your Food.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-navy-700">
          Photograph a meal or an ingredient label and get an AI-assisted look at which allergens are
          detected, possible, or still unknown, with the reasons why.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/scan" className="btn-primary px-6 py-3 text-base">
            <Camera className="h-5 w-5" aria-hidden="true" />
            Scan Food
          </Link>
          <Link href="/scan" className="btn-secondary px-6 py-3 text-base">
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
            Upload an image
          </Link>
          <Link href="/label" className="btn-secondary px-6 py-3 text-base">
            <ScanBarcode className="h-5 w-5" aria-hidden="true" />
            Scan a label
          </Link>
        </div>
        <p className="mt-4 text-sm text-navy-600">No account needed. Your allergy profile stays in your browser.</p>
      </section>

      <SafetyNotice />

      <section aria-labelledby="how">
        <h2 id="how" className="text-2xl font-bold">
          How it works
        </h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-bold">
                {i + 1}. {title}
              </h3>
              <p className="mt-1 text-sm text-navy-700">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="example">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="example" className="text-2xl font-bold">
            Example results
          </h2>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-navy-800">
            Sample only, not a real scan
          </span>
        </div>
        <div className="card mt-5 p-5">
          <p className="text-sm text-navy-600">Sample: packaged pasta in cream sauce</p>
          <ul className="mt-4 divide-y divide-slate-200">
            {EXAMPLE.map((e) => (
              <li key={e.name} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{e.name}</h3>
                  <AllergenBadge status={e.status} />
                </div>
                <p className="mt-1 text-sm text-navy-800">{e.reason}</p>
                <p className="mt-0.5 text-xs text-navy-600">Evidence: {e.evidence}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <StatusLegend />
            <p className="mt-2 text-xs text-navy-600">
              There is no “safe” color. A gray result only means nothing was found in the available
              information.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="supported">
        <h2 id="supported" className="text-2xl font-bold">
          Supported allergen categories
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-navy-700">
          Countries use different official lists. Choose your market in My Allergies to match your local labeling rules.
        </p>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ALLERGEN_IDS.map((id) => (
            <li key={id} className="card px-4 py-3 text-sm font-semibold">
              {ALLERGENS[id].short}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
