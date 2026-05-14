'use strict';

// Читаем .env из корня проекта (на Railway создаётся при сборке из Service Variables)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express  = require('express');
const xlsx     = require('xlsx');
const Fuse     = require('fuse.js');
const fs       = require('fs');
const path     = require('path');
const pdfParse = require('pdf-parse');
const { Pool } = require('pg');

const app      = express();
const PORT     = process.env.PORT || 3000;
const ROOT     = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CACHE    = path.join(DATA_DIR, 'cache', 'parsed.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const HISTORY_MAX  = 500;

app.use(express.static(path.join(ROOT, 'app')));
app.use(express.json());

// ─── history ─────────────────────────────────────────────────────────────────
let history = [];

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      console.log(`  ✓ history → ${history.length} записей`);
    }
  } catch (e) { history = []; }
}

function saveHistory() {
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8'); }
  catch (e) { console.warn('History write failed:', e.message); }
}

function addHistory(entry) {
  history.unshift({ ...entry, ts: new Date().toISOString() });
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
  saveHistory();
}

// ─── Supabase / PostgreSQL ────────────────────────────────────────────────────
let pgPool = null;

function getPool() {
  if (!pgPool && process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL.trim();
    console.log('[DB] DATABASE_URL prefix:', url.slice(0, 20) + '…');
    try {
      pgPool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        max: 5,
      });
      pgPool.on('error', e => console.warn('PG pool error:', e.message));
    } catch (e) {
      console.error('[DB] Pool creation failed:', e.message);
    }
  }
  return pgPool;
}

async function dbQuery(sql, params = []) {
  const pool = getPool();
  if (!pool) throw new Error('DATABASE_URL не настроен');
  try {
    const client = await pool.connect();
    try { return await client.query(sql, params); }
    finally { client.release(); }
  } catch (e) {
    // Добавляем контекст к ошибке подключения
    throw new Error(`DB: ${e.message}`);
  }
}

// Загружает поставщиков из БД в память и пересобирает индекс
async function reloadSuppliersFromDB() {
  const { rows } = await dbQuery(
    'SELECT * FROM suppliers ORDER BY "Категория", "Название"'
  );
  db.suppliers = rows;
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
  console.log(`  ✓ suppliers (Supabase) → ${rows.length} записей`);
}

// Первоначальный импорт из xlsx, если таблица пустая
async function importXlsxToDB() {
  const file = path.join(DATA_DIR, 'suppliers.xlsx');
  if (!fs.existsSync(file)) return;
  const wb   = xlsx.readFile(file);
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  if (!rows.length) return;

  const cols = ['Категория','Название','Сайт','Телефон','Email','Telegram/VK','Услуги / Примечание','Хештеги','⭐'];
  for (const row of rows) {
    await dbQuery(
      `INSERT INTO suppliers ("Категория","Название","Сайт","Телефон","Email","Telegram/VK","Услуги / Примечание","Хештеги","⭐")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      cols.map(c => String(row[c] || ''))
    );
  }
  console.log(`  ✓ импорт xlsx → Supabase: ${rows.length} поставщиков`);
}

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

  // Поставщики — Supabase (с fallback на xlsx)
  if (process.env.DATABASE_URL) {
    try {
      const { rows } = await dbQuery('SELECT COUNT(*) FROM suppliers');
      if (parseInt(rows[0].count) === 0) {
        console.log('  ⟳ таблица пустая — импортируем xlsx → Supabase…');
        await importXlsxToDB();
      }
      await reloadSuppliersFromDB();
    } catch (e) {
      console.warn('  ! Supabase недоступен, fallback на xlsx:', e.message);
      db.suppliers = loadSuppliers();
    }
  } else {
    console.warn('  ! DATABASE_URL не задан, поставщики из xlsx (изменения не сохранятся)');
    db.suppliers = loadSuppliers();
  }

  db.pricelist = loadPricelist();
  db.knowledge = await loadKnowledge(!fresh);
  db.scripts   = loadScripts();

  // buildIndexes строит только contentSearch и supSearch (если поставщики из xlsx)
  if (!process.env.DATABASE_URL) buildIndexes();
  else {
    // supSearch уже собран в reloadSuppliersFromDB; строим только contentSearch
    const contentItems = [
      ...db.scripts,
      ...db.knowledge.map(k => ({
        id: k.id, type: 'knowledge', category: 'База знаний',
        title: k.title, keywords: [], text: k.content.substring(0, 3000), tags: [],
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
      threshold: 0.45, includeScore: true, useExtendedSearch: false,
    });
  }

  if (fresh) saveCache({ knowledge: db.knowledge });
  db.lastLoaded = new Date();
  console.log(`\n✅  Готово (${db.suppliers.length} поставщ. · ${db.pricelist.length} позиций · ${db.knowledge.length} документов · ${db.scripts.length} скриптов)\n`);
}

// ─── Gemini API ──────────────────────────────────────────────────────────────
const GEMINI_SYSTEM = `Ты — менеджер мерч-агентства с опытом 10+ лет. Ты пишешь сообщение напрямую клиенту.

ГЛАВНОЕ ПРАВИЛО: твой ответ — это ГОТОВЫЙ ТЕКСТ СООБЩЕНИЯ КЛИЕНТУ. Не совет менеджеру, не анализ ситуации — именно тот текст, который менеджер скопирует и отправит клиенту в WhatsApp/Telegram.

Менеджер может передать тебе:
— сообщение, которое написал клиент
— описание ситуации своими словами
В любом случае — ты пишешь ответ КЛИЕНТУ, от первого лица, как будто ты сам менеджер.

СТИЛЬ:
— живой, дружелюбный, уверенный
— без канцелярита и шаблонных фраз
— emoji умеренно (1–2 максимум)

СТРУКТУРА:
1. Эмпатия / реакция
2. Короткое пояснение (если нужно)
3. 2–3 уточняющих вопроса для продвижения сделки
4. Призыв к следующему шагу

ТЫ ЭКСПЕРТ В:
— корпоративном мерче и брендированной одежде
— технологиях нанесения: шелкография, вышивка, DTF, УФ-печать, тампопечать, сублимация
— подборе изделий под бюджет и задачу

ЗАПРЕЩЕНО:
— писать "клиент хочет...", "советую менеджеру..." — ты пишешь КЛИЕНТУ, не о нём
— использовать markdown: никаких **, *, ##, никаких звёздочек
— писать длинные лекции (максимум 80 слов)
— писать обращение "Привет" если ситуация не предполагает первого контакта

Пиши обычным текстом, как в WhatsApp/Telegram. Для списков используй тире: —`;

async function callGemini(clientMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: `${GEMINI_SYSTEM}\n\nСитуация (сообщение клиента или описание): "${clientMessage}"\n\nНапиши готовый текст ответа клиенту:` }],
    }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Gemini ${resp.status}: ${txt.slice(0, 200)}`);
  }

  const data = await resp.json();

  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    console.warn('[Gemini] finishReason:', finishReason, '| parts:', candidate?.content?.parts?.length);
  }

  // Фильтруем thinking-части (thought:true) — берём только реальный ответ
  const parts = candidate?.content?.parts || [];
  const raw = parts.filter(p => !p.thought).map(p => p.text || '').join('');
  if (!raw) throw new Error('Gemini: пустой ответ');

  // Убираем markdown — модель иногда игнорирует инструкцию
  const text = raw
    .replace(/\*\*(.*?)\*\*/g, '$1')          // **жирный** → жирный
    .replace(/\*(.*?)\*/g, '$1')              // *курсив* → курсив
    .replace(/^[\*\-]\s+/gm, '— ')           // * пункт → — пункт
    .replace(/^#+\s+/gm, '')                 // ## заголовки → убрать
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [ссылки](url) → текст
    .replace(/\n{3,}/g, '\n\n')              // лишние пустые строки
    .trim();

  return text;
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

// ── CRUD поставщиков (только если Supabase подключён) ──

const SUP_COLS = ['Категория','Название','Сайт','Телефон','Email','Telegram/VK','Услуги / Примечание','Хештеги','⭐'];

// Создать поставщика
app.post('/api/suppliers', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'БД не подключена' });
  const s = req.body;
  if (!s['Название'] || !s['Название'].trim()) return res.status(400).json({ error: 'Название обязательно' });
  try {
    const vals = SUP_COLS.map(c => String(s[c] || ''));
    const { rows } = await dbQuery(
      `INSERT INTO suppliers ("Категория","Название","Сайт","Телефон","Email","Telegram/VK","Услуги / Примечание","Хештеги","⭐")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      vals
    );
    await reloadSuppliersFromDB();
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Обновить поставщика
app.patch('/api/suppliers/:id', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'БД не подключена' });
  const { id } = req.params;
  const s = req.body;
  try {
    const sets = SUP_COLS.map((c, i) => `"${c}" = $${i + 1}`).join(', ');
    const vals = [...SUP_COLS.map(c => String(s[c] || '')), id];
    const { rows } = await dbQuery(
      `UPDATE suppliers SET ${sets}, updated_at = now() WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найден' });
    await reloadSuppliersFromDB();
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Удалить поставщика
app.delete('/api/suppliers/:id', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'БД не подключена' });
  try {
    await dbQuery('DELETE FROM suppliers WHERE id = $1', [req.params.id]);
    await reloadSuppliersFromDB();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

  // Логируем запрос в историю
  addHistory({
    message: q,
    scripts: scripts.map(s => s.title),
    knowledge: knowledge.map(k => k.title),
    recommended: recommended?.title || null,
  });

  res.json({ scripts, knowledge, recommended });
});

// ── AI reply (Gemini) ──
app.post('/api/generate-reply', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.json({ reply: null });
  try {
    const reply = await callGemini(message.trim());
    // Дополняем последнюю запись истории AI-ответом
    if (history.length && history[0].message === message.trim() && !history[0].aiReply) {
      history[0].aiReply = reply;
      saveHistory();
    }
    res.json({ reply });
  } catch (e) {
    console.error('Gemini error:', e.message);
    res.json({ reply: null, error: e.message });
  }
});

// ── AI шаги менеджера (Gemini) ──
const STEPS_SYSTEM = `Ты — коммерческий директор премиального агентства B2B-мерча 23Merch. Твоя задача — давать менеджерам по продажам микро-инструкции, как довести конкретного клиента до оплаты.

ПРАВИЛА (КРИТИЧЕСКИ ВАЖНО):
1. Никакой воды и общих советов. ЗАПРЕЩЕНО: "Уточните запрос", "Выявите потребности", "Установите следующий шаг".
2. Абсолютная контекстность. Называй вещи своими именами. Если клиент хочет 30 кепок — пиши про кепки, лекала, вышивку и сроки. Если 100 футболок — про ткань, печать и размеры.
3. Вектор на закрытие сделки. Каждый шаг двигает клиента по воронке: Сбор деталей → Просчет КП → Сигнальный образец → Счёт.
4. Жёсткий фоллоу-ап. Всегда включай шаг с инструкцией: что делать если клиент прочитает и промолчит (через сколько дней написать и с каким аргументом).

ФОРМАТ ВЫВОДА — строго JSON-массив, без лишнего текста:
[
  {
    "icon": "📋",
    "title": "Конкретное действие (5-7 слов)",
    "memo": "Подробная инструкция для менеджера. Что именно сделать, что написать, что посчитать. Конкретные цифры и сроки если есть."
  }
]

Сгенерируй 2-3 шага. Только JSON, без markdown, без пояснений.`;

app.post('/api/generate-steps', async (req, res) => {
  const { message, aiReply } = req.body;
  if (!message || !message.trim()) return res.json({ steps: [] });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json({ steps: [] });

  try {
    const prompt = `${STEPS_SYSTEM}\n\nЗапрос клиента: "${message.trim()}"\nНаш ответ клиенту: "${(aiReply || '').slice(0, 500)}"`;

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
    };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    );

    if (!resp.ok) return res.json({ steps: [] });

    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const raw = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();

    // Извлекаем JSON из ответа
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.json({ steps: [] });

    const steps = JSON.parse(jsonMatch[0]);
    res.json({ steps: Array.isArray(steps) ? steps : [] });
  } catch (e) {
    console.error('Steps error:', e.message);
    res.json({ steps: [] });
  }
});

// ── история запросов ──
app.get('/api/history', (req, res) => {
  if (req.query.key !== '23merch') return res.status(403).send('Forbidden');
  if (req.query.format === 'json') return res.json(history);

  const cards = history.map((h, i) => {
    const date = new Date(h.ts).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    const scripts = (h.scripts || []).map(s => `<span class="tag">${s.replace(/</g,'&lt;')}</span>`).join('') || '<span style="color:#9ca3af">—</span>';
    const knowledge = (h.knowledge || []).map(k => `<span class="tag tag-kb">${k.replace(/</g,'&lt;')}</span>`).join('');
    const recommended = h.recommended
      ? `<span class="tag tag-rec">⭐ ${h.recommended.replace(/</g,'&lt;')}</span>`
      : '';
    const aiBlock = h.aiReply
      ? `<div class="ai-block"><div class="ai-label">✨ AI-ответ</div><div class="ai-text">${h.aiReply.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div></div>`
      : '<div style="color:#9ca3af;font-size:12px;margin-top:8px">AI-ответ не запрашивался</div>';

    return `
      <div class="card" onclick="toggle(${i})">
        <div class="card-header">
          <div class="card-meta">${date}</div>
          <div class="card-message">${h.message.replace(/</g,'&lt;')}</div>
          <div class="card-tags">${recommended}${scripts}${knowledge}</div>
          <div class="card-arrow" id="arrow-${i}">▼</div>
        </div>
        <div class="card-body" id="body-${i}">
          ${aiBlock}
        </div>
      </div>`;
  }).join('');

  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>История запросов — 23merch</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f9fafb; color: #111827; }
    .header { background: #fff; border-bottom: 1px solid #e5e7eb; padding: 16px 24px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 10; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 700; }
    .badge { background: #ede9fe; color: #7c3aed; border-radius: 20px; padding: 3px 10px; font-size: 13px; font-weight: 600; }
    .hint { margin-left: auto; font-size: 12px; color: #9ca3af; }
    .container { padding: 20px 24px; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
    .card { background: #fff; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.08); border: 1px solid #e5e7eb; overflow: hidden; }
    .card-header { padding: 14px 16px; cursor: pointer; display: grid; grid-template-columns: 130px 1fr auto 24px; gap: 12px; align-items: start; user-select: none; }
    .card-header:hover { background: #fafafa; }
    .card-meta { font-size: 11px; color: #9ca3af; padding-top: 2px; white-space: nowrap; }
    .card-message { font-size: 14px; font-weight: 600; color: #111827; line-height: 1.4; }
    .card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .tag { background: #f3f4f6; color: #374151; border-radius: 20px; padding: 2px 8px; font-size: 11px; }
    .tag-rec { background: #ede9fe; color: #7c3aed; font-weight: 600; }
    .tag-kb { background: #fef3c7; color: #92400e; }
    .card-arrow { color: #9ca3af; font-size: 12px; transition: transform .2s; padding-top: 3px; }
    .card-arrow.open { transform: rotate(180deg); }
    .card-body { display: none; padding: 0 16px 16px; border-top: 1px solid #f3f4f6; }
    .card-body.open { display: block; }
    .ai-block { margin-top: 12px; background: #f0fdf4; border-left: 3px solid #22c55e; border-radius: 0 6px 6px 0; padding: 12px 14px; }
    .ai-label { font-size: 11px; font-weight: 700; color: #16a34a; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .05em; }
    .ai-text { font-size: 13px; color: #111827; line-height: 1.7; }
    .empty { text-align: center; padding: 80px; color: #9ca3af; font-size: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <span style="font-size:22px">📋</span>
    <h1>История запросов</h1>
  </div>
  <div class="container">
    ${history.length === 0
      ? '<div class="empty">Запросов пока нет — менеджеры ещё не использовали раздел «Клиент пишет»</div>'
      : cards}
  </div>
  <script>
    function toggle(i) {
      const body = document.getElementById('body-' + i);
      const arrow = document.getElementById('arrow-' + i);
      body.classList.toggle('open');
      arrow.classList.toggle('open');
    }
  </script>
</body>
</html>`);
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
app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ─── start ────────────────────────────────────────────────────────────────────
loadHistory();
initialize().then(() => {
  // '0.0.0.0' обязателен для Railway / Render — слушаем все интерфейсы
  app.listen(PORT, '0.0.0.0', () => {
    const env = process.env.NODE_ENV || 'development';
    console.log(`🚀  23merch Portal [${env}] → http://0.0.0.0:${PORT}\n`);
  });
}).catch(e => { console.error('Init failed:', e); process.exit(1); });
