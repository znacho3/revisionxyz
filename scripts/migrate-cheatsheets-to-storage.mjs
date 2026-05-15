/**
 * Migrates cheatsheet assets to Supabase Storage.
 *
 * Thumbnails: uploads from local public/cheatsheets/cheatsheet-thumbnails/
 * PDFs:       downloads from private Cloudflare R2 via S3-compatible API
 *
 * Requires in .env:
 *   SUPABASE_SERVICE_ROLE_KEY
 *   R2_ACCOUNT_ID       — Cloudflare account ID (32-char hex)
 *   R2_ACCESS_KEY_ID    — R2 API token Access Key
 *   R2_SECRET_ACCESS_KEY — R2 API token Secret Key
 *   R2_BUCKET_NAME      — name of the R2 bucket (e.g. "revision-dojo-archive")
 *   R2_PDF_PREFIX       — path prefix inside bucket (e.g. "cheatsheets/" or "Revision Dojo Archive/cheatsheets/")
 *
 * Run: node scripts/migrate-cheatsheets-to-storage.mjs
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://pyhqqcgkpnyeiddycjfo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PDF_PREFIX = process.env.R2_PDF_PREFIX ?? '';

if (!SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error(`
Missing R2 credentials. Add to .env:
  R2_ACCOUNT_ID       = your Cloudflare account ID (32-char hex, from dash.cloudflare.com)
  R2_ACCESS_KEY_ID    = R2 API token access key
  R2_SECRET_ACCESS_KEY = R2 API token secret key
  R2_BUCKET_NAME      = the R2 bucket name
  R2_PDF_PREFIX       = path prefix inside bucket (e.g. "Revision Dojo Archive/cheatsheets/")

Get R2 tokens at: Cloudflare Dashboard > R2 > Manage R2 API Tokens
`);
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const STORAGE_BUCKET = 'cheatsheets';
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}`;
const THUMBNAILS_DIR = path.resolve('public/cheatsheets/cheatsheet-thumbnails');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function uploadToSupabase(storagePath, buffer, contentType) {
  const { error } = await sb.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Upload ${storagePath}: ${error.message}`);
}

async function downloadFromR2(r2Key) {
  const Key = R2_PDF_PREFIX + r2Key;
  const cmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key });
  const res = await r2.send(cmd);
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function migrateThumbnails(cheatsheets) {
  console.log('\n── Thumbnails (from local disk) ─────────────────');
  let ok = 0, skip = 0, fail = 0;
  for (const c of cheatsheets) {
    const localFile = path.join(THUMBNAILS_DIR, `${c.id}.jpg`);
    if (!fs.existsSync(localFile)) { skip++; continue; }
    try {
      const buf = fs.readFileSync(localFile);
      await uploadToSupabase(`thumbnails/${c.id}.jpg`, buf, 'image/jpeg');
      ok++;
      process.stdout.write(`\r  ${ok}/${cheatsheets.length} uploaded`);
    } catch (e) {
      console.error(`\n  FAIL ${c.id}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n  Done: ${ok} uploaded, ${skip} skipped (no local file), ${fail} failed`);
}

async function migratePdfs(cheatsheets) {
  console.log('\n── PDFs (from Cloudflare R2) ────────────────────');
  console.log(`  Bucket: ${R2_BUCKET_NAME}, prefix: "${R2_PDF_PREFIX}"`);
  let ok = 0, fail = 0;
  for (let i = 0; i < cheatsheets.length; i++) {
    const c = cheatsheets[i];
    if (!c.r2_key) { console.warn(`  skip (no r2_key): ${c.id}`); continue; }
    try {
      const buf = await downloadFromR2(c.r2_key);
      await uploadToSupabase(`pdfs/${c.id}.pdf`, buf, 'application/pdf');
      ok++;
      process.stdout.write(`\r  ${ok}/${cheatsheets.length} uploaded`);
    } catch (e) {
      if (fail === 0) console.error(`\n  First failure (${c.id}): ${e.message}`);
      fail++;
    }
  }
  console.log(`\n  Done: ${ok} uploaded, ${fail} failed`);
  return ok;
}

async function updateDbUrls(cheatsheets) {
  console.log('\n── Updating database ────────────────────────────');
  let ok = 0;
  for (const c of cheatsheets) {
    const { error } = await sb.from('cheatsheets').update({
      pdf_url: `${STORAGE_BASE}/pdfs/${c.id}.pdf`,
      thumbnail_url: `${STORAGE_BASE}/thumbnails/${c.id}.jpg`,
    }).eq('id', c.id);
    if (error) console.error(`  FAIL update ${c.id}: ${error.message}`);
    else ok++;
  }
  process.stdout.write(`\r  ${ok}/${cheatsheets.length} rows updated\n`);
}

console.log('Fetching cheatsheet list from Supabase…');
const { data: cheatsheets, error } = await sb.from('cheatsheets').select('id, r2_key');
if (error) { console.error(error.message); process.exit(1); }
console.log(`Found ${cheatsheets.length} cheatsheets`);

const start = Date.now();
await migrateThumbnails(cheatsheets);
const pdfCount = await migratePdfs(cheatsheets);
if (pdfCount > 0 || true) await updateDbUrls(cheatsheets);
console.log(`\nAll done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
