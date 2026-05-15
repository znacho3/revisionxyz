/**
 * Run this in the browser dev console while on:
 *   https://dl.pirateib.sh/Revision%20Dojo%20Archive/cheatsheets
 *
 * Same-origin — no CORS issues. Downloads all PDFs as one ZIP file.
 */
(async () => {
  const SUPABASE_URL = 'https://pyhqqcgkpnyeiddycjfo.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_MgjMY2Fb4RRe9XXbiKRBUg_DHv-G9Ps';
  const PDF_BASE = '/Revision%20Dojo%20Archive/cheatsheets/';

  // Load JSZip
  console.log('[1/4] Loading JSZip…');
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  // Fetch cheatsheet list from Supabase
  console.log('[2/4] Fetching list…');
  const sheets = await fetch(
    `${SUPABASE_URL}/rest/v1/cheatsheets?select=id,title,subject_title&order=subject_title.asc,title.asc&limit=1000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  ).then(r => r.json());
  console.log(`[2/4] ${sheets.length} cheatsheets`);

  // Download PDFs and zip them
  console.log('[3/4] Downloading PDFs…');
  const zip = new JSZip();
  let ok = 0, fail = 0;

  for (let i = 0; i < sheets.length; i++) {
    const c = sheets[i];
    const url = PDF_BASE + c.id + '.pdf';
    const folder = (c.subject_title || 'Other').replace(/[/\\?%*:|"<>]/g, '-');
    const file = c.title.replace(/[/\\?%*:|"<>]/g, '-') + '.pdf';

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      zip.folder(folder).file(file, buf);
      ok++;
    } catch (e) {
      fail++;
      console.warn(`  ✗ [${i + 1}/${sheets.length}] ${c.title}: ${e.message}`);
      continue;
    }

    if (ok % 20 === 0 || i === sheets.length - 1)
      console.log(`  ✓ ${ok}/${sheets.length} (${fail} failed)`);
  }

  // Generate and download ZIP
  console.log(`[4/4] Zipping ${ok} PDFs…`);
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 1 },
  });

  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'cheatsheets.zip',
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);

  console.log(`\n✅ Done! ${ok} PDFs zipped (${fail} failed)`);
})();
