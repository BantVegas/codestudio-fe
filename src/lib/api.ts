const rawBase =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const API_BASE = rawBase.replace(/\/+$/, '');

export async function postJson<TReq, TRes>(
  path: string,
  body: TReq,
): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} – ${text || 'Unknown error'}`);
  }

  return res.json() as Promise<TRes>;
}

export async function getJson<TRes>(path: string): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} – ${text || 'Unknown error'}`);
  }
  return res.json() as Promise<TRes>;
}
