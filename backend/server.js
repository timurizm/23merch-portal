'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express  = require('express');
const xlsx     = require('xlsx');
const Fuse     = require('fuse.js');
const fs       = require('fs');
const path     = require('path');
const pdfParse = require('pdf-parse');

const app      = express();
const PORT     = process.env.PORT || 3000;
const ROOT     = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CACHE    = path.join(DATA_DIR, 'cache', 'parsed.json');

app.use(express.static(path.join(ROOT, 'app')));
app.use(express.json());

// ─── in-memory state ────────────────────────────────────────────────────────
const db = {
  suppliers      : [],
  knowledge      : [],   // { id, title, file, content, type:'knowledge' }
  scripts        : [],   // { id, category, title, keywords, text, tags, type:'script' }
  pricelist      : [],   // { id, category, name, supplier, tiers, print, timing, comments }
  supSearch      : null, // Fuse index for suppliers
  contentSearch  : null, // Fuse index for scripts + knowledge
  lastLoaded     : null,
};

// ─── helpers ────────────────────────────────────────────────────────────────
function cleanTitle(raw) {
  return raw.replace(/[_\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function saveCache(data) {
  try { fs.writeFileSync(CACHE, JSON.stringify(data, null, 2), 'utf-8'); }
  catch (e) { console.warn('Cache write failed:', e.message); }
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE)) return JSON.parse(fs.readFileSync(CACHE, 'utf-8'));
  } catch (e) { /* ignore */ }
  return null;
}

// ─── loaders ────────────────────────────────────────────────────────────────
function loadSuppliers() {
  const file = path.join(DATA_DIR, 'suppliers.xlsx');
  if (!fs.existsSync(file)) { console.warn('suppliers.xlsx not found'); return []; }

  const wb  = xlsx.readFile(file);
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws);
  console.log(`  ✓ suppliers.xlsx → ${rows.length} строк`);
  return rows;
}

async function loadKnowledge(useCache) {
  const dir = path.join(DATA_DIR, 'knowledge');
  if (!fs.existsSync(dir)) return [];

  // try cache
  if (useCache) {
    const c = loadCache();
    if (c && c.knowledge) { console.log(`  ✓ knowledge (из кеша) → ${c.knowledge.length} документов`); return c.knowledge; }
  }

  const docs  = [];
  const files = fs.readdirSync(dir).filter(f => /\.(pdf|txt|md)$/i.test(f));

  for (const file of files) {
    const fp  = path.join(dir, file);
    const ext = path.extname(file).toLowerCase();
    const title = cleanTitle(path.basename(file, ext));
    let content = '';

    try {
      if (ext === '.txt' || ext === '.md') {
        content = fs.readFileSync(fp, 'utf-8');
      } else if (ext === '.pdf') {
        process.stdout.write(`    parsing ${file} … `);
        const buf  = fs.readFileSync(fp);
        const data = await pdfParse(buf);
        content    = data.text;
        process.stdout.write('done\n');
      }
    } catch (e) {
      console.error(`  ! error reading ${file}: ${e.message}`);
    }

    content = content.replace(/\s{3,}/g, '\n').trim();
    if (content.length > 20) {
      docs.push({ id: file, title, file, content, type: 'knowledge' });
    }
  }

  console.log(`  ✓ knowledge → ${docs.length} документов`);
  return docs;
}

function loadPricelist() {
  const file = path.join(DATA_DIR, 'база-2.xlsx');
  if (!fs.existsSync(file)) { console.warn('база-2.xlsx not found'); return []; }

  const wb = xlsx.readFile(file);
  const ws = wb.Sheets['Часто считаем'];
  if (!ws) { console.warn('"Часто считаем" sheet not found'); return []; }

  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  const items = [];
  let currentCategory = '';
  let idx = 0;

  for (const row of rows) {
    const name     = String(row['Название']                          || '').trim();
    const supplier = String(row['Поставщик/ссылка']                  || '').trim();
    const qty      = String(row['тираж']                             || '').trim();
    const price    = String(row['Цена за шт. (себес)']               || '').trim();
    const print    = String(row['Нанесение за шт (если применимо)']  || '').trim();
    const timing   = String(row['Сроки производства']                || '').trim();
    const comments = String(row['Комментарии']                       || '').trim();

    // Строка-заголовок категории: есть название, нет поставщика и нет цены
    if (name && !supplier && !price) { currentCategory = name; continue; }

    // Пропускаем строки без названия или без полезных данных
    if (!name || (!supplier && !price)) continue;

    // Многоуровневое ценообразование: тираж и цена могут содержать несколько строк
    const qtyLines   = qty.split('\n').map(s => s.trim()).filter(Boolean);
    const priceLines = price.split('\n').map(s => s.trim()).filter(Boolean);
    const tiers = (qtyLines.length > 1 || priceLines.length > 1)
      ? qtyLines.map((q, i) => ({ qty: q, price: priceLines[i] || '' }))
      : [{ qty, price }];

    items.push({ id: `pl-${idx++}`, category: currentCategory, name, supplier, tiers, print, timing, comments });
  }

  console.log(`  ✓ база-2.xlsx (Часто считаем) → ${items.length} позиций`);
  return items;
}

function loadScripts() {
  const dir = path.join(DATA_DIR, 'scripts');
  if (!fs.existsSync(dir)) return [];

  const scripts = [];
  const files   = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const raw  = fs.readFileSync(path.join(dir, file), 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        data.forEach(s => { s.type = 'script'; });
        scripts.push(...data);
      }
    } catch (e) {
      console.error(`  ! error reading ${file}: ${e.message}`);
    }
  }

  console.log(`  ✓ scripts → ${scripts.length} скриптов`);
  return scripts;
}

// ─── search index ────────────────────────────────────────────────────────────
function buildIndexes() {
  // supplier search
  db.supSearch = new Fuse(db.suppliers, {
    keys: [
      { name: 'Название',             weight: 3 },
      { name: 'Категория',            weight: 2 },
      { name: 'Услуги / Примечание',  weight: 1.5 },
      { name: 'Хештеги',             weight: 0.8 },
    ],
    threshold: 0.45,
    includeScore: true,
  });

  // content search (scripts + knowledge snippets)
  const contentItems = [
    ...db.scripts,
    ...db.knowledge.map(k => ({
      id       : k.id,
      type     : 'knowledge',
      category : 'База знаний',
      title    : k.title,
      keywords : [],
      text     : k.content.substring(0, 3000),
      tags     : [],
    })),
  ];

  db.contentSearch = new Fuse(contentItems, {
    keys: [
      { name: 'title',    weight: 3 },
      { name: 'keywords', weight: 4 },
      { name: 'tags',     weight: 2 },
      { name: 'text',     weight: 1 },
      { name: 'category', weight: 1 },
    ],
    threshold: 0.45,
    includeScore: true,
    useExtendedSearch: false,
  });
}

// ─── initialize ──────────────────────────────────────────────────────────────
async function initialize(fresh = false) {
  console.log('\n⟳  Загружаем данные…');
  db.suppliers = loadSuppliers();
  db.pricelist = loadPricelist();
  db.knowledge = await loadKnowledge(!fresh);
  db.scripts   = loadScripts();
  buildIndexes();

  // update cache when loaded fresh
  if (fresh) saveCache({ knowledge: db.knowledge });

  db.lastLoaded = new Date();
  console.log(`\n✅  Готово (${db.suppliers.length} поставщ. · ${db.pricelist.length} позиций · ${db.knowledge.length} документов · ${db.scripts.length} скриптов)\n`);
}

// ─── Gemini API ──────────────────────────────────────────────────────────────
const GEMINI_SYSTEM = `Ты опытный менеджер мерч-агентства 23friends. Напиши короткий ответ клиенту, который:
• подтверждает запрос
• задаёт уточняющие вопросы для подготовки расчёта
• переводит диалог к следующему шагу

Правила:
— Ответ на русском языке, как в мессенджере (WhatsApp / Telegram)
— Короткий и естественный, без канцелярских приветствий «Здравствуйте, уважаемый»
— Emoji умеренно — 1-2 максимум
— Если клиент называет изделие и количество — подтверди и спроси про макет, цвет, дату
— Если возражение по цене — мягко объясни ценность без скидок
— Если клиент думает / согласовывает — помоги принять решение без давления
— Ответ не длиннее 8 строк`;

async function callGemini(clientMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: `${GEMINI_SYSTEM}\n\nСообщение клиента: "${clientMessage}"` }],
    }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
  };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Gemini ${resp.status}: ${txt.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini: пустой ответ');
  return text.trim();
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function findExcerpt(content = '', query = '') {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 15);
  if (!lines.length) return '';

  let bestIdx = 0, bestScore = -1;
  lines.forEach((line, idx) => {
    const ll = line.toLowerCase();
    const score = words.reduce((s, w) => s + (ll.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; bestIdx = idx; }
  });

  const start = Math.max(0, bestIdx - 1);
  const end   = Math.min(lines.length - 1, bestIdx + 3);
  return lines.slice(start, end).join('\n').substring(0, 600);
}

// ─── API routes ───────────────────────────────────────────────────────────────

// status
app.get('/api/status', (_req, res) => res.json({
  suppliers  : db.suppliers.length,
  pricelist  : db.pricelist.length,
  knowledge  : db.knowledge.length,
  scripts    : db.scripts.length,
  lastLoaded : db.lastLoaded,
}));

// ── pricelist (Часто считаем) ──
app.get('/api/pricelist', (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json(db.pricelist);
  const lo = q.toLowerCase();
  res.json(db.pricelist.filter(item =>
    item.name.toLowerCase().includes(lo)     ||
    item.category.toLowerCase().includes(lo) ||
    item.comments.toLowerCase().includes(lo)
  ));
});

// ── suppliers ──
app.get('/api/suppliers', (req, res) => {
  const { q, category } = req.query;
  let result = db.suppliers;

  if (q && q.trim()) {
    result = db.supSearch.search(q.trim()).map(r => r.item);
  }
  if (category && category !== 'all') {
    result = result.filter(s => s['Категория'] === category);
  }
  res.json(result);
});

app.get('/api/suppliers/categories', (_req, res) => {
  const cats = [...new Set(db.suppliers.map(s => s['Категория']).filter(Boolean))];
  res.json(cats);
});

// ── knowledge ──
app.get('/api/knowledge', (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.json(db.knowledge.map(k => ({
      id      : k.id,
      title   : k.title,
      file    : k.file,
      excerpt : k.content.substring(0, 350),
    })));
  }

  const hits = db.contentSearch.search(q.trim())
    .filter(r => r.item.type === 'knowledge')
    .slice(0, 10);

  res.json(hits.map(r => {
    const doc = db.knowledge.find(k => k.id === r.item.id);
    return {
      id      : r.item.id,
      title   : r.item.title,
      file    : doc?.file,
      excerpt : findExcerpt(doc?.content || '', q.trim()),
      score   : r.score,
    };
  }));
});

app.get('/api/knowledge/:id', (req, res) => {
  const doc = db.knowledge.find(k => k.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ id: doc.id, title: doc.title, file: doc.file, content: doc.content });
});

// ── scripts ──
app.get('/api/scripts/categories', (_req, res) => {
  const cats = [...new Set(db.scripts.map(s => s.category).filter(Boolean))];
  res.json(cats);
});

app.get('/api/scripts', (req, res) => {
  const { category, q } = req.query;
  let result = db.scripts;
  if (category && category !== 'all') result = result.filter(s => s.category === category);
  if (q && q.trim()) {
    const fuse = new Fuse(result, { keys: ['title','keywords','text','tags'], threshold: 0.4 });
    result = fuse.search(q.trim()).map(r => r.item);
  }
  res.json(result);
});

// ── analyze client message ──
app.post('/api/analyze', (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.json({ scripts: [], knowledge: [], recommended: null });

  const q       = message.trim();
  const results = db.contentSearch.search(q);

  const scripts   = results.filter(r => r.item.type === 'script').slice(0, 6).map(r => r.item);
  const knowledge = results.filter(r => r.item.type === 'knowledge').slice(0, 3).map(r => {
    const doc = db.knowledge.find(k => k.id === r.item.id);
    return { ...r.item, excerpt: findExcerpt(doc?.content || '', q) };
  });

  // simple intent boost: reorder if clear signal detected
  const lower = q.toLowerCase();
  let recommended = scripts[0] || null;

  const intentMap = [
    { rx: /дорог|дешевл|бюджет|стоимост|переплач/,          cat: 'Возражения', title: /дорог/i },
    { rx: /есть поставщик|работаем с|уже заказыв/,           cat: 'Возражения', title: /поставщик/i },
    { rx: /подумаем|посовещаемся|согласовать|надо обсудить/,  cat: 'Дожим',      title: /согласован/i },
    { rx: /долго|сроки|когда|успеете|дедлайн/,               cat: 'Возражения', title: /долго/i },
    { rx: /нет макет|нет дизайн|не знаем дизайн/,            cat: 'Возражения', title: /макет/i },
  ];

  for (const { rx, cat, title } of intentMap) {
    if (rx.test(lower)) {
      const match = db.scripts.find(s => s.category === cat && title.test(s.title));
      if (match) { recommended = match; break; }
    }
  }

  res.json({ scripts, knowledge, recommended });
});

// ── AI reply (Gemini) ──
app.post('/api/generate-reply', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.json({ reply: null });
  try {
    const reply = await callGemini(message.trim());
    res.json({ reply });
  } catch (e) {
    console.error('Gemini error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── refresh ──
app.post('/api/refresh', async (_req, res) => {
  try {
    await initialize(true);
    res.json({ success: true, message: `База обновлена: ${db.suppliers.length} поставщ., ${db.knowledge.length} документов, ${db.scripts.length} скриптов` });
  } catch (e) {
    console.error('Refresh error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── health check (нужен для Railway / Render) ────────────────────────────────
app.get('/health', (_req, res) => {
  const k = process.env.GEMINI_API_KEY || '';
  res.json({
    ok: true,
    uptime: process.uptime(),
    gemini: !!k,
    keyLen: k.length,
    keyStart: k.slice(0, 6) || '(empty)',   // первые 6 символов — безопасно
    allKeys: Object.keys(process.env).filter(x => x.includes('GEMINI')),
  });
});

// ─── start ────────────────────────────────────────────────────────────────────
initialize().then(() => {
  // '0.0.0.0' обязателен для Railway / Render — слушаем все интерфейсы
  app.listen(PORT, '0.0.0.0', () => {
    const env = process.env.NODE_ENV || 'development';
    console.log(`🚀  23merch Portal [${env}] → http://0.0.0.0:${PORT}\n`);
  });
}).catch(e => { console.error('Init failed:', e); process.exit(1); });
