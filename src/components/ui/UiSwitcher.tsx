import { useEffect, useState } from 'react';
import { Check, Palette, X } from 'lucide-react';
import { UI_VARIANTS, type UiVariant } from '../../ui/themes';
import { useUi } from '../../ui/UiContext';

export function UiDesignGallery({
  onSelect,
}: {
  onSelect?: (variant: UiVariant) => void;
}) {
  const { uiVariant, setUiVariant } = useUi();

  return (
    <div className="grid grid-cols-1 gap-2.5">
      {UI_VARIANTS.map((theme) => {
        const active = uiVariant === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => {
              setUiVariant(theme.id);
              onSelect?.(theme.id);
            }}
            aria-pressed={active}
            className={`w-full text-left p-3.5 rounded-2xl border transition flex items-start gap-3 ${
              active
                ? 'bg-emerald-500/10 border-emerald-400/60 shadow-sm'
                : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'
            }`}
          >
            {/* Color Palette Swatch */}
            <div
              className="w-11 h-11 rounded-xl border border-white/10 shrink-0 p-1.5 flex flex-col justify-between"
              style={{ backgroundColor: theme.swatch.bg }}
              aria-hidden="true"
            >
              <div
                className="w-full h-2.5 rounded-sm"
                style={{ backgroundColor: theme.swatch.surface }}
              />
              <div className="flex items-center gap-1">
                <span
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: theme.swatch.accent }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: theme.swatch.secondary }}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    UI {theme.number}
                  </span>
                  <span className="text-sm font-semibold text-zinc-100 truncate">
                    {theme.name}
                  </span>
                </div>
                {active && (
                  <span className="w-5 h-5 rounded-full bg-emerald-400 text-zinc-950 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.75]" />
                  </span>
                )}
              </div>
              <div className="text-[11px] font-medium text-emerald-400/90 mt-0.5">
                {theme.tagline}
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                {theme.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function UiSwitcherBar({
  layout = 'row',
  compact = false,
}: {
  layout?: 'row' | 'stack';
  compact?: boolean;
}) {
  const { uiVariant, setUiVariant } = useUi();

  if (layout === 'stack') {
    return (
      <div className="space-y-1">
        <div className="px-1 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
          Design-Modus
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800">
          {UI_VARIANTS.map((theme) => {
            const active = uiVariant === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setUiVariant(theme.id)}
                aria-pressed={active}
                title={`${theme.name} – ${theme.tagline}`}
                className={`h-8 px-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-semibold transition ${
                  active
                    ? 'bg-zinc-800 text-zinc-50 border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: theme.swatch.accent }}
                />
                <span className="truncate">{theme.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Design auswählen"
      className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-zinc-900/90 border border-zinc-800 shrink-0"
    >
      {UI_VARIANTS.map((theme) => {
        const active = uiVariant === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => setUiVariant(theme.id)}
            aria-pressed={active}
            title={`UI ${theme.number}: ${theme.name} (${theme.tagline})`}
            className={`h-7 px-2 rounded-lg inline-flex items-center gap-1.5 text-[11px] font-semibold transition ${
              active
                ? 'bg-zinc-800 text-zinc-50 border border-zinc-700/80 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-100 border border-transparent'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: theme.swatch.accent }}
            />
            <span className={compact ? 'hidden xl:inline' : 'hidden md:inline'}>
              {theme.shortName}
            </span>
            <span className={compact ? 'xl:hidden font-mono' : 'md:hidden font-mono'}>
              {theme.number}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function UiSwitcherMobileButton() {
  const { themeMeta } = useUi();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Design wechseln (aktuell: ${themeMeta.name})`}
        title={`UI ${themeMeta.number}: ${themeMeta.name}`}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:border-zinc-700 transition shrink-0"
      >
        <Palette className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-mono text-[11px]">{themeMeta.number}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Design auswählen"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-emerald-400" />
                  App-Design wählen
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Alle 3 dunklen UIs enthalten sämtliche Funktionen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Schließen"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[75dvh] overflow-y-auto">
              <UiDesignGallery onSelect={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
