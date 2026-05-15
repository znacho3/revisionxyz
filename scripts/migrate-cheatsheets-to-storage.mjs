/**
 * Migrates cheatsheet assets to Supabase Storage.
 *
 * Thumbnails: from local  public/cheatsheets/cheatsheet-thumbnails/{id}.jpg
 * PDFs:       from a local directory of downloaded PDFs (see --pdf-dir flag)
 *             OR from a cheatsheets.zip extracted somewhere
 *
 * Usage:
 *   node scripts/migrate-cheatsheets-to-storage.mjs
 *   node scripts/migrate-cheatsheets-to-storage.mjs --pdf-dir /path/to/extracted/zip
 *
 * Requires in .env: SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://pyhqqcgkpnyeiddycjfo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Optional: path to a local folder of PDFs (flat, named {id}.pdf)
const pdfDirArg = process.argv.indexOf('--pdf-dir');
const PDF_DIR = pdfDirArg !== -1 ? path.resolve(process.argv[pdfDirArg + 1]) : null;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'cheatsheets';
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
const THUMBNAILS_DIR = path.resolve('public/cheatsheets/cheatsheet-thumbnails');
const R2_BASE = 'https://dl.pirateib.sh/Revision%20Dojo%20Archive/cheatsheets/';

async function upload(storagePath, buffer, contentType) {
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Upload ${storagePath}: ${error.message}`);
}

async function migrateThumbnails(cheatsheets) {
  console.log('\n── Thumbnails (local disk) ───────────────────────');
  let ok = 0, skip = 0, fail = 0;
  for (const c of cheatsheets) {
    const file = path.join(THUMBNAILS_DIR, `${c.id}.jpg`);
    if (!fs.existsSync(file)) { skip++; continue; }
    try {
      await upload(`thumbnails/${c.id}.jpg`, fs.readFileSync(file), 'image/jpeg');
      ok++;
      process.stdout.write(`\r  ${ok}/${cheatsheets.length}`);
    } catch (e) {
      fail++;
      console.error(`\n  FAIL ${c.id}: ${e.message}`);
    }
  }
  console.log(`\n  Done: ${ok} uploaded, ${skip} skipped, ${fail} failed`);
}

async function migratePdfs(cheatsheets) {
  if (PDF_DIR) {
    // Read from local directory
    console.log(`\n── PDFs (from ${PDF_DIR}) ─────────────────────────`);
    let ok = 0, skip = 0, fail = 0;
    for (const c of cheatsheets) {
      const file = path.join(PDF_DIR, `${c.id}.pdf`);
      if (!fs.existsSync(file)) { skip++; continue; }
      try {
        await upload(`pdfs/${c.id}.pdf`, fs.readFileSync(file), 'application/pdf');
        ok++;
        process.stdout.write(`\r  ${ok}/${cheatsheets.length}`);
      } catch (e) {
        fail++;
        console.error(`\n  FAIL ${c.id}: ${e.message}`);
      }
    }
    console.log(`\n  Done: ${ok} uploaded, ${skip} skipped, ${fail} failed`);
    return ok;
  }

  // Download from R2 via HTTP
  console.log('\n── PDFs (downloading from R2) ────────────────────');
  let ok = 0, fail = 0;
  for (let i = 0; i < cheatsheets.length; i++) {
    const c = cheatsheets[i];
    if (!c.r2_key) continue;
    const url = R2_BASE + encodeURIComponent(c.r2_key);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await upload(`pdfs/${c.id}.pdf`, buf, 'application/pdf');
      ok++;
      process.stdout.write(`\r  ${ok}/${cheatsheets.length}`);
    } catch (e) {
      if (fail === 0) console.error(`\n  First failure (${c.r2_key}): ${e.message}`);
      fail++;
    }
  }
  console.log(`\n  Done: ${ok} uploaded, ${fail} failed`);
  return ok;
}

async function updateUrls(cheatsheets) {
  console.log('\n── Updating DB URLs ──────────────────────────────');
  let ok = 0;
  for (const c of cheatsheets) {
    const { error } = await sb.from('cheatsheets').update({
      pdf_url: `${STORAGE_BASE}/pdfs/${c.id}.pdf`,
      thumbnail_url: `${STORAGE_BASE}/thumbnails/${c.id}.jpg`,
    }).eq('id', c.id);
    if (error) console.error(`  FAIL update ${c.id}: ${error.message}`);
    else ok++;
  }
  console.log(`  Done: ${ok} rows updated`);
}

console.log('Fetching cheatsheet list…');
const { data: cheatsheets, error } = await sb.from('cheatsheets').select('id, r2_key');
if (error) { console.error(error.message); process.exit(1); }
console.log(`Found ${cheatsheets.length} cheatsheets`);

const t = Date.now();
await migrateThumbnails(cheatsheets);
await migratePdfs(cheatsheets);
await updateUrls(cheatsheets);
console.log(`\nAll done in ${((Date.now() - t) / 1000).toFixed(1)}s`);
