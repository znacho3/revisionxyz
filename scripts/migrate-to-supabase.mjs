/**
 * Migrates all local JSON data to Supabase.
 * Run once: node scripts/migrate-to-supabase.mjs
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://pyhqqcgkpnyeiddycjfo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment. Set it in .env or export it before running.');
  process.exit(1);
}
const BASE = path.resolve('public');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function upsertBatch(table, rows, chunkSize = 500, ignoreDuplicates = false) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await sb.from(table).upsert(chunk, { onConflict: 'id', ignoreDuplicates });
    if (error) throw new Error(`${table} chunk ${i}: ${error.message}`);
    process.stdout.write(`\r  ${table}: ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
  }
  console.log();
}

function walkFiles(dir, ext = '.json') {
  const results = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) results.push(...walkFiles(full, ext));
    else if (item.endsWith(ext)) results.push(full);
  }
  return results;
}

// ── 1. Subjects ───────────────────────────────────────────────────────────────
async function migrateSubjects() {
  console.log('Migrating subjects...');
  const rows = [];
  for (const file of fs.readdirSync(path.join(BASE, 'subjects')).filter(f => f.endsWith('.json'))) {
    const raw = JSON.parse(fs.readFileSync(path.join(BASE, 'subjects', file), 'utf8'));
    const subj = raw?.result?.data?.json?.[0];
    if (!subj) continue;
    rows.push({
      id: subj.id,
      slug: subj.slug,
      title: subj.title,
      group_name: subj.groupName ?? null,
      cover_image_url: subj.coverImageUrl ?? null,
      exam_board_id: subj.examBoardId ?? null,
      enable_questions: subj.enableQuestions ?? true,
      enable_notes: subj.enableNotes ?? true,
      enable_flashcards: subj.enableFlashcards ?? true,
      enable_videos: subj.enableVideos ?? true,
      data: subj,
    });
  }
  await upsertBatch('subjects', rows);
  console.log(`  Done: ${rows.length} subjects`);
}

// ── 2. Cheatsheets ────────────────────────────────────────────────────────────
async function migrateCheatsheets() {
  console.log('Migrating cheatsheets...');
  const raw = JSON.parse(fs.readFileSync(path.join(BASE, 'cheatsheet_info.json'), 'utf8'));
  const rows = raw.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description ?? null,
    r2_key: c.r2Key ?? null,
    file_size: c.fileSize ?? null,
    created_at: c.createdAt ?? null,
    is_premium: c.isPremium ?? false,
    subject_slug: c.subjectSlug ?? null,
    subject_title: c.subjectTitle ?? null,
    subject_id: c.subjectId ?? null,
    topic_title: c.topicTitle ?? null,
    topic_id: c.topicId ?? null,
    parent_topic_id: c.parentTopicId ?? null,
    parent_topic_title: c.parentTopicTitle ?? null,
    thumbnail_url: c.thumbnailUrl ?? null,
  }));
  await upsertBatch('cheatsheets', rows);
  console.log(`  Done: ${rows.length} cheatsheets`);
}

// ── 3. Flashcard decks + cards ────────────────────────────────────────────────
async function migrateFlashcards() {
  console.log('Migrating flashcard decks...');
  const deckRows = [];
  const cardRows = [];
  for (const file of fs.readdirSync(path.join(BASE, 'flashcards')).filter(f => f.endsWith('.json'))) {
    const subjectSlug = file.replace('.json', '');
    const decks = JSON.parse(fs.readFileSync(path.join(BASE, 'flashcards', file), 'utf8'));
    for (const deck of decks) {
      deckRows.push({
        id: deck.id,
        subject_slug: subjectSlug,
        topic_id: deck.topicId ?? null,
        title: deck.title ?? '',
        created_at: deck.createdAt ?? null,
      });
      for (const card of deck.flashcards ?? []) {
        cardRows.push({
          id: card.id,
          deck_id: deck.id,
          front: card.front ?? '',
          back: card.back ?? '',
          card_type: card.cardType ?? 'basic',
          created_at: card.createdAt ?? null,
        });
      }
    }
  }
  await upsertBatch('flashcard_decks', deckRows);
  console.log(`  Done: ${deckRows.length} decks`);
  console.log('Migrating flashcards (cards)...');
  await upsertBatch('flashcards', cardRows, 500);
  console.log(`  Done: ${cardRows.length} cards`);
}

// ── 4. Notes ──────────────────────────────────────────────────────────────────
async function migrateNotes() {
  console.log('Migrating notes...');
  const rows = [];
  const notesDir = path.join(BASE, 'notes');

  function walkNotes(dir, subjectSlug, relParts) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (item === 'notes.json') {
        const note = JSON.parse(fs.readFileSync(full, 'utf8'));
        const info = note.info ?? {};
        const topicSlug = relParts[relParts.length - 1];
        const id = `${subjectSlug}/${relParts.join('/')}`;
        rows.push({
          id,
          subject_slug: subjectSlug,
          subject_id: info.subjectid ?? null,
          topic_slug: topicSlug,
          topic_id: info.topicid ?? null,
          topic_title: info.topictitle ?? null,
          parent_slug: info.parentslug ?? null,
          parent_id: info.parentid ?? null,
          parent_title: info.parenttitle ?? null,
          markdown: note.markdown ?? '',
          prev_topic: note.prevtopic ?? null,
          next_topic: note.nexttopic ?? null,
        });
      } else if (fs.statSync(full).isDirectory()) {
        walkNotes(full, subjectSlug, [...relParts, item]);
      }
    }
  }

  for (const subjectSlug of fs.readdirSync(notesDir)) {
    const subjectDir = path.join(notesDir, subjectSlug);
    if (!fs.statSync(subjectDir).isDirectory()) continue;
    walkNotes(subjectDir, subjectSlug, []);
  }

  await upsertBatch('notes', rows, 200);
  console.log(`  Done: ${rows.length} notes`);
}

// ── 5. Questions ──────────────────────────────────────────────────────────────
async function migrateQuestions() {
  console.log('Migrating questions...');
  const rows = [];
  const qbDir = path.join(BASE, 'questionbank');
  for (const subjectSlug of fs.readdirSync(qbDir)) {
    const subjectDir = path.join(qbDir, subjectSlug);
    if (!fs.statSync(subjectDir).isDirectory()) continue;
    for (const topicSlug of fs.readdirSync(subjectDir)) {
      const topicDir = path.join(subjectDir, topicSlug);
      if (!fs.statSync(topicDir).isDirectory()) continue;
      for (const subtopicSlug of fs.readdirSync(topicDir)) {
        const qbFile = path.join(topicDir, subtopicSlug, 'questionbank.json');
        if (!fs.existsSync(qbFile)) continue;
        const raw = JSON.parse(fs.readFileSync(qbFile, 'utf8'));
        const questions = raw?.json?.questions ?? [];
        for (const q of questions) {
          rows.push({
            id: q.id,
            subject_id: q.subjectId,
            subject_slug: subjectSlug,
            topic_slug: subtopicSlug,
            question_type: q.questionType ?? null,
            level: q.level ?? null,
            paper: q.paper ?? null,
            question_set: q.questionSet ?? null,
            difficulty: q.difficulty ?? null,
            data: q,
          });
        }
      }
    }
  }
  await upsertBatch('questions', rows, 300, true);
  console.log(`  Done: ${rows.length} questions`);
}

// ── 6. Predicted papers ───────────────────────────────────────────────────────
async function migratePredictedPapers() {
  console.log('Migrating predicted papers...');
  const raw = JSON.parse(fs.readFileSync(path.join(BASE, 'predictedpapers_info.json'), 'utf8'));
  const rows = raw.map(p => ({
    id: p._id,
    subject_slug: p.subjectSlug ?? null,
    level: p.level ?? null,
    paper_type: p.paperType ?? null,
    exam_year: p.examYear ?? null,
    premium: p.premium ?? false,
    data: p,
  }));
  await upsertBatch('predicted_papers', rows);
  console.log(`  Done: ${rows.length} predicted papers`);
}

// ── Run all ───────────────────────────────────────────────────────────────────
const start = Date.now();
try {
  await migrateNotes();
  await migrateQuestions();
  await migratePredictedPapers();
  console.log(`\nAll done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
} catch (err) {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
}
