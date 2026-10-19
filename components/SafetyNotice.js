import { ShieldAlert } from "lucide-react";
import { SAFETY_NOTICE_TEXT } from "@/lib/schemas";

export default function SafetyNotice({ className = "" }) {
  return (
    <div
      role="note"
      aria-label="Safety notice"
      className={`flex gap-3 rounded-2xl border border-navy-700/20 bg-navy-900 p-4 text-sm leading-relaxed text-white ${className}`}
    >
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
      <p>
        <strong className="font-semibold">Safety notice. </strong>
        {SAFETY_NOTICE_TEXT}
      </p>
    </div>
  );
}
