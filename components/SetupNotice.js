"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";

// Checks (once) whether the server has an AI key. The app still works without
// it, but scans are refused rather than faked.
export default function SetupNotice() {
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data && data.aiConfigured === false) setConfigured(false);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (configured) return null;

  return (
    <div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-orange-300 bg-orange-50 p-4 text-orange-950">
      <KeyRound className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="text-sm leading-relaxed">
        <p className="font-bold">AI analysis is not set up on this server</p>
        <p className="mt-1">
          Scans will not run until the site owner sets <code className="rounded bg-white px-1">AI_API_KEY</code>{" "}
          and <code className="rounded bg-white px-1">AI_MODEL</code> (and optionally{" "}
          <code className="rounded bg-white px-1">AI_PROVIDER</code>) as server environment variables and
          redeploys. See the README. No fake results will be shown.
        </p>
      </div>
    </div>
  );
}
