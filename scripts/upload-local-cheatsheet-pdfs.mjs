/**
 * Uploads cheatsheet PDFs from public/cheatsheets/cheatsheets/{Subject}/{title}.pdf
 * to Supabase Storage at pdfs/{id}.pdf, then updates the pdf_url column.
 *
 * Usage:
 *   node scripts/upload-local-cheatsheet-pdfs.mjs
 *   node scripts/upload-local-cheatsheet-pdfs.mjs --dry-run   (match only, no uploads)
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
const LOCAL_DIR = path.resolve('public/cheatsheets/cheatsheets');
const BUCKET = 'cheatsheets';
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[/\\?%*:|"<>\-–]/g, ' ')  // collapse separators (: ? / - –) to space
    .replace(/\s+/g, ' ')
    .trim();
}

// Build index: normalizedTitle → absolute file path
function buildLocalIndex(dir) {
  const index = new Map();
  for (const subject of fs.readdirSync(dir)) {
    const subjectDir = path.join(dir, subject);
    if (!fs.statSync(subjectDir).isDirectory()) continue;
    for (const file of fs.readdirSync(subjectDir)) {
      if (!file.endsWith('.pdf')) continue;
      const title = file.slice(0, -4); // strip .pdf
      index.set(normalize(title), path.join(subjectDir, file));
    }
  }
  return index;
}

async function run() {
  console.log('Building local PDF index…');
  const localIndex = buildLocalIndex(LOCAL_DIR);
  console.log(`  ${localIndex.size} local PDFs found`);

  console.log('Fetching cheatsheets from DB…');
  const { data: sheets, error } = await sb
    .from('cheatsheets')
    .select('id, title, pdf_url');
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`  ${sheets.length} cheatsheets in DB`);

  const matched = [];
  const unmatched = [];

  for (const sheet of sheets) {
    const key = normalize(sheet.title);
    const filePath = localIndex.get(key);
    if (filePath) {
      matched.push({ sheet, filePath });
    } else {
      unmatched.push(sheet);
    }
  }

  console.log(`\nMatched: ${matched.length}  |  Unmatched: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log('\n── Unmatched cheatsheets ─────────────────────────');
    for (const s of unmatched) console.log(`  ✗ ${s.title}`);
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] No uploads performed.');
    return;
  }

  console.log('\n── Uploading PDFs ────────────────────────────────');
  let ok = 0, fail = 0;
  for (const { sheet, filePath } of matched) {
    const buf = fs.readFileSync(filePath);
    const storagePath = `pdfs/${sheet.id}.pdf`;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, buf, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (upErr) {
      fail++;
      console.error(`\n  FAIL ${sheet.title}: ${upErr.message}`);
      continue;
    }
    ok++;
    process.stdout.write(`\r  ${ok}/${matched.length} uploaded`);
  }
  console.log(`\n  Done: ${ok} uploaded, ${fail} failed`);

  console.log('\n── Updating pdf_url in DB ────────────────────────');
  let dbOk = 0;
  for (const { sheet } of matched) {
    const { error: dbErr } = await sb
      .from('cheatsheets')
      .update({ pdf_url: `${STORAGE_BASE}/pdfs/${sheet.id}.pdf` })
      .eq('id', sheet.id);
    if (dbErr) console.error(`  FAIL update ${sheet.id}: ${dbErr.message}`);
    else dbOk++;
  }
  console.log(`  Done: ${dbOk} rows updated`);
}

run();
