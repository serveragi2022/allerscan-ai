"use client";

import { useState } from "react";
import { Check, Info } from "lucide-react";
import { useProfile } from "@/lib/use-profile";
import { ALLERGENS, ALLERGEN_IDS, MARKETS, MARKET_IDS } from "@/lib/allergens";

export default function AllergyProfile() {
  const { profile, ready, update } = useProfile();
  const [error, setError] = useState("");

  function toggle(id) {
    const has = profile.allergens.includes(id);
    const allergens = has ? profile.allergens.filter((a) => a !== id) : [...profile.allergens, id];
    const res = update({ ...profile, allergens });
    setError(res.ok ? "" : res.error);
  }

  function setMarket(market) {
    const res = update({ ...profile, market });
    setError(res.ok ? "" : res.error);
  }

  function clearAll() {
    const res = update({ ...profile, allergens: [] });
    setError(res.ok ? "" : res.error);
  }

  const market = MARKETS[profile.market];

  return (
    <div>
      <h1 className="text-3xl font-bold">My Allergies</h1>
      <p className="mt-2 max-w-2xl text-navy-700">
        Choose the allergens that matter to you. Scans will prioritize them and show a personal alert
        whenever one is detected or cannot be ruled out.
      </p>

      <div className="mt-5 flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-navy-700 shadow-card">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
        <p>
          Your selections are stored only in this browser. They are never sent to an account or database,
          and may be lost if you clear browser data or use private browsing. They are sent with each scan
          so the analysis can focus on them.
        </p>
      </div>

      <section className="card mt-6 p-5" aria-labelledby="market-heading">
        <h2 id="market-heading" className="text-lg font-bold">
          Labeling market
        </h2>
        <p className="mt-1 text-sm text-navy-600">
          Countries do not all use the same allergen list. This sets which categories are checked.
        </p>
        <label htmlFor="market" className="sr-only">
          Labeling market
        </label>
        <select
          id="market"
          value={profile.market}
          onChange={(e) => setMarket(e.target.value)}
          disabled={!ready}
          className="mt-3 min-h-[44px] w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 text-sm"
        >
          {MARKET_IDS.map((id) => (
            <option key={id} value={id}>
              {MARKETS[id].name}
            </option>
          ))}
        </select>
        <p className="mt-3 text-sm text-navy-700">{market.note}</p>
        <p className="mt-1 text-xs text-navy-600">
          Labeling rules change and differ from official guidance. Always check your national food authority.
        </p>
      </section>

      <section className="card mt-6 p-5" aria-labelledby="allergen-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="allergen-heading" className="text-lg font-bold">
            I am allergic to
          </h2>
          <button type="button" onClick={clearAll} disabled={!profile.allergens.length} className="btn-secondary min-h-[40px] px-3">
            Clear selection
          </button>
        </div>
        <fieldset className="mt-4" disabled={!ready}>
          <legend className="sr-only">Select your known food allergies</legend>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ALLERGEN_IDS.map((id) => {
              const checked = profile.allergens.includes(id);
              const inMarket = market.allergens.includes(id);
              return (
                <li key={id}>
                  <label
                    className={`flex min-h-[64px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-brand-600 ${
                      checked ? "border-navy-800 bg-navy-50" : "border-slate-300 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(id)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        checked ? "border-navy-900 bg-navy-900 text-white" : "border-slate-400 bg-white"
                      }`}
                    >
                      {checked && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{ALLERGENS[id].name}</span>
                      <span className="block text-xs text-navy-600">{ALLERGENS[id].examples}</span>
                      {!inMarket && (
                        <span className="mt-1 block text-xs text-navy-600">
                          Not on the {market.name} list, but still checked for you.
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <p role="status" className="mt-4 text-sm text-navy-700">
          {profile.allergens.length
            ? `${profile.allergens.length} selected. Saved on this device.`
            : "No allergies selected yet."}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-800">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
