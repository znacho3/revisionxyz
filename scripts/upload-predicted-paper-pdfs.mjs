/**
 * Uploads predicted paper PDFs to Supabase Storage.
 *
 * Two modes:
 *   --local-dir <path>  Read PDFs from a local folder (files named {id}.pdf)
 *   (default)           Download from R2 via HTTP (requires same-origin access)
 *
 * Usage:
 *   node --env-file=.env scripts/upload-predicted-paper-pdfs.mjs --local-dir /path/to/extracted
 *   node --env-file=.env scripts/upload-predicted-paper-pdfs.mjs --dry-run
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

const DRY_RUN = process.argv.includes('--dry-run');
const localDirArg = process.argv.indexOf('--local-dir');
const LOCAL_DIR = localDirArg !== -1 ? path.resolve(process.argv[localDirArg + 1]) : null;
const R2_BASE = 'https://dl.pirateib.sh/Revision%20Dojo%20Archive/predictedpapers/';
const BUCKET = 'predicted-papers';
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Fetching predicted papers from DB…');
  const { data: papers, error } = await sb
    .from('predicted_papers')
    .select('id, data');
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`  ${papers.length} papers found`);

  // Extract slug from JSONB data field
  const entries = papers
    .map(p => ({ id: p.id, slug: p.data?.slug?.current ?? null }))
    .filter(p => p.slug);

  console.log(`  ${entries.length} have a slug`);

  if (DRY_RUN) {
    console.log('\n[dry-run] First 5 entries:');
    for (const e of entries.slice(0, 5)) console.log(`  ${e.id} → ${e.slug}.pdf`);
    console.log('\n[dry-run] No uploads performed.');
    return;
  }

  let ok = 0, fail = 0;

  if (LOCAL_DIR) {
    console.log(`\n── Uploading from ${LOCAL_DIR} ───────────────────`);
    for (const { id } of entries) {
      const file = path.join(LOCAL_DIR, `${id}.pdf`);
      if (!fs.existsSync(file)) { fail++; continue; }
      try {
        const buf = fs.readFileSync(file);
        const { error: upErr } = await sb.storage.from(BUCKET).upload(`pdfs/${id}.pdf`, buf, {
          contentType: 'application/pdf', upsert: true,
        });
        if (upErr) throw new Error(upErr.message);
        ok++;
      } catch (e) {
        fail++;
        if (fail <= 5) console.error(`\n  FAIL [${id}]: ${e.message}`);
      }
      process.stdout.write(`\r  ${ok + fail}/${entries.length} — ${ok} ok, ${fail} failed`);
    }
  } else {
    console.log('\n── Downloading & Uploading from R2 ───────────────');
    for (let i = 0; i < entries.length; i++) {
      const { id, slug } = entries[i];
      const url = R2_BASE + encodeURIComponent(slug) + '.pdf';
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const { error: upErr } = await sb.storage.from(BUCKET).upload(`pdfs/${id}.pdf`, buf, {
          contentType: 'application/pdf', upsert: true,
        });
        if (upErr) throw new Error(upErr.message);
        ok++;
      } catch (e) {
        fail++;
        if (fail <= 5) console.error(`\n  FAIL [${slug}]: ${e.message}`);
      }
      process.stdout.write(`\r  ${ok + fail}/${entries.length} — ${ok} ok, ${fail} failed`);
    }
  }
  console.log(`\n  Done: ${ok} uploaded, ${fail} failed`);

  console.log('\n── Updating pdf_url in DB ────────────────────────');
  let dbOk = 0;
  for (const { id } of entries) {
    const { error: dbErr } = await sb
      .from('predicted_papers')
      .update({ pdf_url: `${STORAGE_BASE}/pdfs/${id}.pdf` })
      .eq('id', id);
    if (dbErr) console.error(`  FAIL update ${id}: ${dbErr.message}`);
    else dbOk++;
  }
  console.log(`  Done: ${dbOk} rows updated`);
}

run();
