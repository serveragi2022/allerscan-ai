"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Loader2, ScanSearch, UserRound, XCircle } from "lucide-react";
import ImagePreview from "./ImagePreview";
import AllergenResults from "./AllergenResults";
import SafetyNotice from "./SafetyNotice";
import SetupNotice from "./SetupNotice";
import { prepareImage, makeThumbnail } from "@/lib/image-client";
import { postForm } from "@/lib/api-client";
import { addHistory } from "@/lib/storage";
import { useProfile } from "@/lib/use-profile";
import { ALLERGENS } from "@/lib/allergens";

const MODES = {
  food: {
    title: "Scan Food",
    intro: "Take or upload a photo of a meal or food item. We will estimate what it is and flag possible allergens.",
    endpoint: "/api/analyze-food",
    slots: [
      { key: "image", label: "Food photo", hint: "Fill most of the frame, in good light." },
    ],
    maxDim: 1280,
    cta: "Analyze food",
  },
  label: {
    title: "Scan Label",
    intro:
      "Photograph the front and back of a packaged product. The ingredient list on the back is the most important part.",
    endpoint: "/api/analyze-label",
    slots: [
      { key: "front", label: "Front of package (optional)", hint: "Shows the product name and brand." },
      { key: "back", label: "Back of package: ingredients", hint: "Keep the ingredient list sharp and flat, without glare." },
    ],
    maxDim: 1800,
    cta: "Read label & analyze",
  },
};

const STEPS = [
  { key: "uploading", label: "Uploading images securely" },
  { key: "analyzing", label: "Analyzing with AI" },
  { key: "validating", label: "Validating the results" },
];

function Progress({ stage, onCancel }) {
  const order = STEPS.map((s) => s.key);
  const current = order.indexOf(stage);
  return (
    <div className="card p-5" role="status" aria-live="polite">
      <p className="font-bold">Analysis in progress</p>
      <p className="mt-1 text-sm text-navy-600">This usually takes 5 to 20 seconds.</p>
      <ol className="mt-4 space-y-3">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.key} className={`flex items-center gap-3 text-sm ${active ? "font-semibold" : done ? "" : "text-navy-600"}`}>
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-brand-700" aria-hidden="true" />
              ) : active ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand-700" aria-hidden="true" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300" aria-hidden="true" />
              )}
              {s.label}
              {done && <span className="sr-only"> (done)</span>}
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={onCancel} className="btn-secondary mt-5">
        Cancel
      </button>
    </div>
  );
}

export default function FoodScanner({ mode = "food" }) {
  const config = MODES[mode];
  const { profile, ready } = useProfile();

  const [images, setImages] = useState({}); // slotKey -> { blob, previewUrl, width, height }
  const [busySlot, setBusySlot] = useState(null);
  const [slotErrors, setSlotErrors] = useState({});
  const [context, setContext] = useState("");
  const [stage, setStage] = useState("idle"); // idle | uploading | analyzing | validating
  const [error, setError] = useState(null); // { message, code }
  const [result, setResult] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const abortRef = useRef(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const topRef = useRef(null);

  // Release object URLs when leaving the page.
  useEffect(() => {
    return () => {
      Object.values(imagesRef.current).forEach((img) => img?.previewUrl && URL.revokeObjectURL(img.previewUrl));
      abortRef.current?.abort();
    };
  }, []);

  const analyzing = stage !== "idle";
  const hasImage = Object.values(images).some(Boolean);

  async function handleFile(slotKey, file) {
    setSlotErrors((e) => ({ ...e, [slotKey]: "" }));
    setError(null);
    setBusySlot(slotKey);
    try {
      const prepared = await prepareImage(file, { maxDim: config.maxDim });
      setImages((prev) => {
        if (prev[slotKey]?.previewUrl) URL.revokeObjectURL(prev[slotKey].previewUrl);
        return { ...prev, [slotKey]: prepared };
      });
    } catch (err) {
      setSlotErrors((e) => ({ ...e, [slotKey]: err.message }));
    } finally {
      setBusySlot(null);
    }
  }

  function clearSlot(slotKey) {
    setImages((prev) => {
      if (prev[slotKey]?.previewUrl) URL.revokeObjectURL(prev[slotKey].previewUrl);
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    if (!hasImage || analyzing) return;
    setError(null);
    setSaveState("idle");
    setSaveError("");

    const form = new FormData();
    for (const slot of config.slots) {
      const img = images[slot.key];
      if (img) form.append(slot.key, img.blob, `${slot.key}.jpg`);
    }
    form.append("market", profile.market);
    form.append("userAllergens", JSON.stringify(profile.allergens));
    if (context.trim()) form.append("context", context.trim());

    const controller = new AbortController();
    abortRef.current = controller;
    setStage("uploading");

    try {
      const data = await postForm(config.endpoint, form, {
        signal: controller.signal,
        onUploaded: () => setStage("analyzing"),
      });
      setStage("validating");
      setResult(data);
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      if (err.code !== "ABORTED") setError({ message: err.message, code: err.code });
    } finally {
      setStage("idle");
      abortRef.current = null;
    }
  }

  function scanAnother() {
    Object.values(images).forEach((img) => img?.previewUrl && URL.revokeObjectURL(img.previewUrl));
    setImages({});
    setResult(null);
    setContext("");
    setError(null);
    setSaveState("idle");
    setSaveError("");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save() {
    if (!result) return;
    const firstSlot = config.slots.map((s) => s.key).find((k) => images[k]);
    const thumbnail = firstSlot ? await makeThumbnail(images[firstSlot].blob) : null;
    const res = addHistory({ result, thumbnail });
    if (res.ok) {
      setSaveState("saved");
      setSaveError("");
    } else {
      setSaveError(res.error);
    }
  }

  const previewSrc = result
    ? images[config.slots.map((s) => s.key).find((k) => images[k])]?.previewUrl || null
    : null;

  const myAllergens = profile.allergens.map((id) => ALLERGENS[id]?.short).filter(Boolean);

  return (
    <div ref={topRef} className="scroll-mt-20">
      <h1 className="text-3xl font-bold">{config.title}</h1>
      <p className="mt-2 max-w-2xl text-navy-700">{config.intro}</p>

      <div className="mt-5">
        <SetupNotice />
      </div>

      {result ? (
        <div className="mt-2">
          <AllergenResults
            result={result}
            imageSrc={previewSrc}
            userAllergens={profile.allergens}
            onScanAnother={scanAnother}
            onSave={save}
            saveState={saveState}
            saveError={saveError}
          />
          {saveState === "saved" && (
            <p className="mt-3 text-sm text-navy-600">
              Saved on this device only (a small thumbnail, not the original photo).{" "}
              <Link href="/history" className="font-semibold text-brand-700 underline">
                Open Scan History
              </Link>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-2 space-y-6" noValidate>
          <div className="card flex flex-wrap items-center gap-3 p-4 text-sm">
            <UserRound className="h-5 w-5 text-brand-700" aria-hidden="true" />
            {ready && myAllergens.length > 0 ? (
              <p>
                Prioritizing your allergies: <strong>{myAllergens.join(", ")}</strong>.{" "}
                <Link href="/allergies" className="font-semibold text-brand-700 underline">
                  Edit
                </Link>
              </p>
            ) : (
              <p>
                No personal allergies selected.{" "}
                <Link href="/allergies" className="font-semibold text-brand-700 underline">
                  Choose your allergies
                </Link>{" "}
                to get personalized alerts.
              </p>
            )}
          </div>

          <div className={`grid gap-6 ${config.slots.length > 1 ? "md:grid-cols-2" : ""}`}>
            {config.slots.map((slot) => (
              <div key={slot.key}>
                <ImagePreview
                  id={`${mode}-${slot.key}`}
                  label={slot.label}
                  hint={slot.hint}
                  image={images[slot.key]}
                  busy={busySlot === slot.key}
                  disabled={analyzing}
                  onFile={(file) => handleFile(slot.key, file)}
                  onClear={() => clearSlot(slot.key)}
                />
                {slotErrors[slot.key] && (
                  <p role="alert" className="mt-2 flex items-start gap-2 text-sm font-medium text-red-800">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {slotErrors[slot.key]}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div>
            <label htmlFor={`${mode}-context`} className="text-sm font-semibold">
              Anything we should know? <span className="font-normal text-navy-600">(optional)</span>
            </label>
            <p className="mb-2 text-xs text-navy-600">
              For example, a restaurant dish name or ingredients you were told about. Treated as unverified information.
            </p>
            <textarea
              id={`${mode}-context`}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={analyzing}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
              placeholder="e.g. Chicken curry from a restaurant, the waiter said it has coconut milk"
            />
            <p className="mt-1 text-right text-xs text-navy-600">{context.length}/500</p>
          </div>

          {error && (
            <div role="alert" className="flex gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-950">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-bold">No result was produced</p>
                <p className="mt-1">{error.message}</p>
              </div>
            </div>
          )}

          {analyzing ? (
            <Progress stage={stage} onCancel={() => abortRef.current?.abort()} />
          ) : (
            <button type="submit" disabled={!hasImage || busySlot !== null} className="btn-primary w-full sm:w-auto">
              <ScanSearch className="h-5 w-5" aria-hidden="true" />
              {config.cta}
            </button>
          )}

          <SafetyNotice />
        </form>
      )}
    </div>
  );
}
