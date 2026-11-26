import { Check } from 'lucide-react';
import { useUi } from '../../ui/UiContext';

export interface DailySummaryProps {
  totals: { calories: number; protein: number; carbs: number; fat: number };
  targets: { calories: number; protein: number; carbs: number; fat: number };
  calRemaining: number;
  calOver: boolean;
  calPct: number;
  calPctRaw: number;
  calStatusBadge: { label: string; variant: string };
  proPct: number;
  proGoalHit: boolean;
  proRemaining: number;
  carbsPct: number;
  carbsPctRaw: number;
  carbsRemaining: number;
  fatPct: number;
  fatPctRaw: number;
  fatRemaining: number;
  formatNumberDE: (n: number) => string;
}

const fmtGram = (n: number) => Math.round(n * 10) / 10;

export function DailySummaryCard(props: DailySummaryProps) {
  const { uiVariant } = useUi();

  if (uiVariant === 'kinetic') {
    return <KineticSummaryCard {...props} />;
  }
  if (uiVariant === 'nocturne') {
    return <NocturneSummaryCard {...props} />;
  }
  return <ObsidianSummaryCard {...props} />;
}

/* ============================================================================
   UI 1: OBSIDIAN GLASS — Luminous Gradient Ring + 3 Frosted Glass Macro Tiles
   ============================================================================ */
function ObsidianSummaryCard({
  totals,
  targets,
  calRemaining,
  calOver,
  calPct,
  calPctRaw,
  calStatusBadge,
  proPct,
  proGoalHit,
  proRemaining,
  carbsPct,
  carbsPctRaw,
  carbsRemaining,
  fatPct,
  fatPctRaw,
  fatRemaining,
  formatNumberDE,
}: DailySummaryProps) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (calPct / 100) * circ;

  const badgeTone =
    calStatusBadge.variant === 'destructive'
      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
      : calStatusBadge.variant === 'emerald'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60';

  const macroTiles = [
    {
      label: 'Protein',
      shortLabel: 'Protein',
      value: fmtGram(totals.protein),
      target: targets.protein,
      pct: proPct,
      pctRaw: Math.round((totals.protein / Math.max(1, targets.protein)) * 100),
      remaining: proRemaining,
      hit: proGoalHit,
      dotClass: 'bg-emerald-400',
      barClass: 'bg-gradient-to-r from-emerald-400 to-emerald-300',
      textClass: 'text-emerald-300',
    },
    {
      label: 'Kohlenhydrate',
      shortLabel: 'KH',
      value: fmtGram(totals.carbs),
      target: targets.carbs,
      pct: carbsPct,
      pctRaw: carbsPctRaw,
      remaining: carbsRemaining,
      hit: false,
      dotClass: 'bg-amber-400',
      barClass: 'bg-gradient-to-r from-amber-400 to-amber-300',
      textClass: 'text-amber-300',
    },
    {
      label: 'Fette',
      shortLabel: 'Fette',
      value: fmtGram(totals.fat),
      target: targets.fat,
      pct: fatPct,
      pctRaw: fatPctRaw,
      remaining: fatRemaining,
      hit: false,
      dotClass: 'bg-sky-400',
      barClass: 'bg-gradient-to-r from-sky-400 to-sky-300',
      textClass: 'text-sky-300',
    },
  ];

  return (
    <div className="ui-card-elevated rounded-2xl p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-center">
      {/* Left: Luminous Radial Ring & Budget Readout */}
      <div className="lg:col-span-5 flex items-center justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Kalorien-Budget
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold tabular-nums ${badgeTone}`}
            >
              {calStatusBadge.label}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-50 tabular-nums">
              {formatNumberDE(totals.calories)}
            </span>
            <span className="text-xs sm:text-sm text-zinc-400 tabular-nums">
              / {formatNumberDE(targets.calories)} kcal
            </span>
          </div>

          <div className="text-xs text-zinc-400 tabular-nums">
            {calOver ? (
              <span className="text-rose-400 font-semibold">
                {formatNumberDE(Math.abs(calRemaining))} kcal über Tagesziel
              </span>
            ) : (
              <span>
                Noch{' '}
                <strong className="text-zinc-100 font-semibold">
                  {formatNumberDE(calRemaining)} kcal
                </strong>{' '}
                offen
              </span>
            )}
          </div>
        </div>

        <div className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_16px_rgba(45,212,191,0.22)]" viewBox="0 0 128 128">
            <defs>
              <linearGradient id="obsidianCalRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={calOver ? '#FB7185' : '#2DD4BF'} />
                <stop offset="100%" stopColor={calOver ? '#F43F5E' : '#A78BFA'} />
              </linearGradient>
            </defs>
            <circle
              cx="64"
              cy="64"
              r={r}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="10"
              className="text-zinc-800/75"
            />
            <circle
              cx="64"
              cy="64"
              r={r}
              fill="transparent"
              stroke="url(#obsidianCalRingGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span
              className={`text-base sm:text-xl font-extrabold tabular-nums leading-none ${
                calOver ? 'text-rose-400' : 'text-zinc-50'
              }`}
            >
              {calPctRaw}%
            </span>
            <span className="text-[10px] text-zinc-400 mt-1">erreicht</span>
          </div>
        </div>
      </div>

      {/* Right: 3 Frosted Glass Macro Bento Tiles */}
      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-4 border-t border-zinc-800/70 lg:pt-0 lg:border-t-0">
        {macroTiles.map((m) => (
          <div
            key={m.label}
            className="rounded-xl bg-zinc-950/55 border border-zinc-800/80 p-3 flex flex-col justify-between gap-2.5"
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${m.dotClass}`} />
                <span className={`text-xs font-bold truncate ${m.textClass}`}>
                  <span className="sm:hidden">{m.label}</span>
                  <span className="hidden sm:inline">{m.shortLabel}</span>
                </span>
              </div>
              <span className="text-[11px] font-mono font-semibold text-zinc-400 tabular-nums">
                {m.pctRaw}%
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <div className="tabular-nums">
                <span className="text-lg font-bold text-zinc-50">{m.value}g</span>
                <span className="text-[11px] text-zinc-500"> / {m.target}g</span>
              </div>
              {m.hit && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300">
                  <Check className="w-2.5 h-2.5" /> Ziel
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${m.barClass}`}
                  style={{ width: `${Math.max(0, Math.min(100, m.pct))}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-400 tabular-nums">
                {m.remaining >= 0
                  ? `noch ${Math.round(m.remaining)}g offen`
                  : `+${Math.round(Math.abs(m.remaining))}g drüber`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   UI 2: KINETIC CARBON — Telemetry Fuel Bar + 3-Column Precision KPI Strip
   ============================================================================ */
function KineticSummaryCard({
  totals,
  targets,
  calRemaining,
  calOver,
  calPct,
  calPctRaw,
  calStatusBadge,
  proPct,
  proGoalHit,
  proRemaining,
  carbsPct,
  carbsPctRaw,
  carbsRemaining,
  fatPct,
  fatPctRaw,
  fatRemaining,
  formatNumberDE,
}: DailySummaryProps) {
  const macros = [
    {
      code: 'PRO',
      label: 'Protein',
      value: fmtGram(totals.protein),
      target: targets.protein,
      pct: proPct,
      pctRaw: Math.round((totals.protein / Math.max(1, targets.protein)) * 100),
      remaining: proRemaining,
      hit: proGoalHit,
      railColor: 'bg-emerald-400',
      labelColor: 'text-emerald-400',
    },
    {
      code: 'CHO',
      label: 'Kohlenhydrate',
      value: fmtGram(totals.carbs),
      target: targets.carbs,
      pct: carbsPct,
      pctRaw: carbsPctRaw,
      remaining: carbsRemaining,
      hit: false,
      railColor: 'bg-amber-400',
      labelColor: 'text-amber-300',
    },
    {
      code: 'FAT',
      label: 'Fette',
      value: fmtGram(totals.fat),
      target: targets.fat,
      pct: fatPct,
      pctRaw: fatPctRaw,
      remaining: fatRemaining,
      hit: false,
      railColor: 'bg-sky-400',
      labelColor: 'text-sky-400',
    },
  ];

  return (
    <div className="ui-card-elevated rounded-2xl overflow-hidden">
      {/* Top Telemetry Readout + Fuel Gauge */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-400 inline-block" aria-hidden="true" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-400">
                ENERGY TELEMETRY · KCAL
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                  calOver
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {calStatusBadge.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-zinc-50 tabular-nums leading-none">
                {formatNumberDE(totals.calories)}
              </span>
              <span className="font-mono text-xs sm:text-sm text-zinc-500 tabular-nums">
                / {formatNumberDE(targets.calories)} kcal
              </span>
            </div>
          </div>

          <div className="flex sm:flex-col items-baseline sm:items-end justify-between gap-2 font-mono tabular-nums">
            <span
              className={`text-xl sm:text-2xl font-bold leading-none ${
                calOver ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {calPctRaw}%
            </span>
            <span className="text-xs text-zinc-400">
              {calOver
                ? `+${formatNumberDE(Math.abs(calRemaining))} kcal OVER`
                : `${formatNumberDE(calRemaining)} kcal LEFT`}
            </span>
          </div>
        </div>

        {/* Full-width Segmented Fuel Gauge with 25/50/75 tick notches */}
        <div className="relative h-3.5 w-full rounded bg-zinc-950 border border-zinc-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              calOver ? 'bg-rose-500' : 'bg-emerald-400'
            }`}
            style={{ width: `${calPct}%` }}
          />
          <div className="pointer-events-none absolute inset-y-0 left-1/4 w-px bg-zinc-950/70" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-zinc-950/70" />
          <div className="pointer-events-none absolute inset-y-0 left-3/4 w-px bg-zinc-950/70" />
        </div>
      </div>

      {/* Bottom 3-Column Precision KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800 border-t border-zinc-800 bg-zinc-950/60">
        {macros.map((m) => (
          <div key={m.code} className="p-3.5 sm:p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-1 h-3.5 shrink-0 ${m.railColor}`} />
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 truncate">
                  {m.code} · {m.label}
                </span>
              </div>
              <span className={`text-[11px] font-mono font-bold tabular-nums ${m.labelColor}`}>
                {m.pctRaw}%
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2 tabular-nums">
              <div>
                <span className="font-display text-lg sm:text-xl font-bold text-zinc-100">
                  {m.value}g
                </span>
                <span className="font-mono text-[11px] text-zinc-500"> / {m.target}g</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400">
                {m.hit
                  ? 'HIT'
                  : m.remaining >= 0
                  ? `-${Math.round(m.remaining)}g`
                  : `+${Math.round(Math.abs(m.remaining))}g`}
              </span>
            </div>

            <div className="w-full h-1 bg-zinc-900 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${m.railColor}`}
                style={{ width: `${Math.max(0, Math.min(100, m.pct))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   UI 3: NOCTURNE EDITORIAL — 180° Horizon Arc + Hairline Macro Ledger
   ============================================================================ */
function NocturneSummaryCard({
  totals,
  targets,
  calRemaining,
  calOver,
  calPct,
  calPctRaw,
  calStatusBadge,
  proPct,
  proGoalHit,
  proRemaining,
  carbsPct,
  carbsPctRaw,
  carbsRemaining,
  fatPct,
  fatPctRaw,
  fatRemaining,
  formatNumberDE,
}: DailySummaryProps) {
  const arcRadius = 54;
  const arcLength = Math.PI * arcRadius;
  const arcDashOffset = arcLength - (calPct / 100) * arcLength;

  const ledgerRows = [
    {
      label: 'Protein',
      value: fmtGram(totals.protein),
      target: targets.protein,
      pct: proPct,
      pctRaw: Math.round((totals.protein / Math.max(1, targets.protein)) * 100),
      remaining: proRemaining,
      hit: proGoalHit,
      barColor: 'bg-emerald-400',
      accentText: 'text-emerald-400',
    },
    {
      label: 'Kohlenhydrate',
      value: fmtGram(totals.carbs),
      target: targets.carbs,
      pct: carbsPct,
      pctRaw: carbsPctRaw,
      remaining: carbsRemaining,
      hit: false,
      barColor: 'bg-amber-400',
      accentText: 'text-amber-300',
    },
    {
      label: 'Fette',
      value: fmtGram(totals.fat),
      target: targets.fat,
      pct: fatPct,
      pctRaw: fatPctRaw,
      remaining: fatRemaining,
      hit: false,
      barColor: 'bg-sky-400',
      accentText: 'text-sky-400',
    },
  ];

  return (
    <div className="ui-card-elevated rounded-2xl p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-9 items-center">
      {/* Left: Calm Serif Budget + 180° Semi-Circular Horizon Arc */}
      <div className="lg:col-span-5 flex items-center justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
            Tagesbudget · {calStatusBadge.label}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl sm:text-[42px] font-normal tracking-tight text-zinc-50 tabular-nums leading-none">
              {formatNumberDE(totals.calories)}
            </span>
            <span className="text-xs sm:text-sm text-zinc-400 tabular-nums">
              von {formatNumberDE(targets.calories)} kcal
            </span>
          </div>

          <p className="text-xs text-zinc-400 tabular-nums leading-relaxed">
            {calOver ? (
              <span className="text-rose-400">
                {formatNumberDE(Math.abs(calRemaining))} kcal über deinem Tagesziel
              </span>
            ) : (
              <span>
                Noch <span className="text-zinc-100 font-medium">{formatNumberDE(calRemaining)} kcal</span>{' '}
                für heute offen
              </span>
            )}
          </p>
        </div>

        {/* 180° Horizon Arc SVG */}
        <div className="relative w-32 h-20 sm:w-36 sm:h-24 shrink-0 flex items-end justify-center">
          <svg viewBox="0 0 140 84" className="w-full h-full overflow-visible">
            <path
              d="M 16 74 A 54 54 0 0 1 124 74"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              className="text-zinc-800"
            />
            <path
              d="M 16 74 A 54 54 0 0 1 124 74"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={arcDashOffset}
              className={`transition-all duration-500 ease-out ${
                calOver ? 'text-rose-400' : 'text-emerald-400'
              }`}
            />
          </svg>
          <div className="absolute bottom-1 inset-x-0 text-center">
            <div
              className={`font-display text-lg sm:text-xl font-medium tabular-nums leading-none ${
                calOver ? 'text-rose-400' : 'text-zinc-100'
              }`}
            >
              {calPctRaw}%
            </div>
          </div>
        </div>
      </div>

      {/* Right: Editorial Hairline Macro Ledger */}
      <div className="lg:col-span-7 divide-y divide-zinc-800/80 border-t border-zinc-800/80 lg:border-t-0 lg:border-l lg:pl-9">
        {ledgerRows.map((row) => (
          <div key={row.label} className="py-3 first:pt-2 last:pb-1 space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-medium ${row.accentText}`}>{row.label}</span>
                {row.hit ? (
                  <span className="text-[11px] text-emerald-400 inline-flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Ziel erreicht
                  </span>
                ) : (
                  <span className="text-[11px] text-zinc-500 tabular-nums">
                    {row.remaining >= 0
                      ? `noch ${Math.round(row.remaining)}g`
                      : `+${Math.round(Math.abs(row.remaining))}g`}
                  </span>
                )}
              </div>

              <div className="tabular-nums shrink-0">
                <span className="font-semibold text-zinc-100">{row.value}g</span>
                <span className="text-zinc-500"> / {row.target}g</span>
                <span className="text-[11px] text-zinc-500 ml-2">({row.pctRaw}%)</span>
              </div>
            </div>

            <div className="w-full h-[3px] rounded-full bg-zinc-800/80 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${row.barColor}`}
                style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
