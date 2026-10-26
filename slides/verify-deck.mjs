// Reads slides/break-the-login.pptx back and checks links, notes and content rules.
// Usage: node verify-deck.mjs [--live]   (--live also requests every demo URL)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { DEMO_LINKS, SLIDES } from './deck-content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.DEMO_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const live = process.argv.includes('--live');
const zip = await JSZip.loadAsync(readFileSync(join(here, 'break-the-login.pptx')));
const read = async (name) => (zip.file(name) ? zip.file(name).async('string') : null);
const textOf = (xml) => [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((match) => match[1]).join(' ');

const failures = [];
const fail = (message) => failures.push(message);
const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
if (slideFiles.length !== SLIDES.length) fail(`expected ${SLIDES.length} slides, found ${slideFiles.length}`);

const linkReport = [];
for (const spec of SLIDES) {
  const xml = await read(`ppt/slides/slide${spec.n}.xml`);
  const rels = (await read(`ppt/slides/_rels/slide${spec.n}.xml.rels`)) || '';
  if (!xml) { fail(`slide ${spec.n}: missing`); continue; }

  const urls = [...new Set([...rels.matchAll(/Target="([^"]+)"[^>]*TargetMode="External"/g)].map((match) => match[1].replace(/&amp;/g, '&')))];
  const expected = spec.demo ? [`${BASE_URL}${DEMO_LINKS[spec.demo].route}`] : [];
  if (urls.join() !== expected.join()) fail(`slide ${spec.n}: links ${JSON.stringify(urls)} ≠ expected ${JSON.stringify(expected)}`);
  if (spec.demo && !textOf(xml).includes(DEMO_LINKS[spec.demo].label)) fail(`slide ${spec.n}: button label "${DEMO_LINKS[spec.demo].label}" not found`);
  if (urls.length) linkReport.push({ slide: spec.n, url: urls[0] });

  for (const paragraph of xml.match(/<a:p>[\s\S]*?<\/a:p>/g) || []) {
    if ((paragraph.match(/<a:pPr\b/g) || []).length > 1) { fail(`slide ${spec.n}: paragraph with several <a:pPr>`); break; }
  }

  const noteRel = rels.match(/Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/);
  const notes = noteRel ? textOf(await read(`ppt/notesSlides/${noteRel[1]}`)) : '';
  if (notes.trim().length < 80) fail(`slide ${spec.n}: speaker notes missing or too short`);

  const all = `${textOf(xml)} ${notes}`;
  if (/basic\s+auth/i.test(all)) fail(`slide ${spec.n}: mentions Basic Authentication`);
  if (/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(all)) fail(`slide ${spec.n}: contains something that looks like a full JWT`);
  if (/(secret|password)\s*[:=]\s*['"]?[A-Za-z0-9!@#$%^&*_-]{12,}/i.test(all)) fail(`slide ${spec.n}: contains something that looks like a secret value`);
}

if (live) {
  for (const { slide, url } of linkReport) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status !== 200) fail(`slide ${slide}: GET ${url} → ${response.status}`);
      else console.log(`  200  slide ${String(slide).padStart(2)}  ${url}`);
    } catch (error) {
      fail(`slide ${slide}: GET ${url} failed (${error.cause?.code || error.message})`);
    }
  }
}

console.log(`Slides: ${slideFiles.length}, demo links: ${linkReport.length}`);
for (const { slide, url } of linkReport) console.log(`  slide ${String(slide).padStart(2)} → ${url}`);
if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('OK: links, notes and content rules verified.');
