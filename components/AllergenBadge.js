import { AlertOctagon, AlertTriangle, CircleHelp, Minus } from "lucide-react";
import { STATUS_META } from "@/lib/allergens";

// Status is always conveyed with an icon AND text, never colour alone.
// There is deliberately no green: "not identified" is not "safe".
const STYLES = {
  detected: {
    icon: AlertOctagon,
    classes: "border-red-300 bg-red-50 text-red-900",
  },
  possible: {
    icon: AlertTriangle,
    classes: "border-orange-300 bg-orange-50 text-orange-900",
  },
  not_identified: {
    icon: Minus,
    classes: "border-slate-300 bg-slate-100 text-slate-700",
  },
  unknown: {
    icon: CircleHelp,
    classes: "border-dashed border-slate-400 bg-white text-slate-700",
  },
};

export default function AllergenBadge({ status, className = "" }) {
  const style = STYLES[status] || STYLES.unknown;
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.classes} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {STATUS_META[status]?.label || "Unknown"}
    </span>
  );
}

export function StatusLegend() {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Status legend">
      {["detected", "possible", "unknown", "not_identified"].map((s) => (
        <li key={s}>
          <AllergenBadge status={s} />
        </li>
      ))}
    </ul>
  );
}
