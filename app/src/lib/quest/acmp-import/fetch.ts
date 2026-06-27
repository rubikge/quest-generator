/**
 * ACMP page fetcher (offline import stage). ACMP serves Windows-1251-encoded HTML, so we decode
 * the raw bytes explicitly. The fetch implementation is injectable for testing.
 */

export interface FetchedPage {
  id: string;
  sourceUrl: string;
  html: string;
}

export function taskUrl(id: string | number): string {
  return `https://acmp.ru/index.asp?main=task&id_task=${id}`;
}

export async function fetchTaskPage(id: string | number, fetchImpl: typeof fetch = fetch): Promise<FetchedPage> {
  const sourceUrl = taskUrl(id);
  const res = await fetchImpl(sourceUrl);
  if (!res.ok) throw new Error(`ACMP fetch failed for task ${id}: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const html = new TextDecoder('windows-1251').decode(buf);
  return { id: String(id), sourceUrl, html };
}

/** Fetch the all-tasks listing (Windows-1251 decoded) for task discovery / complexity. */
export async function fetchTasksListing(fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl('https://acmp.ru/index.asp?main=tasks');
  if (!res.ok) throw new Error(`ACMP listing fetch failed: HTTP ${res.status}`);
  return new TextDecoder('windows-1251').decode(await res.arrayBuffer());
}
