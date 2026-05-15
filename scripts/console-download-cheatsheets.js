/**
 * Run this in the browser dev console on https://www.revisiondojo.com
 * while logged in. It fetches all PDFs (using your session cookies for auth)
 * and bundles them into a single ZIP download.
 *
 * Steps:
 *   1. Go to revisiondojo.com and open any cheatsheet so auth cookies are set
 *   2. Open DevTools → Console
 *   3. Paste this entire script and press Enter
 *   4. Allow the ZIP download when prompted
 */
(async () => {
  // ── Config ──────────────────────────────────────────────────────────────────
  const SUPABASE_URL = 'https://pyhqqcgkpnyeiddycjfo.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_MgjMY2Fb4RRe9XXbiKRBUg_DHv-G9Ps';
  const PDF_BASE    = 'https://dl.pirateib.sh/Revision%20Dojo%20Archive/cheatsheets/';

  // ── Load JSZip ──────────────────────────────────────────────────────────────
  console.log('[1/4] Loading JSZip…');
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  // ── Fetch cheatsheet list ────────────────────────────────────────────────────
  console.log('[2/4] Fetching cheatsheet list from Supabase…');
  const sheets = await fetch(
    `${SUPABASE_URL}/rest/v1/cheatsheets?select=id,title,r2_key,subject_title&order=subject_title.asc,title.asc&limit=1000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  ).then(r => r.json());
  console.log(`[2/4] Found ${sheets.length} cheatsheets`);

  // ── Download each PDF ────────────────────────────────────────────────────────
  console.log('[3/4] Downloading PDFs (this will take a few minutes)…');
  const zip = new JSZip();
  let ok = 0, fail = 0;

  for (let i = 0; i < sheets.length; i++) {
    const c = sheets[i];
    const url = PDF_BASE + encodeURIComponent(c.r2_key);
    const folder = (c.subject_title || 'Other').replace(/[/\\?%*:|"<>]/g, '-');
    const file   = c.title.replace(/[/\\?%*:|"<>]/g, '-') + '.pdf';

    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      zip.folder(folder).file(file, buf);
      ok++;
    } catch (e) {
      fail++;
      console.warn(`  ✗ [${i+1}/${sheets.length}] ${c.title}: ${e.message}`);
      continue;
    }

    if (ok % 10 === 0 || i === sheets.length - 1)
      console.log(`  ✓ ${ok}/${sheets.length} downloaded (${fail} failed)`);
  }

  // ── Bundle & save ────────────────────────────────────────────────────────────
  console.log(`[4/4] Creating ZIP (${ok} PDFs)…`);
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 1 },  // fast, PDFs are already compressed
  });

  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'revisionxyz-cheatsheets.zip',
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);

  console.log(`\n✅ Done! ${ok} PDFs in cheatsheets.zip (${fail} failed)`);
  if (fail > 0) console.warn(`Re-run if you got many failures — auth cookies may have expired mid-run.`);
})();
