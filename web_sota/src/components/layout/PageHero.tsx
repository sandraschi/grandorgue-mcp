/** Minimal PageHero (eyebrow/title/lead shape used by vendored pages). */
export function PageHero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="space-y-1">
      {eyebrow && (
        <div className="text-sm font-medium uppercase tracking-wider text-organ-gold">
          {eyebrow}
        </div>
      )}
      <h1 className="text-2xl font-serif text-organ-gold">{title}</h1>
      {lead && <p className="text-sm text-zinc-400 max-w-3xl">{lead}</p>}
    </div>
  );
}
