// ============================================================================
// GOOGLE DRIVE: ANMELDUNG (OAUTH-REDIRECT) & DATEIZUGRIFF
// ----------------------------------------------------------------------------
// Anmeldung ohne Server über den OAuth-2.0-Redirect-Flow für Browser-Apps:
// Die Seite leitet zu Google weiter und kommt mit einem Access-Token (1 Std.
// gültig) im URL-Fragment zurück. Ein Redirect funktioniert – anders als ein
// Popup – auch zuverlässig in installierten PWAs auf iOS und Android.
//
// Zugriffsrecht `drive.file`: Die App sieht nur Dateien, die sie selbst angelegt
// hat. Sie liegen sichtbar im Ordner "Health Habit Tracker" in deinem Drive.
// ============================================================================

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const DRIVE_FOLDER_NAME = 'Health Habit Tracker';
export const SYNC_FILE_NAME = 'health-habit-tracker-sync.json';
const BACKUP_PREFIX = 'backup-';
const BACKUP_KEEP = 14;

const TOKEN_KEY = 'hht_gdrive_token_v2';
const OAUTH_STATE_KEY = 'hht_gdrive_oauth_state';

export class DriveAuthError extends Error {}

// ----------------------------------------------------------------------------
// Token
// ----------------------------------------------------------------------------

export interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

export function loadToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw) as StoredToken;
    // 2 Minuten Puffer, damit ein laufender Sync nicht mittendrin abläuft
    if (!token.accessToken || token.expiresAt - 120_000 < Date.now()) return null;
    return token;
  } catch {
    return null;
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignorieren
  }
}

/** Adresse, zu der Google nach der Anmeldung zurückleitet (muss in der Cloud Console eingetragen sein). */
export function redirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

/** Leitet zur Google-Anmeldung weiter. `silent` versucht es ohne Rückfrage (prompt=none). */
export function startGoogleSignIn(
  clientId: string,
  opts: { silent?: boolean; loginHint?: string } = {}
): void {
  const state = crypto.randomUUID();
  try {
    localStorage.setItem(OAUTH_STATE_KEY, JSON.stringify({ state, silent: Boolean(opts.silent) }));
  } catch {
    // ignorieren
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: DRIVE_SCOPE,
    include_granted_scopes: 'true',
    state,
  });
  if (opts.loginHint?.trim()) params.set('login_hint', opts.loginHint.trim());
  if (opts.silent) params.set('prompt', 'none');
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export type RedirectResult =
  | { kind: 'none' }
  | { kind: 'token'; token: StoredToken }
  | { kind: 'error'; error: string; silent: boolean };

/**
 * Wertet beim Start ein evtl. vorhandenes OAuth-Ergebnis im URL-Fragment aus,
 * speichert das Token und entfernt das Fragment aus der Adresszeile.
 */
export function consumeOAuthRedirect(): RedirectResult {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  if (!hash) return { kind: 'none' };
  const params = new URLSearchParams(hash);
  if (!params.has('access_token') && !params.has('error')) return { kind: 'none' };

  let expected: { state?: string; silent?: boolean } = {};
  try {
    expected = JSON.parse(localStorage.getItem(OAUTH_STATE_KEY) || '{}');
    localStorage.removeItem(OAUTH_STATE_KEY);
  } catch {
    // ignorieren
  }
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

  if (!expected.state || params.get('state') !== expected.state) {
    return { kind: 'error', error: 'Ungültige Anmeldeantwort (state). Bitte erneut anmelden.', silent: false };
  }
  const error = params.get('error');
  if (error) return { kind: 'error', error, silent: Boolean(expected.silent) };

  const scopes = (params.get('scope') || '').split(' ');
  if (!scopes.includes(DRIVE_SCOPE)) {
    return {
      kind: 'error',
      error: 'Der Drive-Zugriff wurde nicht erlaubt. Bitte bei der Anmeldung das Häkchen für Google Drive setzen.',
      silent: false,
    };
  }

  const token: StoredToken = {
    accessToken: params.get('access_token')!,
    expiresAt: Date.now() + Number(params.get('expires_in') || 3600) * 1000,
  };
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  } catch {
    // ignorieren
  }
  return { kind: 'token', token };
}

export async function revokeToken(accessToken: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
    });
  } catch {
    // ignorieren
  }
  clearToken();
}

/**
 * Liest die E-Mail-Adresse des angemeldeten Google-Kontos für `login_hint`
 * (funktioniert mit dem bestehenden `drive.file`-Zugriffsrecht).
 */
export async function getUserEmail(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}/about?fields=user(emailAddress)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const email = json?.user?.emailAddress;
    return typeof email === 'string' && email.includes('@') ? email.trim() : null;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Drive REST
// ----------------------------------------------------------------------------

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export interface DriveFile {
  id: string;
  name: string;
  version?: string;
}

async function call(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  if (res.status === 401) {
    clearToken();
    throw new DriveAuthError('Google-Anmeldung abgelaufen.');
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message || '';
    } catch {
      // ignorieren
    }
    throw new Error(`Google Drive Fehler ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  return res;
}

function q(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function listFiles(token: string, query: string, orderBy?: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: query,
    spaces: 'drive',
    fields: 'files(id,name,version)',
    pageSize: '100',
  });
  if (orderBy) params.set('orderBy', orderBy);
  const res = await call(token, `${API}/files?${params}`);
  const json = await res.json();
  return Array.isArray(json.files) ? json.files : [];
}

export async function ensureFolder(token: string): Promise<string> {
  const found = await listFiles(
    token,
    `name='${q(DRIVE_FOLDER_NAME)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  if (found[0]) return found[0].id;
  const res = await call(token, `${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  return (await res.json()).id;
}

export async function findFile(token: string, folderId: string, name: string): Promise<DriveFile | null> {
  const found = await listFiles(
    token,
    `name='${q(name)}' and '${q(folderId)}' in parents and trashed=false`
  );
  return found[0] ?? null;
}

export async function getVersion(token: string, fileId: string): Promise<string | undefined> {
  const res = await call(token, `${API}/files/${encodeURIComponent(fileId)}?fields=version`);
  return (await res.json()).version;
}

export async function downloadJson(token: string, fileId: string): Promise<unknown> {
  const res = await call(token, `${API}/files/${encodeURIComponent(fileId)}?alt=media`);
  return res.json();
}

/** keepalive erlaubt, dass der Upload beim Schließen der App noch zu Ende läuft (max. 64 KB). */
function keepaliveFor(body: string): boolean {
  return new Blob([body]).size < 60_000;
}

export async function createJsonFile(
  token: string,
  folderId: string,
  name: string,
  content: unknown
): Promise<DriveFile> {
  const boundary = `hht_${crypto.randomUUID()}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify({ name, parents: [folderId], mimeType: 'application/json' })}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    `${JSON.stringify(content)}\r\n--${boundary}--`;
  const res = await call(token, `${UPLOAD}/files?uploadType=multipart&fields=id,name,version`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
    keepalive: keepaliveFor(body),
  });
  return res.json();
}

export async function updateJsonFile(token: string, fileId: string, content: unknown): Promise<DriveFile> {
  const body = JSON.stringify(content);
  const res = await call(
    token,
    `${UPLOAD}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,version`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: keepaliveFor(body),
    }
  );
  return res.json();
}

/**
 * Legt einmal pro Tag eine Kopie des aktuellen Drive-Stands an und behält die
 * letzten 14 Tage. Fehler hier brechen den Sync nicht ab.
 */
export async function dailyBackup(
  token: string,
  folderId: string,
  dateKey: string,
  content: unknown
): Promise<void> {
  const name = `${BACKUP_PREFIX}${dateKey}.json`;
  const backups = await listFiles(
    token,
    `name contains '${BACKUP_PREFIX}' and '${q(folderId)}' in parents and trashed=false`,
    'name desc'
  );
  if (!backups.some((f) => f.name === name)) {
    await createJsonFile(token, folderId, name, content);
    backups.unshift({ id: '', name });
  }
  const old = backups
    .filter((f) => f.name.startsWith(BACKUP_PREFIX))
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(BACKUP_KEEP);
  for (const file of old) {
    if (file.id) {
      // In den Papierkorb statt endgültig löschen
      await call(token, `${API}/files/${encodeURIComponent(file.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashed: true }),
      });
    }
  }
}
