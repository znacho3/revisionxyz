/**
 * Migrates cheatsheet assets to Supabase Storage.
 *
 * Thumbnails: uploads from local public/cheatsheets/cheatsheet-thumbnails/
 * PDFs:       downloads from dl.pirateib.sh and uploads to Supabase Storage
 *
 * Run: node scripts/migrate-cheatsheets-to-storage.mjs
 *
 * After this runs, cheatsheets.pdf_url and cheatsheets.thumbnail_url
 * will point to Supabase Storage URLs.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://pyhqqcgkpnyeiddycjfo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'cheatsheets';
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
const THUMBNAILS_DIR = path.resolve('public/cheatsheets/cheatsheet-thumbnails');
const R2_BASE = 'https://dl.pirateib.sh/Revision%20Dojo%20Archive/cheatsheets';

async function uploadBuffer(storagePath, buffer, contentType) {
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Upload ${storagePath}: ${error.message}`);
}

async function migrateThumbnails(cheatsheets) {
  console.log('\n── Thumbnails ────────────────────────────────');
  let ok = 0, skip = 0, fail = 0;

  for (const c of cheatsheets) {
    const localFile = path.join(THUMBNAILS_DIR, `${c.id}.jpg`);
    if (!fs.existsSync(localFile)) {
      process.stdout.write(`  skip (no local file): ${c.id}\n`);
      skip++;
      continue;
    }
    try {
      const buf = fs.readFileSync(localFile);
      await uploadBuffer(`thumbnails/${c.id}.jpg`, buf, 'image/jpeg');
      ok++;
      process.stdout.write(`\r  uploaded ${ok}/${cheatsheets.length}`);
    } catch (e) {
      console.error(`\n  FAIL thumbnail ${c.id}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n  Done: ${ok} uploaded, ${skip} skipped, ${fail} failed`);
  return ok;
}

async function migratePdfs(cheatsheets) {
  console.log('\n── PDFs ──────────────────────────────────────');
  let ok = 0, fail = 0;

  for (const c of cheatsheets) {
    if (!c.r2_key) { console.warn(`  skip (no r2_key): ${c.id}`); continue; }
    const r2Url = `${R2_BASE}/${encodeURIComponent(c.r2_key)}`;
    try {
      const res = await fetch(r2Url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${r2Url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await uploadBuffer(`pdfs/${c.id}.pdf`, buf, 'application/pdf');
      ok++;
      process.stdout.write(`\r  uploaded ${ok}/${cheatsheets.length}`);
    } catch (e) {
      console.error(`\n  FAIL pdf ${c.id}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n  Done: ${ok} uploaded, ${fail} failed`);
  return ok;
}

async function updateUrls(cheatsheets) {
  console.log('\n── Updating database URLs ────────────────────');
  let ok = 0;
  const CHUNK = 50;
  for (let i = 0; i < cheatsheets.length; i += CHUNK) {
    const chunk = cheatsheets.slice(i, i + CHUNK);
    for (const c of chunk) {
      const { error } = await sb.from('cheatsheets').update({
        pdf_url: `${STORAGE_BASE}/pdfs/${c.id}.pdf`,
        thumbnail_url: `${STORAGE_BASE}/thumbnails/${c.id}.jpg`,
      }).eq('id', c.id);
      if (error) console.error(`  FAIL update ${c.id}: ${error.message}`);
      else ok++;
    }
    process.stdout.write(`\r  updated ${Math.min(i + CHUNK, cheatsheets.length)}/${cheatsheets.length}`);
  }
  console.log(`\n  Done: ${ok} rows updated`);
}

const start = Date.now();
console.log('Fetching cheatsheets list…');
const { data: cheatsheets, error } = await sb.from('cheatsheets').select('id, r2_key');
if (error) { console.error(error.message); process.exit(1); }
console.log(`Found ${cheatsheets.length} cheatsheets`);

await migrateThumbnails(cheatsheets);
await migratePdfs(cheatsheets);
await updateUrls(cheatsheets);

console.log(`\nAll done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
