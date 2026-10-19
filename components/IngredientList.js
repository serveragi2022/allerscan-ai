import { EyeOff, Eye, FileText, HelpCircle } from "lucide-react";

function Chips({ items, tone = "slate" }) {
  if (!items?.length) return <p className="text-sm text-navy-600">None listed.</p>;
  const toneClasses = {
    slate: "bg-slate-100 text-navy-800",
    amber: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  };
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className={`rounded-full px-3 py-1 text-sm ${toneClasses[tone]}`}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Group({ icon: Icon, title, hint, children }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
        <Icon className="h-4 w-4 text-brand-700" aria-hidden="true" />
        {title}
      </h3>
      {hint && <p className="mb-2 mt-0.5 text-xs text-navy-600">{hint}</p>}
      <div className={hint ? "" : "mt-2"}>{children}</div>
    </div>
  );
}

export default function IngredientList({ result }) {
  const hasLabel = Boolean(result.labelText || result.declaredAllergens?.length || result.precautionaryStatements?.length);

  return (
    <div className="space-y-5">
      <Group
        icon={Eye}
        title="Visible ingredients"
        hint="Estimated from the photo. These are guesses, not a verified recipe."
      >
        <Chips items={result.visibleIngredients} />
      </Group>

      <Group
        icon={EyeOff}
        title="Possible hidden ingredients"
        hint="Often used in this type of food but not visible. Verify before relying on them."
      >
        <Chips items={result.inferredIngredients} />
      </Group>

      <Group
        icon={HelpCircle}
        title="Needs verification"
        hint="Ingredients or components whose contents cannot be determined from the image."
      >
        <Chips items={result.unknownIngredients} tone="amber" />
      </Group>

      {hasLabel && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Group icon={FileText} title="Text read from the label">
            {result.labelText ? (
              <>
                <p className="mb-2 text-xs text-navy-600">
                  Automatic text reading can make mistakes. Compare this with the physical package.
                </p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-navy-900">
                  {result.labelText}
                </pre>
              </>
            ) : (
              <p className="text-sm text-navy-600">No label text could be read.</p>
            )}
          </Group>

          {result.declaredAllergens?.length > 0 && (
            <Group icon={FileText} title="Allergens declared on the label">
              <Chips items={result.declaredAllergens} tone="amber" />
            </Group>
          )}

          {result.precautionaryStatements?.length > 0 && (
            <Group
              icon={FileText}
              title="Precautionary statements"
              hint="“May contain” or shared-facility warnings. The absence of such a statement does not guarantee there is no cross-contact."
            >
              <ul className="space-y-1 text-sm text-navy-900">
                {result.precautionaryStatements.map((s, i) => (
                  <li key={i} className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                    {s}
                  </li>
                ))}
              </ul>
            </Group>
          )}

          {result.readabilityNotes && (
            <p className="text-sm text-navy-600">Reading notes: {result.readabilityNotes}</p>
          )}
        </div>
      )}
    </div>
  );
}
