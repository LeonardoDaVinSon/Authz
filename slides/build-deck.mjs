import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import PptxGenJS from 'pptxgenjs';
import { DECK, DEMO_LINKS, PARTS, RECAP, SLIDES } from './deck-content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const BASE_URL = (process.env.DEMO_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const OUT_PPTX = join(here, process.env.OUT_PPTX || 'break-the-login.pptx');
const OUT_MD = join(root, 'docs', '02-slide-content.md');

// ---------------------------------------------------------------------------
// Guard: every demo button must point at a route the lab frontend serves.
const routesSource = readFileSync(join(root, 'devhub-auth-lab', 'frontend', 'src', 'routes.ts'), 'utf8');
const knownRoutes = new Set([...routesSource.matchAll(/'(\/demo[^']*)'/g)].map((match) => match[1]));
for (const [key, link] of Object.entries(DEMO_LINKS)) {
  if (!knownRoutes.has(link.route)) throw new Error(`Demo link "${key}" points to ${link.route}, which is not in frontend/src/routes.ts`);
}
const partNumbers = SLIDES.filter((slide) => slide.part).map((slide) => slide.part);
if (partNumbers.join() !== PARTS.map((_, index) => index + 1).join()) throw new Error(`Expected one intro slide per part in order, found parts ${partNumbers.join(', ')}`);

// ---------------------------------------------------------------------------
const C = {
  bg: '0B1020', panel: '131B2E', panel2: '182238', line: '2A3651', text: 'E8ECF5', muted: '8F9BB3',
  purple: 'B5A5FF', purpleDeep: '6B63DC', green: '6EE7B7', greenDeep: '1E4D40', orange: 'F5A65B', orangeDeep: '4A3420',
  red: 'F28B9A', redDeep: '4D2530', blue: '7DB3FF', blueDeep: '1D3557', ink: '111329',
};
const FONT = 'Segoe UI';
const MONO = 'Consolas';
const W = 13.333;

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = DECK.title;
pptx.subject = DECK.subtitle;
pptx.company = 'DevHub';
pptx.author = 'DevHub Fullstack Technical Sharing';

// ---------------------------------------------------------------------------
// Primitives

/** Split `code` spans into monospace runs. */
function runs(value, base = {}) {
  const { codeColor, ...plain } = base;
  return String(value).split(/`([^`]+)`/)
    .map((part, index) => ({ text: part, options: index % 2 === 1 ? { ...plain, fontFace: MONO, color: codeColor || C.purple } : { ...plain } }))
    .filter((run) => run.text !== '');
}

/**
 * pptxgenjs emits an <a:pPr> for every run that carries paragraph options (and
 * copies `align` etc. from the shape onto every run), so a paragraph with several
 * runs gets conflicting properties. Split on "\n" here and put paragraph options
 * only on the first run of each paragraph; never pass them at shape level.
 */
const PARA_KEYS = ['align', 'bullet', 'paraSpaceAfter', 'paraSpaceBefore', 'lineSpacingMultiple', 'indentLevel'];

function paragraphs(value, para, codeColor) {
  const list = typeof value === 'string' ? runs(value, { codeColor }) : value;
  const tokens = [];
  for (const run of list) {
    const segments = String(run.text).split('\n');
    segments.forEach((segment, index) => {
      if (index > 0 && tokens.length) tokens[tokens.length - 1].options.breakLine = true;
      if (segment !== '' || index === segments.length - 1 && segments.length === 1) tokens.push({ text: segment, options: { ...run.options, breakLine: false } });
    });
  }
  tokens.forEach((token, index) => {
    for (const key of PARA_KEYS) delete token.options[key];
    if (index === 0 || tokens[index - 1].options.breakLine) Object.assign(token.options, para);
  });
  return tokens;
}

function text(slide, value, x, y, w, h, opts = {}) {
  const { mono, size = 12, color = C.text, bold, align = 'left', valign = 'middle', italic, codeColor, ...rest } = opts;
  slide.addText(paragraphs(value, { align }, codeColor), {
    x, y, w, h, margin: 2, fontFace: mono ? MONO : FONT, fontSize: size, color, bold, italic, valign, ...rest,
  });
}

function box(slide, value, x, y, w, h, opts = {}) {
  const { fill = C.panel2, line = C.line, dash, size = 12, color = C.text, bold = false, mono = false, align = 'center', radius = 0.08, lineWidth = 1, margin = 6 } = opts;
  slide.addText(paragraphs(value, { align }, opts.codeColor), {
    x, y, w, h, shape: pptx.ShapeType.roundRect, rectRadius: radius,
    fill: { color: fill }, line: { color: line, width: lineWidth, dashType: dash ? 'dash' : 'solid' },
    fontFace: mono ? MONO : FONT, fontSize: size, color, bold, valign: 'middle', margin,
  });
}

function arrow(slide, x1, y1, x2, y2, opts = {}) {
  const { color = C.muted, dash = false, width = 1.5, head = 'triangle', tail } = opts;
  slide.addShape(pptx.ShapeType.line, {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1,
    line: { color, width, dashType: dash ? 'dash' : 'solid', endArrowType: head, beginArrowType: tail },
  });
}

function bullets(slide, items, x, y, w, h, size = 18) {
  // The bullet glyph takes the first run's font, so lead with a zero-width run in the body font.
  const lead = { text: '\u200B', options: { fontFace: FONT, align: 'left', bullet: { code: '25B8', indent: 22 }, paraSpaceAfter: 12 } };
  const list = items.flatMap((item) => [lead, ...paragraphs(item, {}, C.purple)]
    .map((token, index, all) => ({ ...token, options: { ...token.options, breakLine: index === all.length - 1 } })));
  list[list.length - 1].options.breakLine = false;
  slide.addText(list, { x, y, w, h, fontFace: FONT, fontSize: size, color: C.text, valign: 'top', margin: 2 });
}

function table(slide, header, rows, x, y, w, colW, opts = {}) {
  const { size = 11, rowH = 0.42, highlightFirstCol = true } = opts;
  const head = header.map((cell) => ({ text: cell, options: { bold: true, color: C.purple, fill: { color: C.panel2 }, fontFace: FONT } }));
  const body = rows.map((row) => row.map((cell, index) => ({
    text: runs(cell, { codeColor: C.green }),
    options: { color: index === 0 && highlightFirstCol ? C.text : C.muted, bold: index === 0 && highlightFirstCol, fill: { color: C.panel }, fontFace: FONT },
  })));
  slide.addTable([head, ...body], {
    x, y, w, colW, rowH, fontSize: size, fontFace: FONT, color: C.text, valign: 'middle', margin: 0.07,
    border: { type: 'solid', pt: 0.75, color: C.line },
  });
}

/** Sequence diagram: actors as columns, messages top-to-bottom. */
function sequence(slide, region, actors, messages, opts = {}) {
  const { size = 10.5 } = opts;
  const colW = region.w / actors.length;
  const cx = (index) => region.x + colW * (index + 0.5);
  const actorH = 0.46;
  actors.forEach((actor, index) => {
    box(slide, actor, region.x + colW * index + 0.06, region.y, colW - 0.12, actorH, { size: 11, bold: true, fill: C.panel2, line: C.line });
    slide.addShape(pptx.ShapeType.line, { x: cx(index), y: region.y + actorH, w: 0, h: region.h - actorH, line: { color: C.line, width: 1, dashType: 'dash' } });
  });
  const top = region.y + actorH + 0.12;
  const step = (region.h - actorH - 0.12) / messages.length;
  messages.forEach((message, index) => {
    const y = top + step * (index + 0.62);
    const label = `${index + 1}. ${message.text}`;
    const color = message.color || (message.reply ? C.green : C.purple);
    if (message.self) {
      const w = Math.min(colW * (message.wide ? 1.55 : 1) - 0.2, region.w);
      const left = Math.max(region.x, Math.min(cx(message.from) - w / 2, region.x + region.w - w));
      box(slide, label, left, y - 0.17, w, 0.34, { size: size - 1, fill: C.panel, line: color, dash: true, color: C.text, margin: 3 });
      return;
    }
    const x1 = cx(message.from), x2 = cx(message.to);
    arrow(slide, x1, y, x2, y, { color, dash: message.reply });
    text(slide, label, Math.min(x1, x2) + 0.05, y - 0.31, Math.abs(x2 - x1) - 0.1, 0.28, { size, align: 'center', color: C.text, valign: 'bottom', codeColor: C.green });
  });
}

// ---------------------------------------------------------------------------
// Diagrams. Each receives the slide and a region {x, y, w, h}.

const FULL_WIDTH = new Set(['agenda', 'hashVsEncrypt', 'claimsTable', 'compareTable', 'pkceFlow', 'samlFlow', 'checklist']);
const TOTAL = SLIDES.length;

const DIAGRAMS = {
  agenda(slide) {
    PARTS.forEach(({ no: number, title, detail, color: colorKey }, index) => {
      const color = C[colorKey];
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 0.6 + col * 4.1;
      const y = 1.7 + row * 2.35;
      slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.9, h: 2.1, rectRadius: 0.1, fill: { color: C.panel }, line: { color: C.line, width: 1 } });
      slide.addShape(pptx.ShapeType.rect, { x, y, w: 3.9, h: 0.08, fill: { color }, line: { color, width: 0 } });
      text(slide, number, x + 0.25, y + 0.25, 3.4, 0.35, { size: 12, color, bold: true, mono: true });
      text(slide, title, x + 0.25, y + 0.7, 3.4, 0.5, { size: 20, bold: true, color: C.text });
      text(slide, detail, x + 0.25, y + 1.3, 3.4, 0.5, { size: 13, color: C.muted });
    });
  },

  authnAuthz(slide, r) {
    const widths = [2.0, 2.0, 1.55];
    const gap = (r.w - widths.reduce((sum, w) => sum + w, 0)) / 2;
    const xs = [r.x, r.x + widths[0] + gap, r.x + widths[0] + widths[1] + gap * 2];
    const by = r.y + 1.35, bh = 0.95, midY = by + bh / 2;

    box(slide, 'AuthN', xs[0], by, widths[0], bh, { size: 18, bold: true, line: C.purple, color: C.purple, lineWidth: 1.5 });
    box(slide, 'AuthZ', xs[1], by, widths[1], bh, { size: 18, bold: true, line: C.blue, color: C.blue, lineWidth: 1.5 });
    box(slide, 'Handler', xs[2], by, widths[2], bh, { size: 15, bold: true, line: C.green, color: C.green });
    arrow(slide, xs[0] + widths[0], midY, xs[1], midY, { color: C.purple, width: 2 });
    arrow(slide, xs[1] + widths[1], midY, xs[2], midY, { color: C.blue, width: 2 });

    const chipW = 2.7, chipX = xs[0] + widths[0] + gap / 2 - chipW / 2;
    box(slide, 'principal\n{ id: 42, role: member }', chipX, r.y + 0.15, chipW, 0.8, { size: 11, mono: true, line: C.purple, dash: true, fill: C.panel });
    slide.addShape(pptx.ShapeType.line, { x: chipX + chipW / 2, y: r.y + 0.95, w: 0, h: midY - r.y - 0.95, line: { color: C.purple, width: 1, dashType: 'dash' } });

    const captions = [
      'Ai đang gọi?\ncookie · Bearer → principal',
      'Được gọi endpoint này?\nprincipal + policy → allow/deny',
      'Business logic',
    ];
    captions.forEach((caption, index) => text(slide, caption, xs[index] - 0.3, by + bh + 0.12, widths[index] + 0.6, 0.75, { size: 11.5, color: C.muted, align: 'center', valign: 'top' }));

    const ey = r.y + 3.4;
    slide.addShape(pptx.ShapeType.roundRect, { x: r.x, y: ey, w: r.w, h: 0.95, rectRadius: 0.08, fill: { color: C.panel }, line: { color: C.line, width: 1 } });
    text(slide, 'VÍ DỤ', r.x + 0.2, ey + 0.08, 2, 0.25, { size: 9, bold: true, color: C.muted });
    text(slide, '`member` → `GET /api/admin`', r.x + 0.2, ey + 0.35, 2.9, 0.45, { size: 13, codeColor: C.text });
    box(slide, 'AuthN ✓', r.x + 3.25, ey + 0.2, 1.6, 0.55, { size: 14, bold: true, fill: C.greenDeep, line: C.green, color: C.green });
    box(slide, 'AuthZ ✗', r.x + 5.05, ey + 0.2, 1.6, 0.55, { size: 14, bold: true, fill: C.redDeep, line: C.red, color: C.red });
  },

  decision401403(slide, r) {
    const cx = r.x + 2.3, dw = 2.6, dh = 1.05;
    box(slide, 'GET /api/admin', cx - 1.2, r.y, 2.4, 0.5, { size: 12, mono: true, bold: true });
    slide.addText('Credential\nhợp lệ?', { x: cx - dw / 2, y: r.y + 0.85, w: dw, h: dh, shape: pptx.ShapeType.diamond, fill: { color: C.panel2 }, line: { color: C.purple, width: 1.25 }, fontFace: FONT, fontSize: 12, color: C.text, align: 'center', valign: 'middle', bold: true });
    slide.addText('Role đủ\nquyền?', { x: cx - dw / 2, y: r.y + 2.35, w: dw, h: dh, shape: pptx.ShapeType.diamond, fill: { color: C.panel2 }, line: { color: C.blue, width: 1.25 }, fontFace: FONT, fontSize: 12, color: C.text, align: 'center', valign: 'middle', bold: true });
    box(slide, '200 OK', cx - 0.85, r.y + 3.9, 1.7, 0.6, { size: 16, bold: true, fill: C.greenDeep, line: C.green, color: C.green });
    const outX = r.x + 4.6;
    box(slide, '401 Unauthorized\n+ WWW-Authenticate', outX, r.y + 1.05, 2.3, 0.65, { size: 11, bold: true, fill: C.orangeDeep, line: C.orange, color: C.orange });
    box(slide, '403 Forbidden', outX, r.y + 2.55, 2.3, 0.65, { size: 13, bold: true, fill: C.redDeep, line: C.red, color: C.red });
    arrow(slide, cx, r.y + 0.5, cx, r.y + 0.85);
    arrow(slide, cx, r.y + 0.85 + dh, cx, r.y + 2.35, { color: C.green });
    arrow(slide, cx, r.y + 2.35 + dh, cx, r.y + 3.9, { color: C.green });
    arrow(slide, cx + dw / 2, r.y + 0.85 + dh / 2, outX, r.y + 0.85 + dh / 2, { color: C.orange });
    arrow(slide, cx + dw / 2, r.y + 2.35 + dh / 2, outX, r.y + 2.35 + dh / 2, { color: C.red });
    text(slide, 'không', cx + dw / 2, r.y + 0.98, 1.0, 0.35, { size: 12, bold: true, color: C.orange, align: 'center' });
    text(slide, 'không', cx + dw / 2, r.y + 2.48, 1.0, 0.35, { size: 12, bold: true, color: C.red, align: 'center' });
    text(slide, 'có', cx + 0.1, r.y + 1.95, 0.6, 0.35, { size: 12, bold: true, color: C.green });
    text(slide, 'có', cx + 0.1, r.y + 3.45, 0.6, 0.35, { size: 12, bold: true, color: C.green });
  },

  hashVsEncrypt(slide) {
    const { header, rows, takeaway } = SLIDES.find((item) => item.diagram === 'hashVsEncrypt').compare;
    const x = 0.6, w = 12.1, colW = [3.9, 4.1, 4.1], rowH = 0.68, top = 1.6;
    const headColors = [C.muted, C.green, C.orange];
    header.forEach((cell, index) => {
      const cx = x + colW.slice(0, index).reduce((sum, v) => sum + v, 0);
      text(slide, cell, cx + 0.2, top, colW[index] - 0.4, rowH, { size: 20, bold: true, color: headColors[index] });
    });
    rows.forEach((row, rowIndex) => {
      const y = top + rowH * (rowIndex + 1);
      slide.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color: C.line, width: 1 } });
      row.forEach((cell, index) => {
        const cx = x + colW.slice(0, index).reduce((sum, v) => sum + v, 0);
        text(slide, cell, cx + 0.2, y, colW[index] - 0.4, rowH, { size: 18, bold: index === 0, color: index === 0 ? C.muted : C.text });
      });
    });
    const bottom = top + rowH * (rows.length + 1);
    slide.addShape(pptx.ShapeType.line, { x, y: bottom, w, h: 0, line: { color: C.line, width: 1 } });
    box(slide, takeaway, x, bottom + 0.35, w, 0.75, { size: 18, bold: true, align: 'left', line: C.green, fill: C.greenDeep, color: C.text, margin: 12 });
  },

  passwordHash(slide, r) {
    text(slide, 'LƯU (lúc đăng ký / đổi password)', r.x, r.y, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
    box(slide, 'password', r.x, r.y + 0.4, 1.5, 0.65, { size: 12, mono: true });
    box(slide, 'bcrypt\ncost + salt ngẫu nhiên', r.x + 2.1, r.y + 0.35, 2.2, 0.75, { size: 11, bold: true, line: C.purple });
    box(slide, 'DB lưu chuỗi hash', r.x + 4.9, r.y + 0.4, 1.95, 0.65, { size: 11.5, bold: true, line: C.green, color: C.green });
    arrow(slide, r.x + 1.5, r.y + 0.72, r.x + 2.1, r.y + 0.72, { color: C.purple });
    arrow(slide, r.x + 4.3, r.y + 0.72, r.x + 4.9, r.y + 0.72, { color: C.purple });

    const segments = [
      ['$2a$', 'thuật toán', 0.85, C.purple],
      ['10$', 'cost', 0.7, C.orange],
      ['g.Ku7scOETaTCAMBrp2kGu', 'salt (22 ký tự)', 2.65, C.green],
      ['OIBoCCOZiwBFSmHS…', 'hash (31 ký tự)', 2.65, C.blue],
    ];
    let sx = r.x;
    for (const [value, label, w, color] of segments) {
      box(slide, value, sx, r.y + 1.3, w, 0.45, { size: 11, mono: true, color, line: color, fill: C.panel, radius: 0.02, margin: 2 });
      text(slide, label, sx, r.y + 1.8, w, 0.3, { size: 10.5, color, align: 'center' });
      sx += w;
    }

    text(slide, 'VERIFY (lúc login)', r.x, r.y + 2.35, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
    box(slide, 'password nhập', r.x, r.y + 2.7, 1.5, 0.55, { size: 11, mono: true });
    box(slide, 'hash đã lưu', r.x, r.y + 3.35, 1.5, 0.55, { size: 11, mono: true, line: C.green });
    box(slide, 'bcrypt.compare\nđọc salt + cost từ hash', r.x + 2.1, r.y + 2.85, 2.2, 0.9, { size: 11, bold: true, line: C.purple });
    box(slide, 'match:\ntrue / false', r.x + 4.9, r.y + 2.95, 1.95, 0.7, { size: 12, mono: true });
    arrow(slide, r.x + 1.5, r.y + 2.97, r.x + 2.1, r.y + 3.1, { color: C.purple });
    arrow(slide, r.x + 1.5, r.y + 3.62, r.x + 2.1, r.y + 3.5, { color: C.green });
    arrow(slide, r.x + 4.3, r.y + 3.3, r.x + 4.9, r.y + 3.3, { color: C.purple });
    text(slide, 'Không có bước "giải mã" nào.', r.x, r.y + 4.05, r.w, 0.45, { size: 16, bold: true, color: C.orange, align: 'center' });
  },

  attackModes(slide, r) {
    const half = (r.w - 0.25) / 2;
    const cards = [
      {
        title: 'Offline — DB bị lộ', color: C.purple,
        rows: [
          ['ATTACKER CÓ', 'Bản dump DB, đoán trên máy riêng'],
          ['SALT', 'Rainbow table vô dụng'],
          ['HASH CHẬM', 'Mỗi lần đoán tốn kém'],
        ],
        verdict: 'Hash chậm: CÓ GIÚP', verdictColor: C.green, verdictFill: C.greenDeep,
      },
      {
        title: 'Online — credential stuffing', color: C.orange,
        rows: [
          ['ATTACKER CÓ', 'Email / password lộ từ site khác'],
          ['CÁCH LÀM', 'Thử login thẳng vào DevHub'],
          ['CẦN', 'Rate limit · MFA · chặn pass đã lộ'],
        ],
        verdict: 'Hash chậm: KHÔNG GIÚP', verdictColor: C.red, verdictFill: C.redDeep,
      },
    ];
    cards.forEach(({ title, color, rows, verdict, verdictColor, verdictFill }, index) => {
      const x = r.x + index * (half + 0.25);
      slide.addShape(pptx.ShapeType.roundRect, { x, y: r.y, w: half, h: r.h, rectRadius: 0.08, fill: { color: C.panel }, line: { color, width: 1.25 } });
      text(slide, title, x + 0.2, r.y + 0.15, half - 0.4, 0.45, { size: 15, bold: true, color });
      rows.forEach(([label, value], rowIndex) => {
        const y = r.y + 0.75 + rowIndex * 0.95;
        text(slide, label, x + 0.2, y, half - 0.4, 0.25, { size: 9.5, bold: true, color: C.muted });
        text(slide, value, x + 0.2, y + 0.25, half - 0.4, 0.6, { size: 13, valign: 'top' });
      });
      box(slide, verdict, x + 0.2, r.y + r.h - 0.8, half - 0.4, 0.6, { size: 13, bold: true, fill: verdictFill, line: verdictColor, color: verdictColor });
    });
  },

  sessionFlow(slide, r) {
    sequence(slide, r, ['Browser', 'DevHub API', 'Session Store'], [
      { from: 0, to: 1, text: 'POST /session/login' },
      { from: 1, self: true, text: 'verify password' },
      { from: 1, to: 2, text: 'regenerate + lưu session' },
      { from: 1, to: 0, text: 'Set-Cookie: devhub.sid=…', reply: true },
      { from: 0, to: 1, text: 'GET /api/me + Cookie' },
      { from: 1, to: 2, text: 'tra cứu session' },
      { from: 1, to: 0, text: '200 { user }', reply: true },
    ]);
  },

  cookieAnatomy(slide, r) {
    box(slide, [
      { text: 'Set-Cookie: ', options: { color: C.muted } },
      { text: 'devhub.sid=…; ', options: { color: C.text } },
      { text: 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900', options: { color: C.green } },
    ], r.x, r.y, r.w, 0.5, { size: 10.5, mono: true, align: 'left', fill: C.panel });
    text(slide, 'Mục tiêu production. Lab HTTP: Secure = false.', r.x, r.y + 0.52, r.w, 0.28, { size: 10, italic: true, color: C.muted });
    table(slide, ['Thuộc tính', 'Chống lại', 'Không chống được'], [
      ['`HttpOnly`', 'JavaScript đọc cookie', 'XSS gọi API thay user'],
      ['`Secure`', 'Lộ qua HTTP thường', 'Lộ ở log / máy user'],
      ['`SameSite=Lax`', 'Phần lớn request cross-site', 'Mọi kịch bản CSRF'],
      ['`Path` / `Domain`', 'Gửi cookie ra ngoài phạm vi', 'Cổng / app cùng host'],
      ['`Max-Age`', 'Session sống vô thời hạn', 'Revoke trước hạn'],
    ], r.x, r.y + 0.85, r.w, [1.75, 2.6, 2.6], { size: 11, rowH: 0.5 });
  },

  sessionLifecycle(slide, r) {
    const steps = [['Login', C.purple], ['Regenerate ID', C.blue], ['Use', C.green], ['Expire / Revoke', C.orange]];
    const sw = 1.55, gap = (r.w - sw * 4) / 3;
    steps.forEach(([label, color], index) => {
      const x = r.x + index * (sw + gap);
      box(slide, label, x, r.y, sw, 0.7, { size: 12, bold: true, line: color });
      if (index < 3) arrow(slide, x + sw, r.y + 0.35, x + sw + gap, r.y + 0.35, { color });
    });
    const half = (r.w - 0.25) / 2, y = r.y + 1.3;
    const column = (x, title, color, deep, lines) => {
      slide.addShape(pptx.ShapeType.roundRect, { x, y, w: half, h: 3.0, rectRadius: 0.08, fill: { color: C.panel }, line: { color, width: 1.25 } });
      text(slide, title, x + 0.2, y + 0.12, half - 0.4, 0.4, { size: 13, bold: true, color });
      box(slide, 'Cookie: đã hết hạn', x + 0.2, y + 0.65, half - 0.4, 0.5, { size: 11, fill: C.panel2, line: C.line, color: C.muted });
      box(slide, lines[0], x + 0.2, y + 1.3, half - 0.4, 0.55, { size: 11, fill: deep, line: color, color });
      text(slide, lines[1], x + 0.2, y + 1.95, half - 0.4, 0.95, { size: 11, color: C.text, valign: 'top' });
    };
    column(r.x, 'Chỉ xoá cookie', C.red, C.redDeep, ['Session store: CÒN SỐNG', 'Bản sao session ID vẫn dùng được.']);
    column(r.x + half + 0.25, 'Huỷ session phía server', C.green, C.greenDeep, ['Session store: ĐÃ XOÁ', 'Mọi bản sao ID đều vô giá trị → 401.']);
  },

  csrfXss(slide, r) {
    const half = (r.w - 0.3) / 2;
    const panel = (x, title, color, nodes, edges, defence) => {
      slide.addShape(pptx.ShapeType.roundRect, { x, y: r.y, w: half, h: r.h, rectRadius: 0.08, fill: { color: C.panel }, line: { color, width: 1.25 } });
      text(slide, title, x + 0.2, r.y + 0.1, half - 0.4, 0.45, { size: 15, bold: true, color });
      nodes.forEach((node, index) => {
        box(slide, node, x + 0.3, r.y + 0.7 + index * 1.05, half - 0.6, 0.55, { size: 11, bold: index === nodes.length - 1 });
        if (index < nodes.length - 1) {
          arrow(slide, x + half / 2, r.y + 1.25 + index * 1.05, x + half / 2, r.y + 1.75 + index * 1.05, { color });
          text(slide, edges[index], x + half / 2 + 0.08, r.y + 1.3 + index * 1.05, half / 2 - 0.2, 0.4, { size: 9.5, color: C.muted });
        }
      });
      text(slide, defence, x + 0.2, r.y + r.h - 1.05, half - 0.4, 0.95, { size: 10, color: C.text, valign: 'top' });
    };
    panel(r.x, 'CSRF', C.orange, ['evil.example', 'Browser (đã login)', 'DevHub API'],
      ['form POST', 'cookie tự gửi'], 'Attacker không thấy cookie.\nPhòng vệ: SameSite, CSRF token, Origin.');
    panel(r.x + half + 0.3, 'XSS', C.red, ['Script trong origin', 'fetch /api như user', 'DevHub API'],
      ['quyền của trang', 'cookie vẫn gửi'], 'HttpOnly chỉ chặn đọc cookie.\nPhòng vệ: encoding, CSP, sanitize.');
  },

  jwtParts(slide, r) {
    const parts = [
      ['HEADER', 'eyJhbGciOi…', '{ "alg": "HS256",\n  "typ": "JWT" }', C.purple],
      ['PAYLOAD', 'eyJzdWIiOi…', '{ "sub": "user-123",\n  "role": "member",\n  "exp": 1792209470 }', C.green],
      ['SIGNATURE', 'xq_x9oky…', 'HMAC-SHA256(\n  header.payload,\n  secret)', C.orange],
    ];
    const pw = (r.w - 0.3) / 3;
    parts.forEach(([label, encoded, decoded, color], index) => {
      const x = r.x + index * (pw + 0.15);
      text(slide, label, x, r.y, pw, 0.3, { size: 10.5, bold: true, color, align: 'center' });
      box(slide, encoded, x, r.y + 0.35, pw, 0.55, { size: 12, mono: true, color, line: color });
      box(slide, decoded, x, r.y + 1.05, pw, 1.25, { size: 10, mono: true, align: 'left', fill: C.panel });
      if (index < 2) text(slide, '.', x + pw - 0.02, r.y + 0.35, 0.19, 0.55, { size: 22, bold: true, color: C.text, align: 'center' });
    });
    text(slide, 'Base64URL — ai cũng decode được', r.x, r.y + 2.35, (pw * 2) + 0.15, 0.3, { size: 10, color: C.muted, align: 'center', italic: true });
    text(slide, 'cần secret/key để kiểm tra', r.x + 2 * (pw + 0.15), r.y + 2.35, pw, 0.3, { size: 10, color: C.muted, align: 'center', italic: true });

    text(slide, 'TOKEN-BASED FLOW', r.x, r.y + 2.9, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
    const steps = ['Login', 'Server ký JWT', 'Client tự lưu', 'Gửi header\nBearer token', 'API verify\nmỗi request'];
    const sw = 1.2, gap = (r.w - sw * steps.length) / (steps.length - 1);
    steps.forEach((label, index) => {
      const x = r.x + index * (sw + gap);
      box(slide, label, x, r.y + 3.3, sw, 0.8, { size: 10, bold: index === 4, line: index === 4 ? C.green : C.line });
      if (index < steps.length - 1) arrow(slide, x + sw, r.y + 3.7, x + sw + gap, r.y + 3.7, { color: C.purple });
    });
  },

  claimsTable(slide) {
    const takeaway = SLIDES.find((item) => item.diagram === 'claimsTable').takeaway;
    table(slide, ['Claim / header', 'Server kiểm tra'], [
      ['`sub`', 'User tồn tại, còn hoạt động'],
      ['`iss`', 'Đúng issuer mong đợi'],
      ['`aud`', 'Token dành cho chính API này'],
      ['`exp`', 'Chưa hết hạn (bắt buộc)'],
      ['`nbf` / `iat`', 'Đã có hiệu lực, phát hành hợp lý'],
      ['`jti`', 'ID để thu hồi / chống replay'],
      ['`alg` (header)', 'Nằm trong allowlist'],
    ], 0.6, 1.55, 12.1, [3.2, 8.9], { size: 16, rowH: 0.58 });
    box(slide, takeaway, 0.6, 6.2, 12.1, 0.7, { size: 16, bold: true, align: 'left', line: C.orange, fill: C.orangeDeep, color: C.text, margin: 12 });
  },

  jwtTamper(slide, r) {
    const row = (y, label, steps, resultText, resultColor, resultDeep) => {
      text(slide, label, r.x, y, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
      const sw = 1.75, gap = 0.3;
      steps.forEach((step, index) => {
        const x = r.x + index * (sw + gap);
        box(slide, step, x, y + 0.35, sw, 0.72, { size: 10, mono: index === 0 });
        arrow(slide, x + sw, y + 0.71, x + sw + gap, y + 0.71, { color: resultColor });
      });
      box(slide, resultText, r.x + steps.length * (sw + gap), y + 0.35, r.w - steps.length * (sw + gap), 0.72, { size: 16, bold: true, fill: resultDeep, line: resultColor, color: resultColor });
    };
    row(r.y, 'SỬA PAYLOAD', ['role: "member"\n→ "admin"', 'chữ ký cũ giữ nguyên', 'HMAC(header.payload′)\n≠ signature'], '401', C.orange, C.orangeDeep);
    row(r.y + 1.45, 'ALG: NONE', ['"alg": "none"\nbỏ signature', 'alg không nằm\ntrong allowlist', 'jwt.verify từ chối'], '401', C.orange, C.orangeDeep);
    row(r.y + 2.9, 'TOKEN MEMBER HỢP LỆ → /api/admin', ['chữ ký đúng\niss / aud / exp ok', 'principal\nrole = member', 'policy: chỉ admin'], '403', C.red, C.redDeep);
  },

  refreshRotation(slide, r) {
    const half = (r.w - 0.2) / 2;
    box(slide, [
      { text: 'Access token · JWT\n', options: { bold: true, color: C.purple, fontSize: 12 } },
      { text: 'ngắn hạn · gửi tới API\nAuthorization: Bearer', options: { color: C.text, fontSize: 10.5 } },
    ], r.x, r.y, half, 0.95);
    box(slide, [
      { text: 'Refresh token · opaque\n', options: { bold: true, color: C.green, fontSize: 12 } },
      { text: 'chỉ /tokens/refresh · server lưu hash', options: { color: C.text, fontSize: 10.5 } },
    ], r.x + half + 0.2, r.y, half, 0.95, { line: C.green });

    text(slide, 'ROTATION — MỖI LẦN REFRESH CẤP TOKEN MỚI', r.x, r.y + 1.25, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
    const tw = 1.7, gap = (r.w - tw * 3) / 2, ty = r.y + 1.65;
    [['RT1', 'rotated'], ['RT2', 'rotated'], ['RT3', 'active']].forEach(([name, status], index) => {
      const x = r.x + index * (tw + gap);
      box(slide, `${name}\n${status}`, x, ty, tw, 0.75, { size: 11, mono: true, line: status === 'active' ? C.green : C.line, color: status === 'active' ? C.green : C.muted });
      if (index < 2) { arrow(slide, x + tw, ty + 0.37, x + tw + gap, ty + 0.37, { color: C.green }); text(slide, 'refresh', x + tw, ty + 0.02, gap, 0.3, { size: 9.5, color: C.muted, align: 'center' }); }
    });

    text(slide, 'REUSE DETECTION', r.x, r.y + 2.75, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
    box(slide, 'Ai đó dùng lại RT1\n(đã rotate)', r.x, r.y + 3.15, 2.1, 0.85, { size: 11, line: C.red });
    arrow(slide, r.x + 2.1, r.y + 3.57, r.x + 2.7, r.y + 3.57, { color: C.red });
    box(slide, '401 + thu hồi cả family\n(RT1, RT2, RT3)', r.x + 2.7, r.y + 3.15, 2.6, 0.85, { size: 11.5, bold: true, fill: C.redDeep, line: C.red, color: C.red });
    text(slide, 'Không phân biệt attacker → huỷ family, login lại.', r.x + 5.4, r.y + 3.1, r.w - 5.4, 0.95, { size: 11, color: C.muted, valign: 'middle' });
  },

  compareTable(slide) {
    const takeaway = SLIDES.find((item) => item.diagram === 'compareTable').takeaway;
    table(slide, ['Tiêu chí', 'Session (stateful)', 'JWT (stateless)'], [
      ['Trạng thái', 'Ở server (session store)', 'Nằm trong access token'],
      ['Revoke', 'Xoá session — có hiệu lực ngay', 'Chờ exp, hoặc denylist / rotation'],
      ['Scale ngang', 'Cần store dùng chung', 'Verify ở bất kỳ đâu có key'],
      ['Kích thước', 'ID nhỏ', 'Lớn hơn, gửi kèm mỗi request'],
      ['Phù hợp', 'Web app cùng site', 'Nhiều API, mobile, phân tán'],
    ], 0.6, 1.55, 12.1, [2.4, 4.85, 4.85], { size: 16, rowH: 0.68 });
    box(slide, takeaway, 0.6, 6.2, 12.1, 0.7, { size: 16, bold: true, align: 'left', line: C.orange, fill: C.orangeDeep, color: C.text, margin: 12 });
  },

  oauthRoles(slide, r) {
    sequence(slide, { x: r.x, y: r.y, w: r.w, h: r.h }, ['Resource Owner\n(user)', 'Client\n(DevHub)', 'Authorization\nServer', 'Resource\nServer (API)'], [
      { from: 1, to: 0, text: 'xin ủy quyền' },
      { from: 0, to: 1, text: 'authorization grant', reply: true },
      { from: 1, to: 2, text: 'grant + credentials' },
      { from: 2, to: 1, text: 'access token', reply: true },
      { from: 1, to: 3, text: 'gọi API bằng access token' },
      { from: 3, to: 1, text: 'dữ liệu được phép', reply: true },
    ], { size: 10 });
  },

  idVsAccess(slide, r) {
    const bw = 1.5, gap = (r.w - bw * 3) / 2;
    const xs = [r.x, r.x + bw + gap, r.x + 2 * (bw + gap)];
    box(slide, 'Identity Provider', xs[0], r.y + 1.0, bw, 1.2, { size: 12, bold: true, line: C.orange });
    box(slide, 'Client\n(DevHub)', xs[1], r.y + 1.0, bw, 1.2, { size: 12, bold: true, line: C.purple });
    box(slide, 'Resource API', xs[2], r.y + 1.0, bw, 1.2, { size: 12, bold: true, line: C.green });
    arrow(slide, xs[0] + bw, r.y + 1.3, xs[1], r.y + 1.3, { color: C.purple });
    arrow(slide, xs[0] + bw, r.y + 1.9, xs[1], r.y + 1.9, { color: C.green });
    text(slide, 'ID token', xs[0] + bw, r.y + 0.98, gap, 0.3, { size: 10, color: C.purple, align: 'center', bold: true });
    text(slide, 'access token', xs[0] + bw, r.y + 1.58, gap, 0.3, { size: 10, color: C.green, align: 'center', bold: true });
    arrow(slide, xs[1] + bw, r.y + 1.3, xs[2], r.y + 1.3, { color: C.green });
    text(slide, 'access token ✓', xs[1] + bw, r.y + 0.98, gap, 0.3, { size: 10, color: C.green, align: 'center' });
    arrow(slide, xs[1] + bw, r.y + 1.9, xs[2], r.y + 1.9, { color: C.red, dash: true });
    text(slide, 'ID token ✗', xs[1] + bw, r.y + 1.58, gap, 0.3, { size: 10, color: C.red, align: 'center' });

    const card = (x, title, color, lines) => box(slide, [
      { text: `${title}\n`, options: { bold: true, color, fontSize: 12 } },
      { text: lines, options: { color: C.text, fontSize: 10.5, fontFace: MONO } },
    ], x, r.y + 3.0, 3.35, 1.45, { align: 'left', line: color });
    card(r.x, 'ID token — cho client', C.purple, 'aud = client_id\nnonce, sub, auth_time\n→ biết AI đã login');
    card(r.x + 3.6, 'Access token — cho API', C.green, 'aud = API\nscope\n→ được GỌI API nào');
  },

  pkceFlow(slide) {
    const takeaway = SLIDES.find((item) => item.diagram === 'pkceFlow').takeaway;
    const x = 0.6, w = 12.1;
    sequence(slide, { x, y: 1.45, w, h: 2.9 }, ['Browser', 'DevHub', 'IdP'], [
      { from: 1, self: true, wide: true, text: 'sinh verifier · challenge · state · nonce' },
      { from: 0, to: 2, text: '/authorize?challenge&state&nonce' },
      { from: 2, to: 0, text: 'callback?code&state', reply: true },
      { from: 1, to: 2, text: '/token: code + verifier' },
      { from: 2, to: 1, text: 'ID token + access token', reply: true },
    ], { size: 12 });
    const params = [
      ['state', 'Khớp callback với lần bấm login.\nChống CSRF trên redirect.', C.purple],
      ['nonce', 'Phải có trong ID token.\nChống replay ID token.', C.blue],
      ['PKCE', 'challenge lên URL.\nverifier giữ bí mật.', C.green],
      ['redirect_uri', 'Chỉ nhận callback đúng URL\nđã đăng ký với IdP.', C.orange],
    ];
    const pw = (w - 0.3) / 4;
    params.forEach(([title, body, color], index) => {
      box(slide, [
        { text: `${title}\n`, options: { bold: true, color, fontSize: 14 } },
        { text: body, options: { color: C.text, fontSize: 12 } },
      ], x + index * (pw + 0.1), 4.5, pw, 1.45, { align: 'left', line: color });
    });
    box(slide, takeaway, x, 6.15, w, 0.7, { size: 16, bold: true, align: 'left', line: C.orange, fill: C.orangeDeep, color: C.text, margin: 12 });
  },

  oidcLogin(slide, r) {
    const steps = [
      ['DevHub', 'sinh state, nonce, PKCE', C.purple],
      ['Identity Provider', 'user đăng nhập', C.blue],
      ['Callback', 'code + state', C.blue],
      ['DevHub', 'kiểm tra, tạo session', C.green],
    ];
    const sw = 1.5, gap = (r.w - sw * steps.length) / (steps.length - 1);
    steps.forEach(([title, detail, color], index) => {
      const x = r.x + index * (sw + gap);
      box(slide, [
        { text: `${title}\n`, options: { bold: true, color, fontSize: 12 } },
        { text: detail, options: { color: C.text, fontSize: 10 } },
      ], x, r.y, sw, 1.0, { line: color });
      if (index < steps.length - 1) arrow(slide, x + sw, r.y + 0.5, x + sw + gap, r.y + 0.5, { color });
    });

    text(slide, 'DevHub chỉ tin lần login khi đạt đủ:', r.x, r.y + 1.35, r.w, 0.35, { size: 11, bold: true, color: C.muted });
    const checks = ['state', 'PKCE', 'chữ ký', 'iss', 'aud', 'exp', 'nonce'];
    const pillGap = 0.1;
    const pill = (r.w - pillGap * (checks.length - 1)) / checks.length;
    checks.forEach((check, index) => {
      box(slide, [{ text: `✓ ${check}`, options: { color: C.green, fontSize: 10.5, bold: true } }], r.x + index * (pill + pillGap), r.y + 1.75, pill, 0.55, { line: C.green });
    });

    const half = (r.w - 0.2) / 2;
    box(slide, [
      { text: 'Logout khỏi DevHub\n', options: { bold: true, color: C.green, fontSize: 12 } },
      { text: 'Session của DevHub bị huỷ → API trả 401.', options: { color: C.text, fontSize: 10.5 } },
    ], r.x, r.y + 2.7, half, 1.1, { align: 'left', line: C.green });
    box(slide, [
      { text: 'Session ở IdP vẫn còn\n', options: { bold: true, color: C.orange, fontSize: 12 } },
      { text: 'Login sau có thể không hỏi password. Cần logout cả IdP.', options: { color: C.text, fontSize: 10.5 } },
    ], r.x + half + 0.2, r.y + 2.7, half, 1.1, { align: 'left', line: C.orange });
  },

  samlFlow(slide) {
    const takeaway = SLIDES.find((item) => item.diagram === 'samlFlow').takeaway;
    const x = 0.6, w = 12.1;
    box(slide, [
      { text: 'Assertion = giấy IdP xác nhận  ', options: { bold: true, color: C.green, fontSize: 14 } },
      { text: '“User X đã login · dành cho app Y · còn hạn tới …” — cùng việc với ID token, khác bao bì (XML vs JWT).', options: { color: C.text, fontSize: 13 } },
    ], x, 1.45, w, 0.75, { align: 'left', line: C.green });
    const half = (w - 0.2) / 2;
    box(slide, [
      { text: 'SAML Assertion\n', options: { bold: true, color: C.orange, fontSize: 14 } },
      { text: 'Định dạng: XML + chữ ký\nMang: Subject, Audience, exp\nVề app: POST tới ACS\nAi đọc: SP (DevHub)', options: { color: C.text, fontSize: 13, fontFace: MONO } },
    ], x, 2.35, half, 1.55, { align: 'left', line: C.orange });
    box(slide, [
      { text: 'OIDC ID token\n', options: { bold: true, color: C.purple, fontSize: 14 } },
      { text: 'Định dạng: JWT (JSON)\nMang: sub, aud, exp, nonce\nVề app: code → /token\nAi đọc: OIDC client', options: { color: C.text, fontSize: 13, fontFace: MONO } },
    ], x + half + 0.2, 2.35, half, 1.55, { align: 'left', line: C.purple });
    text(slide, 'SAU KHI TIN CHỨNG TỪ → CẢ HAI ĐỀU TẠO SESSION RIÊNG CỦA APP', x, 4.05, w, 0.28, { size: 12, color: C.muted, bold: true });
    sequence(slide, { x, y: 4.35, w, h: 1.65 }, ['Browser', 'SP', 'IdP'], [
      { from: 1, to: 2, text: 'AuthnRequest' },
      { from: 2, to: 0, text: 'Assertion (XML)', reply: true },
      { from: 0, to: 1, text: 'POST ACS → verify → session' },
    ], { size: 12 });
    box(slide, takeaway, x, 6.15, w, 0.7, { size: 16, bold: true, align: 'left', line: C.orange, fill: C.orangeDeep, color: C.text, margin: 12 });
  },

  threatQuestions(slide, r) {
    text(slide, 'GỢI Ý BAN ĐẦU — KHÔNG PHẢI ĐÁP ÁN', r.x, r.y, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
    const rows = [
      ['Browser, cùng site, cần logout ngay', 'Session server-side + cookie flags', C.green],
      ['SPA + nhiều API, mobile', 'Access token ngắn + refresh rotation', C.purple],
      ['Service-to-service', 'Client credentials, token có aud hẹp', C.blue],
      ['Doanh nghiệp đã có IdP', 'OIDC / SAML, rồi session cho app', C.orange],
    ];
    rows.forEach(([context, option, color], index) => {
      const y = r.y + 0.45 + index * 1.0;
      box(slide, context, r.x, y, 3.0, 0.75, { size: 11.5 });
      arrow(slide, r.x + 3.0, y + 0.37, r.x + 3.6, y + 0.37, { color });
      box(slide, option, r.x + 3.6, y, r.w - 3.6, 0.75, { size: 11.5, bold: true, line: color, color });
    });
  },

  checklist(slide) {
    const items = [
      ['Password', 'Hash chuyên dụng (bcrypt / Argon2id), cost hợp lý, rate limiting.'],
      ['Session & cookie', 'Regenerate khi login, destroy khi logout, flags theo môi trường.'],
      ['JWT', 'Verify chữ ký, allowlist, iss / aud / exp.'],
      ['Access / refresh', 'Access ngắn hạn, rotate, reuse → thu hồi, lưu hash.'],
      ['OIDC callback', 'state, nonce, PKCE, redirect URI chính xác.'],
      ['AuthZ · tests · logs', 'Quyền ở backend, test 401/403, log không chứa credential.'],
    ];
    items.forEach(([title, body], index) => {
      const col = index % 3, row = Math.floor(index / 3);
      const x = 0.55 + col * 4.15, y = 1.5 + row * 2.4;
      slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.95, h: 2.2, rectRadius: 0.08, fill: { color: C.panel }, line: { color: C.line, width: 1 } });
      box(slide, '✓', x + 0.2, y + 0.22, 0.42, 0.42, { size: 13, bold: true, fill: C.greenDeep, line: C.green, color: C.green });
      text(slide, title, x + 0.75, y + 0.22, 3.0, 0.42, { size: 14, bold: true });
      text(slide, body, x + 0.2, y + 0.8, 3.55, 1.2, { size: 12, color: C.muted, valign: 'top' });
    });
  },

  lifecycleRing() { /* drawn by the closing layout */ },
};

// ---------------------------------------------------------------------------
// Slide layouts

const STATUS_COLORS = {
  200: [C.green, C.greenDeep],
  401: [C.orange, C.orangeDeep],
  403: [C.red, C.redDeep],
};

function casesTable(slide, { rows, takeaway }) {
  const x = 0.6, w = 4.95, rowH = 0.6, statusW = 0.95;
  text(slide, 'REQUEST', x, 1.6, 3, 0.3, { size: 10, bold: true, color: C.muted });
  text(slide, 'STATUS', x + w - statusW, 1.6, statusW, 0.3, { size: 10, bold: true, color: C.muted, align: 'center' });
  rows.forEach(([request, status], index) => {
    const y = 1.95 + index * rowH;
    const [color, deep] = STATUS_COLORS[status];
    slide.addShape(pptx.ShapeType.line, { x, y: y + rowH, w, h: 0, line: { color: C.line, width: 0.75 } });
    text(slide, request, x, y, w - statusW - 0.15, rowH, { size: 14, codeColor: C.purple });
    box(slide, status, x + w - statusW, y + 0.1, statusW, rowH - 0.2, { size: 14, bold: true, mono: true, fill: deep, line: color, color, margin: 1 });
  });
  text(slide, takeaway, x, 1.95 + rows.length * rowH + 0.25, w, 0.85, { size: 15, bold: true, valign: 'top', codeColor: C.purple });
}

function speedBars(slide, { caption, rows, ratio, takeaway, source }) {
  const x = 0.6, w = 4.95;
  text(slide, caption, x, 1.6, w, 0.3, { size: 10.5, bold: true, color: C.muted });
  rows.forEach(([label, value, share, colorKey], index) => {
    const y = 2.05 + index * 1.0;
    const color = C[colorKey];
    text(slide, label, x, y, 2.4, 0.35, { size: 15, bold: true });
    text(slide, value, x + 2.4, y, w - 2.4, 0.35, { size: 15, bold: true, color, align: 'right' });
    slide.addShape(pptx.ShapeType.rect, { x, y: y + 0.45, w, h: 0.3, fill: { color: C.panel2 }, line: { color: C.line, width: 0.5 } });
    slide.addShape(pptx.ShapeType.rect, { x, y: y + 0.45, w: Math.max(w * share, 0.05), h: 0.3, fill: { color }, line: { color, width: 0 } });
  });
  const after = 2.05 + rows.length * 1.0;
  text(slide, ratio, x, after, w, 0.35, { size: 13, color: C.muted, italic: true });
  text(slide, takeaway, x, after + 0.5, w, 0.5, { size: 20, bold: true });
  text(slide, source, x, after + 1.15, w, 0.5, { size: 9.5, color: C.muted, valign: 'top' });
}

function frame(slide, data) {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.06, fill: { color: C.purpleDeep }, line: { color: C.purpleDeep, width: 0 } });
  text(slide, `${data.section.toUpperCase()}  ·  SLIDE ${data.n}/${TOTAL}`, 0.6, 0.22, 7, 0.3, { size: 10, mono: true, color: C.muted });
  text(slide, data.title, 0.6, 0.55, W - 1.2, 0.85, { size: 30, bold: true, valign: 'middle' });
  text(slide, 'Break the Login · Authentication Core', W - 4.6, 7.08, 4.0, 0.28, { size: 9, color: C.muted, align: 'right' });
}

function demoButton(slide, key) {
  const link = DEMO_LINKS[key];
  const url = `${BASE_URL}${link.route}`;
  slide.addText([{ text: link.label, options: { hyperlink: { url, tooltip: url } } }], {
    x: 0.6, y: 6.3, w: 3.9, h: 0.62, shape: pptx.ShapeType.roundRect, rectRadius: 0.08,
    fill: { color: C.purple }, line: { color: C.purple, width: 1 },
    fontFace: FONT, fontSize: 15, bold: true, color: C.ink, align: 'center', valign: 'middle',
  });
}

function titleSlide(slide, data) {
  const { session1, session2 } = DECK.series;
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.purpleDeep }, line: { color: C.purpleDeep, width: 0 } });
  text(slide, 'DEVHUB · FULLSTACK TECHNICAL SHARING', 0.9, 1.55, 11.5, 0.35, { size: 12, mono: true, color: C.muted });
  text(slide, [
    { text: 'Break the ', options: { color: C.text } },
    { text: 'Login.', options: { color: C.purple } },
  ], 0.9, 2.05, 11.5, 1.1, { size: 52, bold: true });
  text(slide, 'Authentication Core — credential lifecycle', 0.9, 3.25, 11.5, 0.45, { size: 20, color: C.text });

  // Buổi đang diễn: nhấn mạnh
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.9, y: 4.15, w: 5.7, h: 1.55, rectRadius: 0.1,
    fill: { color: C.panel }, line: { color: C.purple, width: 1.5 },
  });
  text(slide, session1.label, 1.15, 4.35, 5.2, 0.4, { size: 16, bold: true, color: C.purple });
  text(slide, session1.speaker, 1.15, 4.85, 5.2, 0.55, { size: 22, bold: true, color: C.text });

  // Buổi tiếp theo: nhẹ hơn
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.85, y: 4.15, w: 5.5, h: 1.55, rectRadius: 0.1,
    fill: { color: C.panel }, line: { color: C.line, width: 1 },
  });
  text(slide, session2.label, 7.1, 4.35, 5.0, 0.4, { size: 16, bold: true, color: C.muted });
  text(slide, session2.speaker, 7.1, 4.85, 5.0, 0.55, { size: 20, bold: true, color: C.muted });
}

function partSlide(slide, data) {
  const part = PARTS[data.part - 1];
  const color = C[part.color];
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color }, line: { color, width: 0 } });
  text(slide, `PHẦN ${part.no} / ${String(PARTS.length).padStart(2, '0')}`, 0.9, 2.0, 6, 0.35, { size: 14, mono: true, bold: true, color });
  text(slide, data.title, 0.9, 2.5, 11.5, 1.1, { size: 54, bold: true });
  text(slide, data.question, 0.9, 3.7, 11.5, 0.6, { size: 22, italic: true, color: C.muted });
  const segW = (W - 1.8 - 0.15 * (PARTS.length - 1)) / PARTS.length;
  PARTS.forEach((item, index) => {
    const x = 0.9 + index * (segW + 0.15);
    const active = index === data.part - 1;
    const segColor = active ? color : C.line;
    slide.addShape(pptx.ShapeType.rect, { x, y: 6.55, w: segW, h: 0.07, fill: { color: segColor }, line: { color: segColor, width: 0 } });
    text(slide, `${item.no} ${item.title}`, x, 6.68, segW, 0.3, { size: 9.5, color: active ? color : C.muted, bold: active });
  });
}

function closingSlide(slide, data) {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.06, fill: { color: C.purpleDeep }, line: { color: C.purpleDeep, width: 0 } });
  text(slide, `${data.section.toUpperCase()}  ·  SLIDE ${data.n}/${TOTAL}`, 0.6, 0.22, 7, 0.3, { size: 10, mono: true, color: C.muted });
  text(slide, [
    { text: 'Login an toàn là ', options: { color: C.text } },
    { text: 'vòng đời', options: { color: C.purple } },
    { text: ', không phải nút bấm.', options: { color: C.text } },
  ], 0.6, 1.1, W - 1.2, 1.0, { size: 32, bold: true, align: 'center' });
  const steps = [['Verify', 'đúng', C.purple], ['Store', 'an toàn', C.green], ['Send', 'đúng cách', C.blue], ['Validate', 'đủ', C.orange], ['Revoke', 'khi cần', C.red]];
  const sw = 2.15, gap = (W - 1.2 - sw * steps.length) / (steps.length - 1);
  steps.forEach(([verb, rest, color], index) => {
    const x = 0.6 + index * (sw + gap);
    box(slide, [
      { text: `${verb}\n`, options: { bold: true, color, fontSize: 18 } },
      { text: rest, options: { color: C.text, fontSize: 12 } },
    ], x, 2.9, sw, 1.45, { line: color, lineWidth: 1.5 });
    if (index < steps.length - 1) arrow(slide, x + sw, 3.6, x + sw + gap, 3.6, { color });
  });
  text(slide, 'Break the Login · Authentication Core', W - 4.6, 7.08, 4.0, 0.28, { size: 9, color: C.muted, align: 'right' });
}

function recapSlide(slide, data) {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.06, fill: { color: C.purpleDeep }, line: { color: C.purpleDeep, width: 0 } });
  text(slide, `TỔNG KẾT  ·  SLIDE ${data.n}/${TOTAL}`, 0.6, 0.22, 7, 0.3, { size: 10, mono: true, color: C.muted });
  text(slide, 'Tổng kết', 0.6, 0.55, 12, 0.7, { size: 32, bold: true });
  PARTS.forEach(({ no: number, title, color: colorKey }, index) => {
    const color = C[colorKey];
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 0.6 + col * 4.1;
    const y = 1.5 + row * 2.5;
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.9, h: 2.25, rectRadius: 0.1, fill: { color: C.panel }, line: { color: C.line, width: 1 } });
    slide.addShape(pptx.ShapeType.rect, { x, y, w: 3.9, h: 0.08, fill: { color }, line: { color, width: 0 } });
    text(slide, number, x + 0.25, y + 0.25, 3.4, 0.3, { size: 12, color, bold: true, mono: true });
    text(slide, title, x + 0.25, y + 0.65, 3.4, 0.45, { size: 18, bold: true, color: C.text });
    text(slide, RECAP[index].line, x + 0.25, y + 1.25, 3.4, 0.7, { size: 14, color: C.muted, codeColor: C.green });
  });
  text(slide, 'Break the Login · Authentication Core', W - 4.6, 7.08, 4.0, 0.28, { size: 9, color: C.muted, align: 'right' });
}

function thanksSlide(slide, data) {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.purpleDeep }, line: { color: C.purpleDeep, width: 0 } });
  text(slide, `TỔNG KẾT  ·  SLIDE ${data.n}/${TOTAL}`, 0.9, 0.22, 7, 0.3, { size: 10, mono: true, color: C.muted });
  text(slide, 'Cảm ơn.', 0.9, 2.9, 11.5, 1.2, { size: 60, bold: true });
  text(slide, 'Break the Login · Authentication Core', W - 4.6, 7.08, 4.0, 0.28, { size: 9, color: C.muted, align: 'right' });
}

function continuedSlide(slide, data) {
  const { session2 } = DECK.series;
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.purpleDeep }, line: { color: C.purpleDeep, width: 0 } });
  text(slide, `TỔNG KẾT  ·  SLIDE ${data.n}/${TOTAL}`, 0.9, 0.22, 7, 0.3, { size: 10, mono: true, color: C.muted });
  text(slide, 'To be continued', 0.9, 2.0, 11.5, 0.45, { size: 20, italic: true, color: C.muted });
  text(slide, [
    { text: 'Auth', options: { color: C.text } },
    { text: 'Z', options: { color: C.purple } },
  ], 0.9, 2.5, 11.5, 0.95, { size: 52, bold: true });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.9, y: 3.7, w: 6.6, h: 1.55, rectRadius: 0.1,
    fill: { color: C.panel }, line: { color: C.purple, width: 1.5 },
  });
  text(slide, session2.label, 1.15, 3.9, 6.1, 0.4, { size: 16, bold: true, color: C.purple });
  text(slide, session2.speaker, 1.15, 4.4, 6.1, 0.55, { size: 22, bold: true, color: C.text });
  text(slide, 'Break the Login · Authentication Core', W - 4.6, 7.08, 4.0, 0.28, { size: 9, color: C.muted, align: 'right' });
}

for (const data of SLIDES) {
  const slide = pptx.addSlide();
  if (data.n === 1) titleSlide(slide, data);
  else if (data.part) partSlide(slide, data);
  else if (data.diagram === 'lifecycleRing') closingSlide(slide, data);
  else if (data.diagram === 'recap') recapSlide(slide, data);
  else if (data.diagram === 'thanks') thanksSlide(slide, data);
  else if (data.diagram === 'continued') continuedSlide(slide, data);
  else {
    frame(slide, data);
    if (FULL_WIDTH.has(data.diagram)) DIAGRAMS[data.diagram](slide);
    else {
      if (data.cases) casesTable(slide, data.cases);
      else if (data.speed) speedBars(slide, data.speed);
      else bullets(slide, data.bullets, 0.6, 1.65, 4.95, 4.4, data.bullets.length > 4 ? 16 : 18);
      DIAGRAMS[data.diagram](slide, { x: 5.95, y: 1.6, w: 6.85, h: 4.5 });
    }
    if (data.demo) demoButton(slide, data.demo);
  }
  const demoLine = data.demo ? `\n\nLink demo: ${BASE_URL}${DEMO_LINKS[data.demo].route}` : '';
  slide.addNotes(`[${data.time} · ${data.minutes} phút]\n\n${data.notes}${demoLine}`);
}

// pptxgenjs writes one <a:pPr> per run; OOXML allows one per paragraph and later
// ones (often <a:buNone/>) override bullets and alignment. Keep only the first.
const PPR = /<a:pPr\b[^>]*\/>|<a:pPr\b[^>]*>[\s\S]*?<\/a:pPr>/g;
const zip = await JSZip.loadAsync(await pptx.write({ outputType: 'nodebuffer' }));
for (const name of Object.keys(zip.files).filter((file) => /^ppt\/slides\/slide\d+\.xml$/.test(file))) {
  const xml = await zip.file(name).async('string');
  const fixed = xml.replace(/<a:p>[\s\S]*?<\/a:p>/g, (paragraph) => {
    let seen = false;
    return paragraph.replace(PPR, (ppr) => (seen ? '' : ((seen = true), ppr)));
  });
  zip.file(name, fixed);
}
writeFileSync(OUT_PPTX, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
console.log(`Wrote ${OUT_PPTX} (${SLIDES.length} slides, demo base ${BASE_URL})`);

// ---------------------------------------------------------------------------
// Markdown mirror of the deck

const md = [];
md.push(`# 02 — Nội dung ${TOTAL} slide và speaker notes`, '');
md.push(`> File này được sinh tự động từ \`slides/deck-content.mjs\` bởi \`npm run build\` trong thư mục \`slides/\`. Sửa nội dung ở file nguồn rồi build lại, đừng sửa trực tiếp file này.`, '');
md.push(`- Deck: \`slides/break-the-login.pptx\``);
md.push(`- Thời lượng: ${DECK.durationMinutes} phút`);
md.push(`- Link demo trỏ tới \`${BASE_URL}\` (đổi bằng biến môi trường \`DEMO_BASE_URL\` khi build).`, '');
md.push('## Bảng slide → demo', '', '| Slide | Nút | URL |', '| --- | --- | --- |');
for (const data of SLIDES.filter((slide) => slide.demo)) {
  const link = DEMO_LINKS[data.demo];
  md.push(`| ${data.n} | \`${link.label}\` | ${BASE_URL}${link.route} |`);
}
md.push('');
for (const data of SLIDES) {
  md.push(`## Slide ${data.n} — ${data.title}`, '');
  md.push(`*${data.section} · ${data.time} · ${data.minutes} phút*`, '');
  md.push('**Nội dung hiển thị**', '');
  if (data.question) md.push(`*${data.question}*`, '');
  for (const bullet of data.bullets) md.push(`- ${bullet}`);
  if (data.takeaway) md.push(`- ${data.takeaway}`);
  md.push('');
  if (data.demo) {
    const link = DEMO_LINKS[data.demo];
    md.push(`**Demo ${link.demo}:** nút \`${link.label}\` → ${BASE_URL}${link.route}`, '');
  }
  md.push('**Speaker notes**', '');
  md.push(data.notes.split('\n').map((line) => (line.trim() ? `> ${line}` : '>')).join('\n'), '');
}
mkdirSync(dirname(OUT_MD), { recursive: true });
writeFileSync(OUT_MD, md.join('\n'));
console.log(`Wrote ${OUT_MD}`);
