import { useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Check,
  Cloud,
  CloudOff,
  Copy,
  Download,
  Loader2,
  LogIn,
  RefreshCw,
  Upload,
} from 'lucide-react';
import type { SyncApi } from '../sync/useSyncedAppData';
import { DRIVE_FOLDER_NAME, SYNC_FILE_NAME } from '../sync/drive';

function formatTime(iso: string | null): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
const btnPrimary = `${btn} bg-emerald-500 text-zinc-950 hover:bg-emerald-400`;
const btnSecondary = `${btn} bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700`;
const btnGhost = `${btn} text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800`;

// ----------------------------------------------------------------------------
// Header-Button
// ----------------------------------------------------------------------------

export function SyncHeaderButton({ sync, onOpenSettings }: { sync: SyncApi; onOpenSettings: () => void }) {
  const { status } = sync;
  const handleClick = () => {
    if (status === 'off' || status === 'hold') onOpenSettings();
    else if (status === 'needs-auth') sync.signIn();
    else sync.syncNow();
  };

  const label =
    status === 'syncing'
      ? 'Sync...'
      : status === 'synced'
      ? sync.dirty
        ? 'Ungesynct'
        : 'Synchron'
      : status === 'needs-auth'
      ? 'Anmelden'
      : status === 'hold'
      ? 'Pausiert'
      : status === 'error'
      ? 'Sync-Fehler'
      : 'Drive Sync';

  const tone =
    status === 'synced' && !sync.dirty
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
      : status === 'error'
      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
      : status === 'needs-auth' || status === 'hold' || sync.dirty
      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
      : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700';

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Google Drive: ${label} · Letzter Sync: ${formatTime(sync.lastSyncAt)}`}
      className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border text-xs font-medium transition ${tone}`}
    >
      {status === 'syncing' ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : status === 'off' || status === 'error' ? (
        <CloudOff className="w-3.5 h-3.5" />
      ) : (
        <Cloud className="w-3.5 h-3.5" />
      )}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

// ----------------------------------------------------------------------------
// Hinweis-Banner unter dem Header (Anmeldung nötig, Pause, Fehler)
// ----------------------------------------------------------------------------

export function SyncBanner({ sync }: { sync: SyncApi }) {
  const { status } = sync;
  if (status === 'needs-auth') {
    return (
      <BannerShell tone="amber">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-amber-200">
            {sync.dirty ? 'Änderungen noch nicht in Google Drive' : 'Google Drive Sync bereit'}
          </div>
          <div className="text-[11px] text-amber-200/70">
            Tippe zum Anmelden – danach wird sofort synchronisiert.
          </div>
        </div>
        <button type="button" onClick={sync.signIn} className={`${btnPrimary} h-8 px-3 text-xs shrink-0`}>
          <LogIn className="w-3.5 h-3.5" />
          <span>Synchronisieren</span>
        </button>
      </BannerShell>
    );
  }
  if (status === 'hold') {
    return (
      <BannerShell tone="amber">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-amber-200">
            Sync pausiert nach {sync.hold === 'import' ? 'Backup-Import' : 'Zurücksetzen'}
          </div>
          <div className="text-[11px] text-amber-200/70">
            Welcher Stand soll gelten? „Hochladen" überträgt diesen Stand auch auf deine anderen Geräte.
          </div>
        </div>
        {sync.hasToken ? (
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => sync.resolveHold('download')} className={`${btnSecondary} h-8 px-3 text-xs`}>
              <Download className="w-3.5 h-3.5" />
              <span>Drive-Stand laden</span>
            </button>
            <button type="button" onClick={() => sync.resolveHold('upload')} className={`${btnPrimary} h-8 px-3 text-xs`}>
              <Upload className="w-3.5 h-3.5" />
              <span>Hochladen</span>
            </button>
          </div>
        ) : (
          <button type="button" onClick={sync.signIn} className={`${btnPrimary} h-8 px-3 text-xs shrink-0`}>
            <LogIn className="w-3.5 h-3.5" />
            <span>Anmelden</span>
          </button>
        )}
      </BannerShell>
    );
  }
  if (status === 'error') {
    return (
      <BannerShell tone="rose">
        <div className="flex items-start gap-2 min-w-0">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="text-[11px] text-rose-200 break-words">{sync.error}</div>
        </div>
        <button type="button" onClick={sync.syncNow} className={`${btnSecondary} h-8 px-3 text-xs shrink-0`}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Erneut</span>
        </button>
      </BannerShell>
    );
  }
  return null;
}

function BannerShell({ tone, children }: { tone: 'amber' | 'rose'; children: ReactNode }) {
  const cls =
    tone === 'amber' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-rose-500/10 border-rose-500/30';
  return (
    <div className="relative z-20 max-w-6xl mx-auto px-3 sm:px-6 pt-3">
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl border ${cls}`}>
        {children}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Einstellungen-Tab "Google Drive"
// ----------------------------------------------------------------------------

export function SyncSettingsPanel({ sync }: { sync: SyncApi }) {
  const [copied, setCopied] = useState(false);
  const { status } = sync;
  const busy = status === 'syncing';

  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(sync.redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignorieren
    }
  };

  const badge =
    status === 'off'
      ? 'Nicht eingerichtet'
      : status === 'syncing'
      ? 'Synchronisiert...'
      : status === 'synced'
      ? 'Verbunden'
      : status === 'needs-auth'
      ? 'Anmeldung nötig'
      : status === 'hold'
      ? 'Pausiert'
      : 'Fehler';

  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
            <Cloud className="w-4 h-4 text-emerald-400" />
            <span>Google Drive Sync</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
              status === 'synced'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : status === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300'
            }`}
          >
            {badge}
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Gespeichert in deinem Drive im Ordner <code className="text-zinc-300">{DRIVE_FOLDER_NAME}</code> als{' '}
          <code className="text-zinc-300">{SYNC_FILE_NAME}</code>, plus ein Tages-Backup der letzten 14 Tage.
          Abgleich beim Öffnen und beim Verlassen der App.
        </p>
        <div className="text-[11px] text-zinc-500 tabular-nums">
          Letzter Sync: {formatTime(sync.lastSyncAt)}
          {sync.dirty && <span className="text-amber-400"> · ungesynchte Änderungen</span>}
        </div>
      </div>

      <div>
        <label htmlFor="gdrive-client-id" className="block text-xs font-medium text-zinc-300 mb-1">
          Google OAuth Client-ID
        </label>
        <input
          id="gdrive-client-id"
          type="text"
          value={sync.clientId}
          onChange={(e) => sync.setClientId(e.target.value)}
          placeholder="1234567890-abc...apps.googleusercontent.com"
          className="w-full px-3 py-2 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
        />
        <div className="mt-1.5 text-[11px] text-zinc-500 space-y-1">
          <p>In der Google Cloud Console als „Webanwendung" anlegen und diese Adresse bei Origin und Weiterleitungs-URI eintragen:</p>
          <button
            type="button"
            onClick={copyRedirect}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-emerald-400 hover:border-zinc-700 text-left"
          >
            <span className="break-all">{sync.redirectUri}</span>
            {copied ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0 text-zinc-500" />}
          </button>
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={sync.autoSignIn}
          onChange={(e) => sync.setAutoSignIn(e.target.checked)}
          className="mt-0.5 accent-emerald-500"
        />
        <span>
          Beim Öffnen automatisch neu anmelden
          <span className="block text-[11px] text-zinc-500">
            Ohne Tippen: Die App leitet kurz zu Google weiter, wenn die Anmeldung (1 Std.) abgelaufen ist.
          </span>
        </span>
      </label>

      {sync.error && status !== 'syncing' && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span className="break-words">{sync.error}</span>
        </div>
      )}

      {status === 'off' ? null : !sync.hasToken ? (
        <button type="button" onClick={sync.signIn} className={`${btnPrimary} w-full h-10 text-sm`}>
          <LogIn className="w-4 h-4" />
          <span>Bei Google anmelden & synchronisieren</span>
        </button>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={sync.syncNow}
            disabled={busy || status === 'hold'}
            className={`${btnPrimary} w-full h-10 text-sm`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Jetzt synchronisieren</span>
          </button>
          <button type="button" onClick={sync.disconnect} className={`${btnGhost} w-full h-8 text-xs hover:text-rose-300`}>
            Abmelden
          </button>
        </div>
      )}
    </div>
  );
}
