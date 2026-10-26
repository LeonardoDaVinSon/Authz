import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import PptxGenJS from 'pptxgenjs';
import { DECK, DEMO_LINKS, SLIDES } from './deck-content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const BASE_URL = (process.env.DEMO_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const OUT_PPTX = join(here, 'break-the-login.pptx');
const OUT_MD = join(root, 'docs', '02-slide-content.md');

// ---------------------------------------------------------------------------
// Guard: every demo button must point at a route the lab frontend serves.
const routesSource = readFileSync(join(root, 'devhub-auth-lab', 'frontend', 'src', 'routes.ts'), 'utf8');
const knownRoutes = new Set([...routesSource.matchAll(/'(\/demo[^']*)'/g)].map((match) => match[1]));
for (const [key, link] of Object.entries(DEMO_LINKS)) {
  if (!knownRoutes.has(link.route)) throw new Error(`Demo link "${key}" points to ${link.route}, which is not in frontend/src/routes.ts`);
}
if (SLIDES.length !== 27) throw new Error(`Expected 27 slides, found ${SLIDES.length}`);

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

const FULL_WIDTH = new Set(['agenda', 'incidents', 'checklist', 'exitTicket']);
const TOTAL = SLIDES.length;

const DIAGRAMS = {
  architecture(slide, r) {
    box(slide, 'Browser', r.x, r.y + 1.55, 1.7, 0.8, { size: 14, bold: true });
    box(slide, 'DevHub API\nNestJS', r.x + 2.55, r.y + 1.45, 1.9, 1.0, { size: 14, bold: true, line: C.purple });
    box(slide, 'Session Store', r.x + 5.25, r.y + 0.55, 1.7, 0.8, { size: 12, line: C.green });
    box(slide, 'Identity Provider', r.x + 5.25, r.y + 2.55, 1.7, 0.8, { size: 12, line: C.orange });
    arrow(slide, r.x + 1.7, r.y + 1.95, r.x + 2.55, r.y + 1.95, { color: C.purple, tail: 'triangle' });
    arrow(slide, r.x + 4.45, r.y + 1.75, r.x + 5.25, r.y + 0.95, { color: C.green, tail: 'triangle' });
    arrow(slide, r.x + 4.45, r.y + 2.15, r.x + 5.25, r.y + 2.95, { color: C.orange, tail: 'triangle' });
    text(slide, 'credential', r.x + 1.62, r.y + 1.52, 1.0, 0.3, { size: 10, color: C.muted, align: 'center' });
    text(slide, 'tạo · lưu · gửi · verify · thu hồi', r.x, r.y + 3.75, r.w, 0.4, { size: 13, color: C.muted, align: 'center', italic: true });
  },

  agenda(slide) {
    const items = [
      ['01', 'AuthN ≠ AuthZ', '401 / 403 · quyền phía server', C.purple],
      ['02', 'Password', 'Hash · salt · stuffing', C.orange],
      ['03', 'Session & cookie', 'Lifecycle · logout · CSRF/XSS', C.green],
      ['04', 'JWT & tokens', 'Decode ≠ verify · refresh', C.blue],
      ['05', 'OAuth / OIDC', 'Code Flow + PKCE · SAML', C.purple],
      ['06', 'Kiến trúc', 'Threat model · checklist', C.orange],
    ];
    items.forEach(([number, title, detail, color], index) => {
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

  incidents(slide) {
    text(slide, 'Backlog DevHub tuần này: ba ticket được gắn cùng một nhãn — bug login.', 0.6, 1.5, 12.1, 0.4, { size: 16, color: C.muted, italic: true });
    const items = [
      ['TICKET 01', '“Tôi đã logout rồi”', 'User bấm Logout, nhưng API vẫn nhận request của họ.', 'Lifecycle?\nAuthN?', C.orange],
      ['TICKET 02', '“Member vào được admin”', 'Tài khoản member gọi được API chỉ dành cho admin.', 'AuthZ?\nBackend?', C.red],
      ['TICKET 03', '“JWT có role: admin”', 'Mở payload ra thấy role admin — vậy là admin?', 'Decode?\nVerify?', C.purple],
    ];
    items.forEach(([ticket, title, body, question, color], index) => {
      const x = 0.6 + index * 4.1;
      const y = 2.05;
      slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.85, h: 3.55, rectRadius: 0.1, fill: { color: C.panel }, line: { color: C.line, width: 1 } });
      slide.addShape(pptx.ShapeType.rect, { x, y, w: 3.85, h: 0.08, fill: { color }, line: { color, width: 0 } });
      text(slide, ticket, x + 0.25, y + 0.2, 3.35, 0.3, { size: 11, color, bold: true, mono: true });
      text(slide, title, x + 0.25, y + 0.55, 3.35, 0.55, { size: 17, bold: true, valign: 'top' });
      text(slide, body, x + 0.25, y + 1.2, 3.35, 1.15, { size: 13.5, color: C.text, valign: 'top' });
      box(slide, question, x + 0.25, y + 2.5, 3.35, 0.75, { size: 12, fill: C.panel2, color: C.muted, dash: true });
    });
    text(slide, 'Cùng triệu chứng — khác lớp nguyên nhân. Phân lớp trước khi vá nút Login.', 0.6, 5.8, 12.1, 0.4, { size: 15, color: C.muted, italic: true });
  },

  authnAuthz(slide, r) {
    const y = r.y + 1.0, bw = 1.4, bh = 1.0, gap = (r.w - bw * 4) / 3;
    const xs = [0, 1, 2, 3].map((index) => r.x + index * (bw + gap));
    box(slide, 'Request', xs[0], y, bw, bh, { size: 13, bold: true });
    box(slide, 'AuthN\nWho are you?', xs[1], y, bw, bh, { size: 12, bold: true, line: C.purple });
    box(slide, 'AuthZ\nWhat can you do?', xs[2], y, bw, bh, { size: 12, bold: true, line: C.blue });
    box(slide, '200 OK', xs[3], y, bw, bh, { size: 15, bold: true, fill: C.greenDeep, line: C.green, color: C.green });
    for (let index = 0; index < 3; index++) arrow(slide, xs[index] + bw, y + bh / 2, xs[index + 1], y + bh / 2, { color: C.purple });
    text(slide, 'principal { id, role }', xs[1] + bw / 2 - 0.4, y - 0.45, bw + gap + 0.8, 0.35, { size: 10, color: C.muted, align: 'center', mono: true });
    const outY = y + bh + 1.0;
    box(slide, '401', xs[1] + 0.2, outY, bw - 0.4, 0.62, { size: 18, bold: true, fill: C.orangeDeep, line: C.orange, color: C.orange });
    box(slide, '403', xs[2] + 0.2, outY, bw - 0.4, 0.62, { size: 18, bold: true, fill: C.redDeep, line: C.red, color: C.red });
    arrow(slide, xs[1] + bw / 2, y + bh, xs[1] + bw / 2, outY, { color: C.orange });
    arrow(slide, xs[2] + bw / 2, y + bh, xs[2] + bw / 2, outY, { color: C.red });
    text(slide, 'credential thiếu / sai', xs[1] - 0.25, outY + 0.68, bw + 0.5, 0.35, { size: 10, color: C.muted, align: 'center' });
    text(slide, 'đã biết là ai, không đủ quyền', xs[2] - 0.3, outY + 0.68, bw + 0.6, 0.35, { size: 10, color: C.muted, align: 'center' });
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
    text(slide, 'không', cx + dw / 2, r.y + 1.05, 1.0, 0.3, { size: 10, color: C.orange, align: 'center' });
    text(slide, 'không', cx + dw / 2, r.y + 2.55, 1.0, 0.3, { size: 10, color: C.red, align: 'center' });
    text(slide, 'có', cx + 0.08, r.y + 1.98, 0.5, 0.3, { size: 10, color: C.green });
    text(slide, 'có', cx + 0.08, r.y + 3.48, 0.5, 0.3, { size: 10, color: C.green });
  },

  passwordHash(slide, r) {
    text(slide, 'LƯU (lúc đăng ký / đổi password)', r.x, r.y, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
    box(slide, 'password', r.x, r.y + 0.45, 1.5, 0.7, { size: 12, mono: true });
    box(slide, 'bcrypt\ncost + salt ngẫu nhiên', r.x + 2.1, r.y + 0.4, 2.0, 0.8, { size: 11, bold: true, line: C.purple });
    box(slide, '$2a$10$<salt><hash>', r.x + 4.7, r.y + 0.45, 2.25, 0.7, { size: 11, mono: true, line: C.green, color: C.green });
    arrow(slide, r.x + 1.5, r.y + 0.8, r.x + 2.1, r.y + 0.8, { color: C.purple });
    arrow(slide, r.x + 4.1, r.y + 0.8, r.x + 4.7, r.y + 0.8, { color: C.purple });
    text(slide, 'DB chỉ giữ chuỗi này', r.x + 4.7, r.y + 1.2, 2.25, 0.3, { size: 9.5, color: C.muted, align: 'center' });

    text(slide, 'VERIFY (lúc login)', r.x, r.y + 2.0, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
    box(slide, 'password nhập', r.x, r.y + 2.45, 1.5, 0.7, { size: 11, mono: true });
    box(slide, 'hash đã lưu', r.x, r.y + 3.35, 1.5, 0.7, { size: 11, mono: true, line: C.green });
    box(slide, 'bcrypt.compare\nđọc salt + cost từ hash', r.x + 2.1, r.y + 2.8, 2.0, 0.9, { size: 11, bold: true, line: C.purple });
    box(slide, 'match: true / false', r.x + 4.7, r.y + 2.9, 2.25, 0.7, { size: 12, mono: true });
    arrow(slide, r.x + 1.5, r.y + 2.8, r.x + 2.1, r.y + 3.05, { color: C.purple });
    arrow(slide, r.x + 1.5, r.y + 3.7, r.x + 2.1, r.y + 3.45, { color: C.green });
    arrow(slide, r.x + 4.1, r.y + 3.25, r.x + 4.7, r.y + 3.25, { color: C.purple });
    text(slide, 'Không có bước "giải mã" nào.', r.x, r.y + 4.25, r.w, 0.35, { size: 12, color: C.orange, italic: true, align: 'center' });
  },

  saltDefense(slide, r) {
    text(slide, 'CÙNG PASSWORD, KHÁC HASH', r.x, r.y, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
    box(slide, 'correct-horse-battery', r.x, r.y + 0.65, 2.0, 0.7, { size: 10.5, mono: true });
    const hashRun = (salt, rest) => [
      { text: '$2a$10$', options: { color: C.purple, fontFace: MONO } },
      { text: salt, options: { color: C.ink, highlight: 'B6F0D8', fontFace: MONO } },
      { text: rest, options: { color: C.text, fontFace: MONO } },
    ];
    box(slide, hashRun('FkqD0yEg8sfPXOaDf6yClO', 'iEYuAowt…'), r.x + 2.6, r.y + 0.35, 4.35, 0.55, { size: 10.5, align: 'left' });
    box(slide, hashRun('GwdFYBs00xRxy3exlqlI5e', 'GIzhiFPP…'), r.x + 2.6, r.y + 1.1, 4.35, 0.55, { size: 10.5, align: 'left' });
    arrow(slide, r.x + 2.0, r.y + 1.0, r.x + 2.6, r.y + 0.62, { color: C.purple });
    arrow(slide, r.x + 2.0, r.y + 1.0, r.x + 2.6, r.y + 1.38, { color: C.purple });
    text(slide, 'salt (22 ký tự, không bí mật)', r.x + 2.6, r.y + 1.7, 4.35, 0.3, { size: 9.5, color: C.green });

    text(slide, 'MỖI LỚP CHẶN MỘT KIỂU TẤN CÔNG', r.x, r.y + 2.3, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
    const half = (r.w - 0.2) / 2;
    box(slide, [
      { text: 'Offline — DB bị lộ\n', options: { bold: true, color: C.purple, fontSize: 12 } },
      { text: 'Salt: không dùng được bảng tra sẵn\nHash chậm: mỗi lần đoán tốn kém', options: { color: C.text, fontSize: 11 } },
    ], r.x, r.y + 2.7, half, 1.5, { align: 'left' });
    box(slide, [
      { text: 'Online — credential stuffing\n', options: { bold: true, color: C.orange, fontSize: 12 } },
      { text: 'Hash không giúp được\nRate limit · monitoring · MFA', options: { color: C.text, fontSize: 11 } },
    ], r.x + half + 0.2, r.y + 2.7, half, 1.5, { align: 'left', line: C.orange });
  },

  sessionFlow(slide, r) {
    sequence(slide, r, ['Browser', 'DevHub API', 'Session Store'], [
      { from: 0, to: 1, text: 'POST /login' },
      { from: 1, self: true, text: 'verify password' },
      { from: 1, to: 2, text: 'regenerate + lưu session' },
      { from: 1, to: 0, text: 'Set-Cookie: sid=…', reply: true },
      { from: 0, to: 1, text: 'GET /api/me + Cookie' },
      { from: 1, to: 2, text: 'tra cứu sid' },
      { from: 1, to: 0, text: '200 { user }', reply: true },
    ]);
  },

  cookieAnatomy(slide, r) {
    box(slide, [
      { text: 'Set-Cookie: ', options: { color: C.muted } },
      { text: 'sid=…; ', options: { color: C.text } },
      { text: 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900', options: { color: C.green } },
    ], r.x, r.y, r.w, 0.62, { size: 11.5, mono: true, align: 'left', fill: C.panel });
    table(slide, ['Thuộc tính', 'Chống lại', 'Không chống được'], [
      ['`HttpOnly`', 'JavaScript đọc cookie', 'XSS gọi API thay user'],
      ['`Secure`', 'Lộ qua HTTP thường', 'Lộ ở log / máy user'],
      ['`SameSite=Lax`', 'Phần lớn request cross-site', 'Mọi kịch bản CSRF'],
      ['`Path` / `Domain`', 'Gửi cookie ra ngoài phạm vi', '—'],
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
      box(slide, 'Browser cookie', x + 0.2, y + 0.65, half - 0.4, 0.5, { size: 11, fill: C.panel2, line: C.line, color: C.muted });
      box(slide, lines[0], x + 0.2, y + 1.3, half - 0.4, 0.55, { size: 11, fill: deep, line: color, color });
      text(slide, lines[1], x + 0.2, y + 1.95, half - 0.4, 0.95, { size: 11, color: C.text, valign: 'top' });
    };
    column(r.x, 'Chỉ xoá cookie', C.red, C.redDeep, ['Session store: CÒN SỐNG', 'Browser trông như đã logout, nhưng bản sao session ID vẫn dùng được.']);
    column(r.x + half + 0.25, 'Destroy session ở server', C.green, C.greenDeep, ['Session store: ĐÃ XOÁ', 'Mọi bản sao session ID đều vô giá trị → 401.']);
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
    panel(r.x, 'CSRF', C.orange, ['evil.example', 'Browser (đang login DevHub)', 'DevHub API thực thi'],
      ['form POST tự động', 'cookie tự gửi kèm'], 'Attacker không thấy cookie.\nPhòng vệ: SameSite, CSRF token, kiểm tra Origin.');
    panel(r.x + half + 0.3, 'XSS', C.red, ['Script độc trong origin DevHub', 'fetch("/api/…") như user', 'DevHub API thực thi'],
      ['chạy với quyền trang', 'cookie vẫn được gửi'], 'HttpOnly chỉ chặn đọc cookie.\nPhòng vệ: output encoding, CSP, sanitize.');
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

  claimsTable(slide, r) {
    table(slide, ['Claim', 'Server kiểm tra'], [
      ['`sub`', 'User tồn tại, còn hoạt động'],
      ['`iss`', 'Đúng issuer mong đợi'],
      ['`aud`', 'Token dành cho chính API này'],
      ['`exp`', 'Chưa hết hạn (bắt buộc)'],
      ['`nbf` / `iat`', 'Đã có hiệu lực, phát hành hợp lý'],
      ['`jti`', 'ID để thu hồi / chống replay'],
      ['`alg` (header)', 'Nằm trong allowlist'],
    ], r.x, r.y, r.w, [1.85, 5.0], { size: 12, rowH: 0.52 });
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
      { text: 'chỉ gửi tới /tokens/refresh\nserver lưu SHA-256, không lưu bản gốc', options: { color: C.text, fontSize: 10.5 } },
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
    text(slide, 'Không biết bên nào là attacker → huỷ hết, buộc login lại.', r.x + 5.4, r.y + 3.1, r.w - 5.4, 0.95, { size: 10, color: C.muted, valign: 'middle' });
  },

  compareTable(slide, r) {
    table(slide, ['Tiêu chí', 'Session (stateful)', 'JWT (stateless)'], [
      ['Trạng thái', 'Ở server (session store)', 'Nằm trong token'],
      ['Revoke', 'Xoá session — có hiệu lực ngay', 'Chờ exp, hoặc denylist / rotation'],
      ['Scale ngang', 'Cần store dùng chung', 'Verify ở bất kỳ đâu có key'],
      ['Rủi ro browser', 'Cookie tự gửi → CSRF', 'Lưu trong JS → lộ khi XSS'],
      ['Kích thước', 'ID nhỏ', 'Lớn hơn, gửi kèm mỗi request'],
      ['Phù hợp', 'Web app cùng site', 'Nhiều API, mobile, phân tán'],
    ], r.x, r.y, r.w, [1.6, 2.7, 2.65], { size: 11.5, rowH: 0.56 });
  },

  oauthRoles(slide, r) {
    text(slide, 'OAuth 2.0 = ủy quyền gọi API, không phải “màn hình login”', r.x, r.y, r.w, 0.3, { size: 11, color: C.muted, bold: true });
    sequence(slide, { x: r.x, y: r.y + 0.35, w: r.w, h: r.h - 0.35 }, ['Resource Owner\n(user)', 'Client\n(DevHub)', 'Authorization\nServer', 'Resource\nServer (API)'], [
      { from: 1, to: 0, text: 'xin ủy quyền' },
      { from: 0, to: 1, text: 'authorization grant', reply: true },
      { from: 1, to: 2, text: 'grant + client credentials' },
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

  pkceFlow(slide, r) {
    sequence(slide, r, ['Browser', 'DevHub client', 'Identity Provider'], [
      { from: 1, self: true, wide: true, text: 'sinh verifier, challenge, state, nonce' },
      { from: 0, to: 2, text: 'GET /authorize?code_challenge&state&nonce' },
      { from: 2, self: true, text: 'user xác thực' },
      { from: 2, to: 0, text: '302 redirect_uri?code&state', reply: true },
      { from: 0, to: 1, text: 'callback → so state' },
      { from: 1, to: 2, text: 'POST /token: code + verifier' },
      { from: 2, to: 1, text: 'ID token + access token', reply: true },
      { from: 1, self: true, wide: true, text: 'validate sig, iss, aud, exp, nonce' },
    ], { size: 10 });
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
      { text: 'Lần login sau có thể không hỏi lại mật khẩu. Cần logout cả ở IdP.', options: { color: C.text, fontSize: 10.5 } },
    ], r.x + half + 0.2, r.y + 2.7, half, 1.1, { align: 'left', line: C.orange });
  },

  samlFlow(slide, r) {
    box(slide, [
      { text: 'Assertion = giấy IdP xác nhận\n', options: { bold: true, color: C.green, fontSize: 12 } },
      { text: '“User X đã login · dành cho app Y · còn hạn tới …”\nCùng việc với ID token — khác bao bì (XML vs JWT).', options: { color: C.text, fontSize: 11 } },
    ], r.x, r.y, r.w, 0.95, { align: 'left', line: C.green });

    const half = (r.w - 0.15) / 2;
    box(slide, [
      { text: 'SAML Assertion\n', options: { bold: true, color: C.orange, fontSize: 12 } },
      { text: 'Định dạng: XML + chữ ký\nMang: Subject, Audience, exp\nVề app: POST tới ACS\nAi đọc: SP (DevHub)', options: { color: C.text, fontSize: 10.5, fontFace: MONO } },
    ], r.x, r.y + 1.1, half, 1.55, { align: 'left', line: C.orange });
    box(slide, [
      { text: 'OIDC ID token\n', options: { bold: true, color: C.purple, fontSize: 12 } },
      { text: 'Định dạng: JWT (JSON)\nMang: sub, aud, exp, nonce\nVề app: code → /token\nAi đọc: OIDC client', options: { color: C.text, fontSize: 10.5, fontFace: MONO } },
    ], r.x + half + 0.15, r.y + 1.1, half, 1.55, { align: 'left', line: C.purple });

    text(slide, 'SAU KHI TIN CHỨNG TỪ → CẢ HAI ĐỀU TẠO SESSION RIÊNG CỦA APP', r.x, r.y + 2.8, r.w, 0.28, { size: 10, color: C.muted, bold: true });

    sequence(slide, { x: r.x, y: r.y + 3.1, w: r.w, h: 1.35 }, ['Browser', 'SP', 'IdP'], [
      { from: 1, to: 2, text: 'AuthnRequest' },
      { from: 2, to: 0, text: 'Assertion (XML)', reply: true },
      { from: 0, to: 1, text: 'POST ACS → verify → session' },
    ], { size: 9.5 });
  },

  threatQuestions(slide, r) {
    text(slide, 'ĐIỂM KHỞI ĐẦU THƯỜNG GẶP — KHÔNG PHẢI ĐÁP ÁN', r.x, r.y, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
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

  caseStudy(slide, r) {
    text(slide, 'ĐIỀN CÙNG KHÁN GIẢ — click tiếp để hiện đáp án', r.x, r.y, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
    table(slide, ['Yêu cầu DevHub', 'Session', 'JWT + refresh', 'OIDC + session'], [
      ['Logout có hiệu lực', '?', '?', '?'],
      ['Role member / admin', '?', '?', '?'],
      ['Audit rõ ràng', '?', '?', '?'],
      ['Vận hành đơn giản', '?', '?', '?'],
      ['Web app nội bộ, NestJS', '?', '?', '?'],
    ], r.x, r.y + 0.45, r.w, [2.35, 1.5, 1.55, 1.55], { size: 12, rowH: 0.62 });
  },

  caseStudyAnswers(slide, r) {
    text(slide, 'GỢI Ý ĐÁP ÁN — không phải đáp án duy nhất', r.x, r.y, r.w, 0.3, { size: 10.5, color: C.muted, bold: true });
    table(slide, ['Yêu cầu DevHub', 'Session', 'JWT + refresh', 'OIDC + session'], [
      ['Logout có hiệu lực', '✓ ngay', '~ revoke / đợi exp', '✓ session app'],
      ['Role member / admin', '✓', '✓', '✓'],
      ['Audit rõ ràng', '✓', '✓', '✓'],
      ['Vận hành đơn giản', '✓', '~ phức tạp hơn', '~ cần IdP'],
      ['Web app nội bộ, NestJS', '✓ hợp', '~', '✓ nếu có IdP'],
    ], r.x, r.y + 0.4, r.w, [2.35, 1.5, 1.55, 1.55], { size: 12, rowH: 0.52 });
    box(slide, [
      { text: 'Hướng thảo luận\n', options: { bold: true, color: C.green, fontSize: 12 } },
      { text: 'DevHub nội bộ + logout phải có hiệu lực → Session (hoặc OIDC + session của DevHub). JWT + refresh hợp hơn khi nhiều API / mobile.', options: { color: C.text, fontSize: 11 } },
    ], r.x, r.y + 3.35, r.w, 1.05, { align: 'left', line: C.green });
  },

  checklist(slide) {
    const items = [
      ['Password', 'Hash chuyên dụng (bcrypt / Argon2id), cost hợp lý, rate limiting.'],
      ['Session & cookie', 'Regenerate khi login, destroy khi logout, flags theo môi trường.'],
      ['JWT', 'Verify chữ ký, allowlist thuật toán, iss / aud / exp.'],
      ['Access / refresh', 'Access ngắn hạn, refresh rotation, phát hiện reuse, lưu hash.'],
      ['OIDC callback', 'state, nonce, PKCE, redirect URI chính xác.'],
      ['AuthZ · tests · logs', 'Kiểm quyền ở backend, test 401/403, log không chứa credential.'],
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

  exitTicket(slide) {
    const questions = SLIDES.find((item) => item.diagram === 'exitTicket')?.bullets || [];
    questions.forEach((question, index) => {
      const y = 1.7 + index * 1.45;
      box(slide, String(index + 1), 0.6, y, 0.85, 1.2, { size: 26, bold: true, fill: C.panel2, line: C.purple, color: C.purple });
      slide.addShape(pptx.ShapeType.roundRect, { x: 1.65, y, w: 11.05, h: 1.2, rectRadius: 0.08, fill: { color: C.panel }, line: { color: C.line, width: 1 } });
      text(slide, question, 1.95, y, 10.5, 1.2, { size: 18, bold: true });
    });
    text(slide, 'Đáp án nằm trong speaker notes.', 0.6, 6.2, 12.1, 0.3, { size: 12, color: C.muted, italic: true });
  },

  lifecycleRing() { /* drawn by the closing layout */ },
};

// ---------------------------------------------------------------------------
// Slide layouts

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
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.purpleDeep }, line: { color: C.purpleDeep, width: 0 } });
  text(slide, 'AUTHENTICATION CORE', 0.8, 1.2, 6, 0.35, { size: 12, mono: true, color: C.green });
  text(slide, [
    { text: 'Break the ', options: { color: C.text } },
    { text: 'Login.', options: { color: C.purple } },
  ], 0.8, 1.7, 6.2, 1.3, { size: 54, bold: true });
  text(slide, DECK.subtitle, 0.8, 3.05, 6, 0.5, { size: 20, color: C.text });
  text(slide, DECK.audience, 0.8, 3.6, 6, 0.4, { size: 14, color: C.muted });
  DIAGRAMS.architecture(slide, { x: 6.1, y: 1.7, w: 6.95, h: 4.5 });
}

function closingSlide(slide, data) {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.06, fill: { color: C.purpleDeep }, line: { color: C.purpleDeep, width: 0 } });
  text(slide, `${data.section.toUpperCase()}  ·  SLIDE ${TOTAL}/${TOTAL}`, 0.6, 0.22, 7, 0.3, { size: 10, mono: true, color: C.muted });
  text(slide, [
    { text: 'Secure login is a ', options: { color: C.text } },
    { text: 'lifecycle', options: { color: C.purple } },
    { text: ', not a button.', options: { color: C.text } },
  ], 0.6, 1.1, W - 1.2, 1.0, { size: 34, bold: true, align: 'center' });
  const steps = [['Verify', 'đúng', C.purple], ['Store', 'an toàn', C.green], ['Gửi', 'đúng cách', C.blue], ['Validate', 'đủ', C.orange], ['Revoke', 'có chủ đích', C.red]];
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

for (const data of SLIDES) {
  const slide = pptx.addSlide();
  if (data.n === 1) titleSlide(slide, data);
  else if (data.n === TOTAL) closingSlide(slide, data);
  else {
    frame(slide, data);
    if (FULL_WIDTH.has(data.diagram)) DIAGRAMS[data.diagram](slide);
    else {
      bullets(slide, data.bullets, 0.6, 1.65, 4.95, 4.4, data.bullets.length > 4 ? 16 : 18);
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
  for (const bullet of data.bullets) md.push(`- ${bullet}`);
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
