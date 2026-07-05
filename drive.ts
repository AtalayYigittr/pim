// Google Drive API yardımcı fonksiyonları
export const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';

export async function driveRequest(
  method: string, path: string, accessToken: string,
  body?: object, params?: Record<string, string>
): Promise<any> {
  const url = new URL('https://www.googleapis.com' + path);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: 'Bearer ' + accessToken, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message || res.statusText);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export async function findOrCreateFile(accessToken: string, filename: string): Promise<string> {
  const res = await driveRequest('GET', '/drive/v3/files', accessToken, undefined, {
    q: `name='${filename}' and mimeType='application/json' and trashed=false`,
    fields: 'files(id,name)', spaces: 'drive',
  });
  if (res.files && res.files.length > 0) return res.files[0].id;

  const boundary = 'bnd_pazar';
  const multipart = [
    `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '',
    JSON.stringify({ name: filename, mimeType: 'application/json' }),
    `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '',
    JSON.stringify({ _created: new Date().toISOString() }),
    `--${boundary}--`,
  ].join('\r\n');

  const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart,
  }).then(r => r.json());
  return r.id;
}

export async function readDriveFile(accessToken: string, fileId: string): Promise<any> {
  const text = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: 'Bearer ' + accessToken },
  }).then(r => { if (!r.ok) throw new Error('Drive okuma: ' + r.status); return r.text(); });
  try { return JSON.parse(text); } catch { return {}; }
}

export async function writeDriveFile(accessToken: string, fileId: string, data: object): Promise<void> {
  await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
