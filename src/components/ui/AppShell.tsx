import type { ReactNode } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  Dumbbell,
  House,
  Scale,
  ScanBarcode,
  Settings,
  SquareCheckBig,
  Target,
  TrendingUp,
  Utensils,
} from 'lucide-react';
import type { SyncApi } from '../../sync/useSyncedAppData';
import { useUi } from '../../ui/UiContext';
import { SyncBanner, SyncHeaderButton } from '../SyncUi';
import { UiSwitcherBar, UiSwitcherMobileButton } from './UiSwitcher';

export type ActiveView = 'daily' | 'training' | 'weight';
export type MobileSection = 'all' | 'food' | 'habits';

export interface TodaySummary {
  calories: number;
  targetCalories: number;
  calPct: number;
  calOver: boolean;
  protein: number;
  targetProtein: number;
  habitsDone: number;
  habitsTotal: number;
}

export interface AppShellProps {
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
  mobileSection: MobileSection;
  setMobileSection: (s: MobileSection) => void;
  selectedDate: string;
  todayKey: string;
  setSelectedDate: (fn: string | ((prev: string) => string)) => void;
  addDays: (dateKey: string, delta: number) => string;
  dateHeader: { badge: string; sub: string };
  sync: SyncApi;
  yesterdayLogsCount: number;
  onCopyYesterday: () => void;
  onOpenScanner: () => void;
  onOpenSettings: (tab?: string) => void;
  todaySummary: TodaySummary;
  formatNumberDE: (n: number) => string;
  children: ReactNode;
}

function DateStepper({
  selectedDate,
  todayKey,
  setSelectedDate,
  addDays,
  dateHeader,
  tone,
}: {
  selectedDate: string;
  todayKey: string;
  setSelectedDate: AppShellProps['setSelectedDate'];
  addDays: AppShellProps['addDays'];
  dateHeader: { badge: string; sub: string };
  tone: 'obsidian' | 'kinetic' | 'nocturne';
}) {
  const shellCls =
    tone === 'obsidian'
      ? 'bg-zinc-900/70 border-zinc-800/80 rounded-full'
      : tone === 'kinetic'
      ? 'bg-zinc-900 border-zinc-800 rounded-lg'
      : 'bg-zinc-900/80 border-zinc-800/70 rounded-xl';

  const btnCls =
    tone === 'obsidian'
      ? 'rounded-full'
      : tone === 'kinetic'
      ? 'rounded-md'
      : 'rounded-lg';

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className={`flex items-center border p-0.5 sm:p-1 min-w-0 ${shellCls}`}>
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          aria-label="Vorheriger Tag"
          className={`w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center ${btnCls} text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:scale-95 transition shrink-0`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className={`relative flex items-center group ${btnCls} hover:bg-zinc-800/70 transition min-w-0`}>
          <div
            aria-hidden="true"
            className="px-1.5 sm:px-2.5 py-0.5 flex items-center gap-1.5 text-left pointer-events-none"
          >
            <div className="text-center min-w-[74px] sm:min-w-[116px]">
              <div
                className={`text-xs sm:text-[13px] font-semibold text-zinc-100 leading-tight truncate ${
                  tone === 'nocturne' ? 'font-display font-medium' : ''
                }`}
              >
                {dateHeader.badge}
              </div>
              <div className="text-[10px] text-zinc-400 leading-tight truncate">
                {dateHeader.sub}
              </div>
            </div>
            <Calendar className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition shrink-0 hidden min-[370px]:block" />
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) setSelectedDate(e.target.value);
            }}
            aria-label="Datum auswählen"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          aria-label="Nächster Tag"
          className={`w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center ${btnCls} text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:scale-95 transition shrink-0`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {selectedDate !== todayKey && (
        <button
          type="button"
          onClick={() => setSelectedDate(todayKey)}
          className={`h-8 px-2.5 text-[11px] font-semibold border border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition shrink-0 ${
            tone === 'obsidian' ? 'rounded-full' : 'rounded-lg'
          }`}
        >
          Heute
        </button>
      )}
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  const { uiVariant } = useUi();
  if (uiVariant === 'kinetic') return <KineticShell {...props} />;
  if (uiVariant === 'nocturne') return <NocturneShell {...props} />;
  return <ObsidianShell {...props} />;
}

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

/* ============================================================================
   SHELL 1: OBSIDIAN GLASS — Top Floating Glass Navbar + Ambient Aurora
   ============================================================================ */
function ObsidianShell({
  activeView,
  setActiveView,
  mobileSection,
  setMobileSection,
  selectedDate,
  todayKey,
  setSelectedDate,
  addDays,
  dateHeader,
  sync,
  yesterdayLogsCount,
  onCopyYesterday,
  onOpenScanner,
  onOpenSettings,
  children,
}: AppShellProps) {
  const desktopTabs = [
    { id: 'daily' as const, label: 'Kalorien & Habits', icon: Utensils },
    { id: 'training' as const, label: 'Training', icon: Dumbbell },
    { id: 'weight' as const, label: 'Gewicht', icon: TrendingUp },
  ];

  const mobileTabs = [
    {
      key: 'today',
      label: 'Heute',
      icon: House,
      active: activeView === 'daily' && mobileSection !== 'habits',
      onClick: () => {
        setActiveView('daily');
        setMobileSection('all');
        scrollTop();
      },
    },
    {
      key: 'habits',
      label: 'Habits',
      icon: SquareCheckBig,
      active: activeView === 'daily' && mobileSection === 'habits',
      onClick: () => {
        setActiveView('daily');
        setMobileSection('habits');
        scrollTop();
      },
    },
    { key: 'scan' },
    {
      key: 'training',
      label: 'Training',
      icon: Dumbbell,
      active: activeView === 'training',
      onClick: () => {
        setActiveView('training');
        scrollTop();
      },
    },
    {
      key: 'weight',
      label: 'Gewicht',
      icon: TrendingUp,
      active: activeView === 'weight',
      onClick: () => {
        setActiveView('weight');
        scrollTop();
      },
    },
  ];

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200 pb-36 sm:pb-20">
      {/* Subtle Ambient Aurora Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-40 left-1/4 w-[520px] h-[520px] rounded-full bg-emerald-500/[0.08] blur-[130px]" />
        <div className="absolute top-1/3 -right-32 w-[460px] h-[460px] rounded-full bg-sky-500/[0.08] blur-[140px]" />
      </div>

      {/* Top Glass Header */}
      <header className="sticky top-0 z-30 ui-header-surface">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Brand + Desktop Pill Nav */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <img src={`${import.meta.env.BASE_URL}icon.svg?v=2`} alt="" className="w-7 h-7 rounded-lg" />
              <span className="text-sm font-bold tracking-tight text-zinc-50 hidden xl:inline">
                Health Tracker
              </span>
            </div>

            <nav aria-label="Hauptnavigation" className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-zinc-900/75 border border-zinc-800/80">
              {desktopTabs.map((t) => {
                const Icon = t.icon;
                const active = activeView === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveView(t.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-emerald-400 text-zinc-950 shadow-[0_0_18px_rgba(45,212,191,0.3)]'
                        : 'text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/70'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onOpenScanner}
                title="Barcode scannen"
                aria-label="Barcode scannen"
                className="h-8 w-8 rounded-full inline-flex items-center justify-center text-zinc-300 hover:text-emerald-300 hover:bg-zinc-800/70 transition"
              >
                <ScanBarcode className="w-4 h-4" />
              </button>
            </nav>
          </div>

          <DateStepper
            selectedDate={selectedDate}
            todayKey={todayKey}
            setSelectedDate={setSelectedDate}
            addDays={addDays}
            dateHeader={dateHeader}
            tone="obsidian"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:block">
              <UiSwitcherBar compact />
            </div>
            <div className="sm:hidden">
              <UiSwitcherMobileButton />
            </div>

            <SyncHeaderButton sync={sync} onOpenSettings={() => onOpenSettings('gdrive')} />

            <button
              type="button"
              onClick={onCopyYesterday}
              disabled={yesterdayLogsCount === 0}
              title={
                yesterdayLogsCount > 0
                  ? `${yesterdayLogsCount} Mahlzeiten von gestern übernehmen`
                  : 'Keine Einträge von gestern vorhanden'
              }
              className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-zinc-900/75 border border-zinc-800/80 text-xs font-medium text-zinc-200 hover:border-zinc-700 disabled:opacity-40 transition"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">Gestern</span>
              {yesterdayLogsCount > 0 && (
                <span className="px-1.5 rounded-full bg-zinc-800 text-[10px] font-bold tabular-nums text-zinc-300">
                  {yesterdayLogsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenSettings('targets')}
              aria-label="Ziele & Backup öffnen"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-zinc-900/75 border border-zinc-800/80 text-xs font-medium text-zinc-200 hover:border-zinc-700 transition"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-300" />
              <span className="hidden xl:inline">Einstellungen</span>
            </button>
          </div>
        </div>
      </header>

      <SyncBanner sync={sync} />

      <main className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 space-y-6">
        {/* Tablet Nav (sm..lg) */}
        <div className="hidden sm:flex lg:hidden items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-zinc-900/80 border border-zinc-800">
            {desktopTabs.map((t) => {
              const Icon = t.icon;
              const active = activeView === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveView(t.id)}
                  className={`h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold transition ${
                    active ? 'bg-emerald-400 text-zinc-950' : 'text-zinc-300 hover:text-zinc-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onOpenScanner}
            className="h-9 px-3 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-semibold text-emerald-300 inline-flex items-center gap-1.5"
          >
            <ScanBarcode className="w-4 h-4" />
            <span>Barcode</span>
          </button>
        </div>

        {children}

        <footer className="hidden lg:block pt-4 text-center text-[11px] text-zinc-500">
          Lebensmittel: Bundeslebensmittelschlüssel 4.0 (Max Rubner-Institut, CC BY 4.0) &amp; Open Food Facts (ODbL)
        </footer>
      </main>

      {/* Mobile Floating Frosted Capsule Nav */}
      <nav
        aria-label="Hauptnavigation"
        className="sm:hidden fixed inset-x-4 z-40 bottom-[calc(0.9rem+env(safe-area-inset-bottom))] h-[66px] px-2 flex items-center justify-around rounded-full ui-card-elevated"
      >
        {mobileTabs.map((item) => {
          if (item.key === 'scan') {
            return (
              <button
                key="scan"
                type="button"
                onClick={onOpenScanner}
                aria-label="Barcode scannen"
                className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-gradient-to-br from-emerald-300 to-emerald-500 text-zinc-950 flex items-center justify-center shadow-[0_0_24px_rgba(45,212,191,0.45)] active:scale-95 transition"
              >
                <ScanBarcode className="w-5 h-5" strokeWidth={2.1} />
              </button>
            );
          }
          const Icon = item.icon!;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
              className={`w-[58px] h-[50px] flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${
                item.active ? 'text-emerald-300' : 'text-zinc-400'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.active ? 'text-emerald-400' : ''}`} strokeWidth={1.9} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ============================================================================
   SHELL 2: KINETIC CARBON — Command Sidebar + Live Telemetry + Docked Bar
   ============================================================================ */
function KineticShell({
  activeView,
  setActiveView,
  mobileSection,
  setMobileSection,
  selectedDate,
  todayKey,
  setSelectedDate,
  addDays,
  dateHeader,
  sync,
  yesterdayLogsCount,
  onCopyYesterday,
  onOpenScanner,
  onOpenSettings,
  todaySummary,
  formatNumberDE,
  children,
}: AppShellProps) {
  const sidebarItems = [
    {
      key: 'daily',
      label: 'Kalorien & Habits',
      icon: House,
      active: activeView === 'daily',
      onClick: () => setActiveView('daily'),
    },
    {
      key: 'training',
      label: 'Training',
      icon: Dumbbell,
      active: activeView === 'training',
      onClick: () => setActiveView('training'),
    },
    {
      key: 'weight',
      label: 'Gewicht',
      icon: TrendingUp,
      active: activeView === 'weight',
      onClick: () => setActiveView('weight'),
    },
    {
      key: 'scan',
      label: 'Barcode scannen',
      icon: ScanBarcode,
      active: false,
      onClick: onOpenScanner,
    },
    {
      key: 'goals',
      label: 'Ziele & Backup',
      icon: Target,
      active: false,
      onClick: () => onOpenSettings('targets'),
    },
  ];

  const tabletTabs = [
    { id: 'daily' as const, label: 'Kalorien & Habits', icon: Utensils },
    { id: 'training' as const, label: 'Training', icon: Dumbbell },
    { id: 'weight' as const, label: 'Gewichtsdaten', icon: Scale },
  ];

  const mobileTabs = [
    {
      key: 'today',
      label: 'Heute',
      icon: House,
      active: activeView === 'daily' && mobileSection !== 'habits',
      onClick: () => {
        setActiveView('daily');
        setMobileSection('all');
        scrollTop();
      },
    },
    {
      key: 'habits',
      label: 'Habits',
      icon: SquareCheckBig,
      active: activeView === 'daily' && mobileSection === 'habits',
      onClick: () => {
        setActiveView('daily');
        setMobileSection('habits');
        scrollTop();
      },
    },
    { key: 'scan' },
    {
      key: 'training',
      label: 'Training',
      icon: Dumbbell,
      active: activeView === 'training',
      onClick: () => {
        setActiveView('training');
        scrollTop();
      },
    },
    {
      key: 'weight',
      label: 'Gewicht',
      icon: TrendingUp,
      active: activeView === 'weight',
      onClick: () => {
        setActiveView('weight');
        scrollTop();
      },
    },
  ];

  return (
    <div className="relative min-h-screen bg-zinc-950 ui-kinetic-grid text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200 pb-28 sm:pb-16 lg:pl-64">
      {/* Desktop Command Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col gap-5 px-4 py-6 border-r border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <img src={`${import.meta.env.BASE_URL}icon.svg?v=2`} alt="" className="w-7 h-7 rounded-md" />
            <div>
              <div className="font-display text-sm font-bold tracking-tight text-zinc-50 leading-none">
                HEALTH TRACKER
              </div>
              <div className="font-mono text-[10px] text-emerald-400 tracking-wider mt-0.5">
                TELEMETRY V2
              </div>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
        </div>

        {/* Live Telemetry Mini-Widget */}
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-2.5">
          <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
            <span>LIVE · {dateHeader.badge.toUpperCase()}</span>
            <span className={todaySummary.calOver ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {todaySummary.calPct}%
            </span>
          </div>
          <div className="font-mono text-xs text-zinc-100 tabular-nums">
            <strong className="text-sm">{formatNumberDE(todaySummary.calories)}</strong>
            <span className="text-zinc-500"> / {formatNumberDE(todaySummary.targetCalories)} kcal</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${todaySummary.calOver ? 'bg-rose-500' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(100, todaySummary.calPct)}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80 font-mono text-[10px] tabular-nums">
            <div>
              <span className="text-zinc-500 block">PROTEIN</span>
              <span className="text-zinc-200 font-bold">
                {Math.round(todaySummary.protein)}/{todaySummary.targetProtein}g
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">HABITS</span>
              <span className="text-sky-400 font-bold">
                {todaySummary.habitsDone}/{todaySummary.habitsTotal}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Rail */}
        <nav aria-label="Hauptnavigation" className="flex flex-col gap-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                aria-current={item.active ? 'page' : undefined}
                className={`h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-left border-l-2 transition ${
                  item.active
                    ? 'bg-zinc-900 text-zinc-50 border-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.active ? 'text-emerald-400' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <UiSwitcherBar layout="stack" />
          <div className="px-1 text-[10px] font-mono leading-relaxed text-zinc-500">
            BLS 4.0 (MRI, CC BY 4.0) &amp; Open Food Facts (ODbL)
          </div>
        </div>
      </aside>

      {/* Top Architectural Bar */}
      <header className="sticky top-0 z-30 ui-header-surface">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="hidden sm:flex lg:hidden items-center gap-2 shrink-0">
            <img src={`${import.meta.env.BASE_URL}icon.svg?v=2`} alt="" className="w-7 h-7 rounded-md" />
            <span className="font-display text-sm font-bold tracking-tight">HEALTH TRACKER</span>
          </div>

          <DateStepper
            selectedDate={selectedDate}
            todayKey={todayKey}
            setSelectedDate={setSelectedDate}
            addDays={addDays}
            dateHeader={dateHeader}
            tone="kinetic"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:block lg:hidden">
              <UiSwitcherBar compact />
            </div>
            <div className="sm:hidden">
              <UiSwitcherMobileButton />
            </div>

            <SyncHeaderButton sync={sync} onOpenSettings={() => onOpenSettings('gdrive')} />

            <button
              type="button"
              onClick={onCopyYesterday}
              disabled={yesterdayLogsCount === 0}
              title={
                yesterdayLogsCount > 0
                  ? `${yesterdayLogsCount} Mahlzeiten von gestern übernehmen`
                  : 'Keine Einträge von gestern vorhanden'
              }
              className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono font-medium text-zinc-200 hover:border-zinc-700 disabled:opacity-40 transition"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>GESTERN</span>
              {yesterdayLogsCount > 0 && (
                <span className="px-1 rounded bg-zinc-800 text-[10px] font-bold tabular-nums text-emerald-300">
                  {yesterdayLogsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenSettings('targets')}
              aria-label="Ziele & Backup öffnen"
              className="inline-flex lg:hidden items-center gap-1.5 h-8 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-200"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-300" />
              <span className="hidden sm:inline">Ziele</span>
            </button>
          </div>
        </div>
      </header>

      <SyncBanner sync={sync} />

      <main className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 space-y-5">
        {/* Tablet Nav (sm..lg) */}
        <div className="hidden sm:flex lg:hidden items-center justify-between gap-2">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
            {tabletTabs.map((t) => {
              const Icon = t.icon;
              const active = activeView === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveView(t.id)}
                  className={`h-8 px-3 rounded-md inline-flex items-center gap-1.5 text-xs font-semibold transition ${
                    active ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {children}
      </main>

      {/* Edge-to-Edge Docked Mobile Bar */}
      <nav
        aria-label="Hauptnavigation"
        className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-2 pb-[env(safe-area-inset-bottom)] h-[calc(62px+env(safe-area-inset-bottom))] flex items-center justify-around"
      >
        {mobileTabs.map((item) => {
          if (item.key === 'scan') {
            return (
              <button
                key="scan"
                type="button"
                onClick={onOpenScanner}
                aria-label="Barcode scannen"
                className="h-10 px-3.5 rounded-lg bg-emerald-400 text-zinc-950 flex items-center justify-center font-bold active:scale-95 transition"
              >
                <ScanBarcode className="w-5 h-5" strokeWidth={2.2} />
              </button>
            );
          }
          const Icon = item.icon!;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
              className={`relative w-[60px] h-full flex flex-col items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-wider transition ${
                item.active ? 'text-emerald-400 font-bold' : 'text-zinc-500'
              }`}
            >
              {item.active && (
                <span className="absolute top-0 inset-x-2 h-[2px] bg-emerald-400" aria-hidden="true" />
              )}
              <Icon className="w-4 h-4" strokeWidth={2} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ============================================================================
   SHELL 3: NOCTURNE EDITORIAL — Warm Centered Journal + Underline Tabs
   ============================================================================ */
function NocturneShell({
  activeView,
  setActiveView,
  mobileSection,
  setMobileSection,
  selectedDate,
  todayKey,
  setSelectedDate,
  addDays,
  dateHeader,
  sync,
  yesterdayLogsCount,
  onCopyYesterday,
  onOpenScanner,
  onOpenSettings,
  children,
}: AppShellProps) {
  const editorialTabs = [
    { id: 'daily' as const, label: 'Tagesjournal & Habits' },
    { id: 'training' as const, label: 'Training' },
    { id: 'weight' as const, label: 'Gewichtsverlauf' },
  ];

  const mobileTabs = [
    {
      key: 'today',
      label: 'Journal',
      icon: House,
      active: activeView === 'daily' && mobileSection !== 'habits',
      onClick: () => {
        setActiveView('daily');
        setMobileSection('all');
        scrollTop();
      },
    },
    {
      key: 'habits',
      label: 'Habits',
      icon: SquareCheckBig,
      active: activeView === 'daily' && mobileSection === 'habits',
      onClick: () => {
        setActiveView('daily');
        setMobileSection('habits');
        scrollTop();
      },
    },
    { key: 'scan' },
    {
      key: 'training',
      label: 'Training',
      icon: Dumbbell,
      active: activeView === 'training',
      onClick: () => {
        setActiveView('training');
        scrollTop();
      },
    },
    {
      key: 'weight',
      label: 'Gewicht',
      icon: TrendingUp,
      active: activeView === 'weight',
      onClick: () => {
        setActiveView('weight');
        scrollTop();
      },
    },
  ];

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-emerald-500/25 selection:text-emerald-200 pb-28 sm:pb-20">
      <header className="sticky top-0 z-30 ui-header-surface">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Editorial Serif Brand */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <img src={`${import.meta.env.BASE_URL}icon.svg?v=2`} alt="" className="w-7 h-7 rounded-lg opacity-90" />
            <div>
              <span className="font-display text-base font-medium tracking-tight text-zinc-50 leading-none block">
                Health Journal
              </span>
              <span className="text-[10px] text-zinc-500">Ernährung · Habits · Kraft</span>
            </div>
          </div>

          <DateStepper
            selectedDate={selectedDate}
            todayKey={todayKey}
            setSelectedDate={setSelectedDate}
            addDays={addDays}
            dateHeader={dateHeader}
            tone="nocturne"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:block">
              <UiSwitcherBar compact />
            </div>
            <div className="sm:hidden">
              <UiSwitcherMobileButton />
            </div>

            <SyncHeaderButton sync={sync} onOpenSettings={() => onOpenSettings('gdrive')} />

            <button
              type="button"
              onClick={onCopyYesterday}
              disabled={yesterdayLogsCount === 0}
              title={
                yesterdayLogsCount > 0
                  ? `${yesterdayLogsCount} Mahlzeiten von gestern übernehmen`
                  : 'Keine Einträge von gestern vorhanden'
              }
              className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 hover:text-zinc-100 disabled:opacity-40 transition"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Gestern</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenSettings('targets')}
              aria-label="Ziele & Backup öffnen"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 hover:border-zinc-700 transition"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden lg:inline">Einstellungen</span>
            </button>
          </div>
        </div>

        {/* Desktop & Tablet Editorial Underline Tab Bar */}
        <div className="hidden sm:block border-t border-zinc-800/60">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-4">
            <nav aria-label="Hauptnavigation" className="flex items-center gap-6">
              {editorialTabs.map((t) => {
                const active = activeView === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveView(t.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`py-2.5 text-xs sm:text-[13px] font-medium border-b-2 transition -mb-px ${
                      active
                        ? 'border-emerald-400 text-zinc-50'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={onOpenScanner}
              className="inline-flex items-center gap-1.5 py-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
            >
              <ScanBarcode className="w-3.5 h-3.5" />
              <span>Barcode scannen</span>
            </button>
          </div>
        </div>
      </header>

      <SyncBanner sync={sync} />

      <main className="relative z-10 max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-7 space-y-6">
        {children}

        <footer className="hidden sm:block pt-6 border-t border-zinc-800/60 text-center text-[11px] text-zinc-500">
          Lebensmittel: Bundeslebensmittelschlüssel 4.0 (Max Rubner-Institut, CC BY 4.0) &amp; Open Food Facts (ODbL)
        </footer>
      </main>

      {/* Minimalist Warm Espresso Mobile Bottom Bar */}
      <nav
        aria-label="Hauptnavigation"
        className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md px-2 pb-[env(safe-area-inset-bottom)] h-[calc(62px+env(safe-area-inset-bottom))] flex items-center justify-around"
      >
        {mobileTabs.map((item) => {
          if (item.key === 'scan') {
            return (
              <button
                key="scan"
                type="button"
                onClick={onOpenScanner}
                aria-label="Barcode scannen"
                className="w-11 h-11 rounded-full bg-emerald-400 text-zinc-950 flex items-center justify-center active:scale-95 transition"
              >
                <ScanBarcode className="w-5 h-5" strokeWidth={1.9} />
              </button>
            );
          }
          const Icon = item.icon!;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
              className={`w-[58px] h-full flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
                item.active ? 'text-zinc-100' : 'text-zinc-500'
              }`}
            >
              <Icon className={`w-4 h-4 ${item.active ? 'text-emerald-400' : ''}`} strokeWidth={1.75} />
              <span>{item.label}</span>
              <span
                className={`w-1 h-1 rounded-full transition ${
                  item.active ? 'bg-emerald-400' : 'bg-transparent'
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
