/** Copy / share / CSV helpers. All client-side; nothing is uploaded. */

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function shareResult(
  title: string,
  text: string,
  url: string = window.location.href,
): Promise<'shared' | 'copied' | 'failed'> {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ title, text, url });
      return 'shared';
    } catch (err) {
      const e = err as { name?: string };
      if (e?.name === 'AbortError') return 'failed';
    }
  }
  return (await copyText(`${text}\n${url}`)) ? 'copied' : 'failed';
}

export function toCSV(columns: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(',')).join('\n');
  return `${head}\n${body}`;
}

export function downloadCSV(filename: string, csv: string): void {
  // BOM keeps Excel happy with the ₹ sign.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printPage(): void {
  window.print();
}
