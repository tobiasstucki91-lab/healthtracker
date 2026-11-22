import type { ReactNode } from 'react';

/**
 * Überschrift eines Bereichs (Tagesbilanz, Essen hinzufügen, Training …):
 * steht über der Karte, mit Trennlinie und optionalen Infos/Aktionen rechts.
 */
export function ZoneHeader({ id, title, right = null }: { id?: string; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 min-h-[32px]">
      <h2 id={id} className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-200 whitespace-nowrap">
        {title}
      </h2>
      <div className="flex-1 h-px bg-zinc-800" aria-hidden="true" />
      {right && (
        <div className="flex items-center gap-2 shrink-0 text-xs text-zinc-400 tabular-nums">{right}</div>
      )}
    </div>
  );
}
