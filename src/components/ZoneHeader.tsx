import type { ReactNode } from 'react';
import { useUi } from '../ui/UiContext';

/**
 * Überschrift eines Bereichs (Tagesbilanz, Essen hinzufügen, Training …),
 * gestaltet passend zum gewählten UI-Design (Obsidian, Kinetic, Nocturne).
 */
export function ZoneHeader({ id, title, right = null }: { id?: string; title: ReactNode; right?: ReactNode }) {
  const { uiVariant } = useUi();

  if (uiVariant === 'kinetic') {
    return (
      <div className="flex items-center gap-2.5 min-h-[32px]">
        <span className="w-1.5 h-1.5 bg-emerald-400 shrink-0" aria-hidden="true" />
        <h2
          id={id}
          className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-200 whitespace-nowrap"
        >
          {title}
        </h2>
        <div className="flex-1 h-px bg-zinc-800" aria-hidden="true" />
        {right && (
          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-zinc-400 tabular-nums">
            {right}
          </div>
        )}
      </div>
    );
  }

  if (uiVariant === 'nocturne') {
    return (
      <div className="flex items-baseline justify-between gap-3 pb-2 border-b border-zinc-800/80 min-h-[34px]">
        <h2
          id={id}
          className="font-display text-lg sm:text-[21px] font-normal tracking-tight text-zinc-100 whitespace-nowrap"
        >
          {title}
        </h2>
        {right && (
          <div className="flex items-center gap-2 shrink-0 text-xs text-zinc-400 tabular-nums">
            {right}
          </div>
        )}
      </div>
    );
  }

  // Obsidian Glass
  return (
    <div className="flex items-center justify-between gap-3 min-h-[32px]">
      <h2 id={id} className="text-sm sm:text-[15px] font-semibold tracking-tight text-zinc-100 whitespace-nowrap">
        {title}
      </h2>
      {right && (
        <div className="flex items-center gap-2 shrink-0 text-xs text-zinc-400 tabular-nums px-2.5 py-1 rounded-full bg-zinc-900/60 border border-zinc-800/70">
          {right}
        </div>
      )}
    </div>
  );
}
