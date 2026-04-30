'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
//  SMART SEARCH — нормализация, синонимы, ключевые слова
// ═══════════════════════════════════════════════════════════════════════════════

const STOPWORDS = new Set([
  // вежливые вставки (из ТЗ)
  'хотели','бы','можете','сможете','например','пожалуйста','скажите',
  // местоимения
  'нам','нас','мы','вы','я','он','она','оно','они','меня','тебя','себя',
  // указательные / неопределённые
  'это','эти','эта','тот','та','те','такой','такую','такие','такого','такая','такие',
  // союзы / частицы
  'что','как','так','же','ли','уже','ещё','еще','очень','также','или','и','но','а',
  'даже','только','вот','ведь','всё','все','тоже','просто','там','тут','здесь',
  // предлоги
  'в','на','по','за','из','от','до','при','для','без','со','об','под',
  'над','про','через','между','перед','после','около','вокруг','ко','во',
  // модальные и вспомогательные
  'можно','нужно','надо','буду','будем','будете','будут','есть','нет','да','ну',
  'хотим','хотите','хотел','хотела','хотеть',
  // пустышки
  'один','одна','одно','тоже','ещё','либо','либо','или','когда','если','чтобы',
]);

// Словарь синонимов — номинатив и частые падежные формы
const SYNONYMS = {
  // ── одежда верхняя ─────────────────────────────────────────────────────────
  'кофта'      : ['худи','толстовка','свитшот','лонгслив'],
  'кофты'      : ['худи','толстовки','свитшоты'],
  'кофту'      : ['худи','толстовку','свитшот','кофта'],
  'кофтой'     : ['худи','толстовкой','кофта'],
  'худи'       : ['кофта','толстовка','свитшот'],
  'толстовка'  : ['кофта','худи','свитшот'],
  'толстовку'  : ['кофту','худи','свитшот'],
  'толстовки'  : ['кофты','худи','свитшоты'],
  'свитшот'    : ['кофта','худи','толстовка'],
  'свитшоты'   : ['кофты','худи','толстовки'],
  'куртка'     : ['ветровка','жилет','бомбер'],
  'куртки'     : ['ветровки','жилеты'],
  'ветровка'   : ['куртка','жилет'],
  'жилет'      : ['куртка','ветровка'],
  'бомбер'     : ['куртка','ветровка'],
  // ── базовые изделия ────────────────────────────────────────────────────────
  'футболка'   : ['майка','поло','тишерт','лонгслив'],
  'футболки'   : ['майки','поло'],
  'футболку'   : ['майку','поло'],
  'майка'      : ['футболка','поло'],
  'майки'      : ['футболки','поло'],
  'поло'       : ['футболка','рубашка'],
  'лонгслив'   : ['футболка','кофта'],
  'шапка'      : ['кепка','панама','бейсболка','шапки'],
  'шапки'      : ['кепки','панамы','бейсболки'],
  'кепка'      : ['шапка','бейсболка','панама'],
  'бейсболка'  : ['кепка','шапка','панама'],
  'штаны'      : ['брюки','джинсы','шорты'],
  'брюки'      : ['штаны','джинсы'],
  'шорты'      : ['штаны','брюки'],
  'носки'      : ['гольфы'],
  // ── нанесение ──────────────────────────────────────────────────────────────
  'печать'     : ['нанесение','логотип','принт','вышивка'],
  'печатью'    : ['нанесением','логотипом','принтом'],
  'логотип'    : ['печать','нанесение','принт','вышивка','эмблема'],
  'логотипа'   : ['печати','нанесения','принта'],
  'логотипом'  : ['печатью','нанесением','принтом'],
  'нанесение'  : ['печать','логотип','принт','вышивка'],
  'нанесением' : ['печатью','логотипом'],
  'принт'      : ['печать','нанесение','логотип'],
  'принта'     : ['печати','нанесения'],
  'вышивка'    : ['нанесение','принт','логотип'],
  'вышивку'    : ['нанесение','принт','логотип'],
  'эмблема'    : ['логотип','принт','нанесение'],
  'эмблему'    : ['логотип','принт','нанесение'],
  'надпись'    : ['текст','принт','логотип'],
  // ── ткань / производство ───────────────────────────────────────────────────
  'ткань'      : ['материал','хлопок','полиэстер','плотность'],
  'ткани'      : ['материалы','хлопок','плотность'],
  'материал'   : ['ткань','хлопок','плотность'],
  'хлопок'     : ['ткань','материал','cotton'],
  'пошив'      : ['изготовление','производство','отшив'],
  'пошива'     : ['изготовления','производства'],
  'изготовить' : ['пошить','сделать','произвести','заказать'],
  'изготовление': ['пошив','производство','отшив'],
  'тираж'      : ['количество','штук','единиц','объём'],
  'тиражом'    : ['количеством','штуками'],
  'количество' : ['тираж','штук'],
  // ── сувенирка / подарки ────────────────────────────────────────────────────
  'сувенир'    : ['подарок','сувенирка','мерч','промо'],
  'сувениры'   : ['подарки','сувенирка','мерч'],
  'подарок'    : ['сувенир','сувенирка','мерч'],
  'подарки'    : ['сувениры','сувенирка','мерч'],
  'мерч'       : ['сувенир','подарок','одежда','мерчендайз'],
  'корпоратив' : ['подарки','сувениры','мерч'],
  'промо'      : ['сувенир','реклама','акция'],
  // ── ценовые вопросы ────────────────────────────────────────────────────────
  'дорого'     : ['цена','стоимость','дешевле','скидка','бюджет','переплата'],
  'дороже'     : ['дорого','цена','дешевле'],
  'дешевле'    : ['дорого','цена','скидка','бюджет'],
  'цена'       : ['стоимость','прайс','дорого','бюджет'],
  'цены'       : ['стоимость','прайс','дорого'],
  'стоимость'  : ['цена','прайс','дорого'],
  'стоимости'  : ['цены','прайс'],
  'скидка'     : ['дорого','дешевле','цена'],
  'скидку'     : ['дорого','дешевле','цена'],
  'бюджет'     : ['цена','стоимость','дорого'],
  'бюджета'    : ['цены','стоимости'],
  // ── сроки ──────────────────────────────────────────────────────────────────
  'срок'       : ['сроки','дедлайн','быстро','успеете','когда'],
  'сроки'      : ['срок','дедлайн','быстро'],
  'сроков'     : ['срок','дедлайна'],
  'дедлайн'    : ['срок','сроки','быстро','долго'],
  'быстро'     : ['срочно','дедлайн','срок'],
  'срочно'     : ['быстро','дедлайн','срок'],
  'долго'      : ['срок','дедлайн','ждать','сроки'],
  'когда'      : ['срок','сроки','дедлайн'],
  // ── поставщики / конкуренты ────────────────────────────────────────────────
  'поставщик'  : ['другой','конкурент','компания','уже работаем'],
  'поставщика' : ['поставщик','конкурента'],
  'конкурент'  : ['поставщик','другой','компания'],
  // ── макет / дизайн ─────────────────────────────────────────────────────────
  'макет'      : ['дизайн','файл','логотип','нет макета'],
  'макета'     : ['дизайна','файла','логотипа'],
  'дизайн'     : ['макет','файл','логотип'],
  'дизайна'    : ['макета','файла','логотипа'],
};

// Универсальный fallback — показывается если ничего не найдено
const FALLBACK_RESPONSE = {
  category : '💬 Универсальный ответ',
  title    : 'Готовность помочь',
  text     :
`Здравствуйте!

Да, можем изготовить такие изделия.

Для расчёта стоимости уточните:
— тираж (количество штук)
— тип изделия и ткань
— способ нанесения (принт, вышивка, термотрансфер)
— наличие макета / логотипа

Подготовим стоимость в течение нескольких часов. Пришлите детали — ответим оперативно!`,
};

// ── Нормализация ──────────────────────────────────────────────────────────────
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?:;«»"'()\-—…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Извлечение ключевых слов ──────────────────────────────────────────────────
function extractKeywords(text) {
  const words = normalizeText(text)
    .split(' ')
    .map(w => w.replace(/[^Ѐ-ӿa-zё0-9]/gi, ''))
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
  return [...new Set(words)];
}

// ── Расширение синонимами (включая упрощённое восстановление формы) ───────────
function getSynonyms(word) {
  if (SYNONYMS[word]) return SYNONYMS[word];

  // Пробуем распространённые падежные окончания → базовая форма
  const tryBases = [];
  if (/[ую]$/.test(word) && word.length > 4)
    tryBases.push(word.replace(/у$/, 'а').replace(/ю$/, 'я'), word.slice(0, -1));
  if (/ой$/.test(word) && word.length > 4)
    tryBases.push(word.slice(0, -2) + 'а');
  if (/ей$/.test(word) && word.length > 4)
    tryBases.push(word.slice(0, -2) + 'я', word.slice(0, -2) + 'а');
  if (/[ыи]$/.test(word) && word.length > 4)
    tryBases.push(word.slice(0, -1) + 'а', word.slice(0, -1) + 'я');
  if (/ами$/.test(word) && word.length > 5)
    tryBases.push(word.slice(0, -3) + 'а');
  if (/ях$/.test(word) && word.length > 4)
    tryBases.push(word.slice(0, -2) + 'я');
  if (/ах$/.test(word) && word.length > 4)
    tryBases.push(word.slice(0, -2) + 'а');
  if (/ем$/.test(word) && word.length > 4)
    tryBases.push(word.slice(0, -2));
  if (/ом$/.test(word) && word.length > 4)
    tryBases.push(word.slice(0, -2) + 'а', word.slice(0, -2));
  if (/ия$/.test(word) && word.length > 4)
    tryBases.push(word.slice(0, -2) + 'ие');

  for (const base of tryBases) {
    if (SYNONYMS[base]) return SYNONYMS[base];
  }
  return [];
}

// ── Построение обогащённого запроса для backend ───────────────────────────────
function buildEnrichedQuery(msg) {
  const kws      = extractKeywords(msg);
  const expanded = new Set(kws);
  kws.forEach(w => getSynonyms(w).forEach(s => expanded.add(s)));
  // ключевые слова + синонимы впереди, оригинал позади (Fuse весит title/keywords выше)
  return [...expanded, normalizeText(msg)].join(' ');
}

// ── Клиентский поиск в уже загруженных скриптах (fallback / дополнение) ───────
function clientSideScriptSearch(kws) {
  if (!kws.length || !S.scripts.length) return [];
  const expanded = new Set(kws);
  kws.forEach(w => getSynonyms(w).forEach(s => expanded.add(s)));
  const terms = [...expanded];

  return S.scripts
    .map(sc => {
      const haystack = [
        sc.title    || '',
        sc.text     || '',
        (sc.keywords || []).join(' '),
        (sc.tags     || []).join(' '),
        sc.category  || '',
      ].join(' ').toLowerCase();

      const score = terms.reduce((n, t) => n + (haystack.includes(t) ? 1 : 0), 0);
      return { sc, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(r => r.sc);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════════════════
const S = {
  suppliers     : [],
  supCats       : [],
  supCatFilter  : 'all',
  supRendered   : [],   // currently visible suppliers (for modal)
  pricelist     : [],   // Часто считаем

  scripts       : [],
  scriptCats    : [],
  scriptCatFilter: 'all',

  knowledge     : [],

  activeTab     : 'suppliers',
};

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupRefresh();
  await Promise.all([
    loadStatus(),
    loadSuppliers(),
    loadPricelist(),
    loadScriptCats(),
    loadKnowledge(),
  ]);
  // load scripts after categories
  await renderScripts();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════════════════════════════════════
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      S.activeTab = tab;
    });
  });

  // analyze quick chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('analyze-input').value = chip.dataset.q;
      doAnalyze();
    });
  });

  document.getElementById('btn-analyze').addEventListener('click', doAnalyze);
  document.getElementById('analyze-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doAnalyze();
  });

  // live search debounce
  debounceInput('sup-search', filterSuppliers, 220);
  debounceInput('kb-search',  filterKnowledge, 280);
  debounceInput('sc-search',  filterScriptsByText, 220);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STATUS
// ═══════════════════════════════════════════════════════════════════════════════
async function loadStatus() {
  try {
    const data = await api('/api/status');
    const wrap = document.getElementById('status-wrap');
    wrap.innerHTML = `
      <div class="status-dot ok" id="status-dot"></div>
      <span>${data.suppliers} поставщ. · ${data.knowledge} документов · ${data.scripts} скриптов</span>`;
  } catch {
    const wrap = document.getElementById('status-wrap');
    wrap.innerHTML = '<div class="status-dot" id="status-dot"></div><span style="color:#dc2626">Сервер недоступен</span>';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REFRESH
// ═══════════════════════════════════════════════════════════════════════════════
function setupRefresh() {
  const btn = document.getElementById('btn-refresh');
  btn.addEventListener('click', async () => {
    btn.classList.add('spin');
    btn.disabled = true;
    try {
      const res = await api('/api/refresh', { method: 'POST' });
      showToast(res.message, 'success');
      await Promise.all([loadStatus(), loadSuppliers(), loadScriptCats(), loadKnowledge()]);
      await renderScripts();
    } catch (e) {
      showToast('Ошибка обновления: ' + e.message, 'error');
    } finally {
      btn.classList.remove('spin');
      btn.disabled = false;
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SUPPLIERS
// ═══════════════════════════════════════════════════════════════════════════════
async function loadSuppliers() {
  try {
    const [suppliers, cats] = await Promise.all([
      api('/api/suppliers'),
      api('/api/suppliers/categories'),
    ]);
    S.suppliers = suppliers;
    S.supCats   = cats;
    renderCatPills();
    renderSuppliers(S.suppliers);
  } catch (e) {
    document.getElementById('sup-grid').innerHTML = errBox('Ошибка загрузки поставщиков: ' + e.message);
  }
}

async function loadPricelist() {
  try {
    S.pricelist = await api('/api/pricelist');
    renderPricelist(S.pricelist);
  } catch (e) {
    document.getElementById('pricelist-grid').innerHTML = errBox('Ошибка загрузки: ' + e.message);
  }
}

function renderPricelist(list) {
  const grid = document.getElementById('pricelist-grid');
  if (!list.length) { grid.innerHTML = ''; return; }

  // Форматирование поставщика: URL → ссылка, @handle → Telegram, иначе текст
  function fmtSupplier(s) {
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) {
      const short = s.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
      return `<a class="pl-link" href="${esc(s)}" target="_blank" rel="noopener">🌐 ${esc(short)}</a>`;
    }
    if (/^@/.test(s)) {
      return `<a class="pl-link" href="https://t.me/${esc(s.slice(1))}" target="_blank" rel="noopener">💬 ${esc(s)}</a>`;
    }
    if (/^\d[\d\s\-+()]{6,}$/.test(s)) {
      return `<a class="pl-link" href="tel:${esc(s.replace(/\s/g,''))}">📞 ${esc(s)}</a>`;
    }
    return `<span class="pl-contact">👤 ${esc(s)}</span>`;
  }

  // Форматирование ценовых тиров
  function fmtTiers(tiers) {
    return tiers.filter(t => t.qty || t.price).map(t => {
      const q = t.qty   ? `<span class="pl-qty">${esc(t.qty)} шт</span>` : '';
      const p = t.price ? `<span class="pl-price">${esc(t.price)} р/шт</span>` : '';
      return `<span class="pl-tier">${q}${q && p ? ' → ' : ''}${p}</span>`;
    }).join('');
  }

  grid.innerHTML = list.map(item => {
    const tiersHtml   = fmtTiers(item.tiers);
    const supHtml     = fmtSupplier(item.supplier);
    const timingHtml  = item.timing   ? `<div class="pl-timing">⏱ ${esc(item.timing.split('\n')[0])}</div>` : '';
    const commentHtml = item.comments ? `<div class="pl-comment">${esc(item.comments.substring(0, 120))}${item.comments.length > 120 ? '…' : ''}</div>` : '';
    const printHtml   = item.print    ? `<div class="pl-print">🖨 Нанесение: ${esc(item.print)}</div>` : '';

    // Текст для копирования в КП
    const copyLines = [item.name];
    item.tiers.filter(t => t.qty || t.price).forEach(t => {
      copyLines.push(`  ${t.qty ? t.qty + ' шт' : ''}${t.qty && t.price ? ' → ' : ''}${t.price ? t.price + ' р/шт' : ''}`);
    });
    if (item.timing) copyLines.push(`Сроки: ${item.timing.split('\n')[0]}`);
    if (item.comments) copyLines.push(item.comments);
    const copyText = copyLines.join('\n');

    return `<div class="pl-card">
      <div class="pl-head">
        ${item.category ? `<span class="pl-cat">${esc(item.category)}</span>` : ''}
        <button class="pl-copy-btn" onclick="copyText(${JSON.stringify(copyText)}, this)" title="Скопировать для КП">📋 В КП</button>
      </div>
      <div class="pl-name">${esc(item.name)}</div>
      ${supHtml ? `<div class="pl-supplier">${supHtml}</div>` : ''}
      ${tiersHtml ? `<div class="pl-tiers">${tiersHtml}</div>` : ''}
      ${printHtml}
      ${timingHtml}
      ${commentHtml}
    </div>`;
  }).join('');
}

async function filterSuppliers() {
  const q   = document.getElementById('sup-search').value.trim();
  const url = new URL('/api/suppliers', location.href);
  if (q)                          url.searchParams.set('q', q);
  if (S.supCatFilter !== 'all')   url.searchParams.set('category', S.supCatFilter);

  try {
    const [supData, plData] = await Promise.all([
      fetch(url).then(r => r.json()),
      api(`/api/pricelist${q ? '?q=' + encodeURIComponent(q) : ''}`),
    ]);
    renderSuppliers(supData);
    renderPricelist(plData);
  } catch { /* ignore */ }
}

function renderCatPills() {
  const el   = document.getElementById('cat-pills');
  const cats = ['all', ...S.supCats];
  el.innerHTML = cats.map(c => {
    const label = c === 'all' ? 'Все' : c;
    const count = c === 'all' ? S.suppliers.length : S.suppliers.filter(s => s['Категория'] === c).length;
    return `<button class="pill ${c === S.supCatFilter ? 'active' : ''}" onclick="setCatFilter('${esc(c)}')">${label}<span class="pill-count">${count}</span></button>`;
  }).join('');
}

function setCatFilter(cat) {
  S.supCatFilter = cat;
  renderCatPills();
  filterSuppliers();
}

function renderSuppliers(list) {
  S.supRendered = list;
  const stats = document.getElementById('sup-stats');
  const grid  = document.getElementById('sup-grid');

  stats.innerHTML = `<b>${list.length}</b> поставщиков`;

  if (!list.length) {
    grid.innerHTML = '<div class="no-results"><svg width="40" height="40" fill="none" stroke="#ccc" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Ничего не найдено</div>';
    return;
  }

  grid.innerHTML = list.map((s, i) => {
    const name  = s['Название']            || '—';
    const cat   = s['Категория']           || '';
    const notes = s['Услуги / Примечание'] || '';
    const star  = s['⭐']                  || '';
    const url   = s['Сайт']               || '';
    const tel   = s['Телефон']            || '';
    const email = s['Email']              || '';
    const tg    = s['Telegram/VK']        || '';

    const catCls = 'cat-' + cat.toLowerCase().replace(/\s+/g, '');

    return `<div class="sup-card" onclick="openSupModal(${i})">
      <div class="sup-head">
        <span class="sup-name">${esc(name)}</span>
        <span class="sup-cat ${catCls}">${esc(cat)}</span>
      </div>
      ${star ? `<div class="sup-star">⭐ ${esc(star.replace('⭐','').trim())}</div>` : ''}
      <div class="sup-notes">${esc(notes)}</div>
      <div class="sup-links">
        ${url   ? `<a class="sup-link" href="${esc(url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🌐 Сайт</a>` : ''}
        ${tel   ? `<a class="sup-link" href="tel:${esc(tel.replace(/\s/g,''))}" onclick="event.stopPropagation()">📞 ${esc(tel)}</a>` : ''}
        ${email ? `<a class="sup-link" href="mailto:${esc(email)}" onclick="event.stopPropagation()">✉️ Email</a>` : ''}
        ${tg    ? `<span class="sup-link">💬 ${esc(tg)}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── Supplier modal ──────────────────────────────────────────────────────────
function openSupModal(idx) {
  const s    = S.supRendered[idx];
  if (!s) return;
  const id   = 'sup_' + (s['Название'] || idx);
  const note = loadNote(id);

  const cat   = s['Категория']           || '';
  const url   = s['Сайт']               || '';
  const tel   = s['Телефон']            || '';
  const email = s['Email']              || '';
  const tg    = s['Telegram/VK']        || '';
  const notes = s['Услуги / Примечание']|| '';
  const tags  = s['Хештеги']           || '';
  const star  = s['⭐']                  || '';

  document.getElementById('modal-box').innerHTML = `
    <h2>${esc(s['Название'] || '—')}</h2>
    <div class="modal-cat">${esc(cat)}${star ? ' · ' + esc(star) : ''}</div>

    ${notes ? `<div class="modal-field"><label>Услуги</label><div class="val">${esc(notes)}</div></div>` : ''}
    ${url   ? `<div class="modal-field"><label>Сайт</label><div class="val"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></div></div>` : ''}
    ${tel   ? `<div class="modal-field"><label>Телефон</label><div class="val"><a href="tel:${esc(tel.replace(/\s/g,''))}">${esc(tel)}</a></div></div>` : ''}
    ${email ? `<div class="modal-field"><label>Email</label><div class="val"><a href="mailto:${esc(email)}">${esc(email)}</a></div></div>` : ''}
    ${tg    ? `<div class="modal-field"><label>Telegram / VK</label><div class="val">${esc(tg)}</div></div>` : ''}
    ${tags  ? `<div class="modal-field"><label>Теги</label><div class="val" style="font-size:11px;color:var(--muted)">${esc(tags)}</div></div>` : ''}

    <div class="modal-divider"></div>
    <div class="modal-field">
      <label>Заметки (сохраняются локально)</label>
      <textarea class="modal-notes" id="modal-note-area" placeholder="Добавьте заметку…">${esc(note)}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn-primary" onclick="saveModalNote('${esc(id)}')">Сохранить заметку</button>
      <button class="btn-ghost" onclick="closeModal()">Закрыть</button>
    </div>`;

  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
function saveModalNote(id) {
  const txt = document.getElementById('modal-note-area').value;
  saveNote(id, txt);
  showToast('Заметка сохранена');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════════════════════
async function loadKnowledge() {
  try {
    const data = await api('/api/knowledge');
    S.knowledge = data;
    renderKnowledge(data, '');
  } catch (e) {
    document.getElementById('kb-grid').innerHTML = errBox('Ошибка: ' + e.message);
  }
}

async function filterKnowledge() {
  const q = document.getElementById('kb-search').value.trim();
  try {
    const url  = new URL('/api/knowledge', location.href);
    if (q) url.searchParams.set('q', q);
    const data = await fetch(url).then(r => r.json());
    renderKnowledge(data, q);
  } catch { /* ignore */ }
}

function renderKnowledge(list, q) {
  const grid = document.getElementById('kb-grid');
  if (!list.length) {
    grid.innerHTML = '<div class="no-results">Ничего не найдено</div>';
    return;
  }
  grid.innerHTML = list.map(doc => {
    const excerpt = highlightText(esc(doc.excerpt || ''), q);
    return `<div class="kb-card" onclick="openKbModal('${esc(doc.id)}')">
      <div class="kb-title">${esc(doc.title)}</div>
      <div class="kb-excerpt">${excerpt}</div>
      <div class="kb-file">📄 ${esc(doc.file || '')}</div>
    </div>`;
  }).join('');
}

async function openKbModal(id) {
  try {
    const doc = await api('/api/knowledge/' + encodeURIComponent(id));
    document.getElementById('modal-box').innerHTML = `
      <h2>${esc(doc.title)}</h2>
      <div class="modal-cat">📄 ${esc(doc.file)}</div>
      <div class="kb-full">${esc(doc.content)}</div>
      <div class="modal-actions" style="margin-top:14px">
        <button class="btn-primary" onclick="copyText(${JSON.stringify(doc.content)})">Скопировать всё</button>
        <button class="btn-ghost" onclick="closeModal()">Закрыть</button>
      </div>`;
    document.getElementById('modal-overlay').classList.add('open');
  } catch (e) { showToast('Ошибка: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCRIPTS
// ═══════════════════════════════════════════════════════════════════════════════
async function loadScriptCats() {
  try {
    S.scriptCats = await api('/api/scripts/categories');
    renderScriptSidebar();
  } catch { /* ignore */ }
}

function renderScriptSidebar() {
  const el   = document.getElementById('scripts-sidebar');
  const cats = ['all', ...S.scriptCats];
  el.innerHTML = cats.map(c => {
    const label = c === 'all' ? '📋 Все скрипты' : catEmoji(c) + ' ' + c;
    return `<button class="sc-cat-btn ${c === S.scriptCatFilter ? 'active' : ''}" onclick="setScriptCat('${esc(c)}')">${label}</button>`;
  }).join('');
}

function catEmoji(cat) {
  const map = { 'FAQ':'❓', 'Возражения':'🛡', 'Продажи':'💼', 'Дожим':'🔄', 'Телефон':'📞', 'Выгоды':'⭐', 'Холодные рассылки':'❄️' };
  return map[cat] || '📝';
}

async function setScriptCat(cat) {
  S.scriptCatFilter = cat;
  renderScriptSidebar();
  await renderScripts();
}

async function renderScripts() {
  const url = new URL('/api/scripts', location.href);
  if (S.scriptCatFilter !== 'all') url.searchParams.set('category', S.scriptCatFilter);

  const q = document.getElementById('sc-search')?.value.trim();
  if (q) url.searchParams.set('q', q);

  try {
    const data = await fetch(url).then(r => r.json());
    S.scripts = data;
    renderScriptCards(data);
  } catch (e) {
    document.getElementById('scripts-list').innerHTML = errBox(e.message);
  }
}

async function filterScriptsByText() { await renderScripts(); }

function renderScriptCards(list) {
  const el = document.getElementById('scripts-list');

  if (!list.length) {
    el.innerHTML = '<div class="no-results">Скрипты не найдены</div>';
    return;
  }

  el.innerHTML = list.map((s, i) => {
    const badgeCls = 'badge-' + (s.category || '').replace(/\s/g, '\\ ');
    const displayText = s.text || '';
    return `<div class="sc-card" id="sc-${i}">
      <div class="sc-head" onclick="toggleScript(${i})">
        <span class="sc-title">${esc(s.title || '')}</span>
        <span class="sc-cat-badge ${badgeCls}">${esc(s.category || '')}</span>
        <svg class="sc-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
        <button class="sc-copy-btn" onclick="event.stopPropagation(); copyScript(this, ${i})" title="Скопировать">Копировать</button>
      </div>
      <div class="sc-body">
        <div class="sc-text" id="sc-text-${i}">${renderScriptText(displayText)}</div>
        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn-primary" style="font-size:12px;padding:6px 16px" onclick="copyScript(this, ${i})">Скопировать текст</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderScriptText(text) {
  // highlight [placeholders] in accent colour
  return esc(text).replace(/\[([^\]]+)\]/g, '<span class="ph">[$1]</span>');
}

function toggleScript(i) {
  const card = document.getElementById('sc-' + i);
  if (card) card.classList.toggle('open');
}

function copyScript(btn, i) {
  const script = S.scripts[i];
  if (!script) return;
  copyText(script.text, btn);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ANALYZE — «Клиент пишет»
// ═══════════════════════════════════════════════════════════════════════════════
async function doAnalyze() {
  const input = document.getElementById('analyze-input');
  const msg   = input.value.trim();
  if (!msg) return;

  const btn = document.getElementById('btn-analyze');
  btn.disabled = true;
  btn.textContent = 'Анализирую…';

  const resultsEl = document.getElementById('analyze-results');
  resultsEl.innerHTML = '<div class="no-results" style="padding:20px 0">⟳ Ищем подходящие скрипты…</div>';

  try {
    // 1. Нормализуем + расширяем синонимами перед отправкой на backend
    const keywords     = extractKeywords(msg);
    const enrichedMsg  = buildEnrichedQuery(msg);

    // 2. Backend-поиск с обогащённым запросом
    const data = await api('/api/analyze', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ message: enrichedMsg }),
    });

    // 3. Клиентский поиск по синонимам — дополняет, не заменяет backend
    const clientHits    = clientSideScriptSearch(keywords);
    const backendIds    = new Set(data.scripts.map(s => s.id || s.title));
    const extraScripts  = clientHits.filter(s => !backendIds.has(s.id || s.title));
    const mergedScripts = [...data.scripts, ...extraScripts].slice(0, 6);

    // 4. Рендеrim с объединёнными результатами
    renderAnalyzeResults({ ...data, scripts: mergedScripts }, msg);
  } catch (e) {
    resultsEl.innerHTML = errBox('Ошибка: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg> Найти ответ';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INTENT DETECTION — определение типа запроса
// ═══════════════════════════════════════════════════════════════════════════════

// Правила определения намерения (стемы — первые 5-6 букв для охвата падежей)
const INTENT_RULES = [
  { type: 'price',       stems: ['дорог','дешев','цен','скидк','бюджет','переплат','стоимост','ценник','прайс'] },
  { type: 'timing',      stems: ['долго','срок','дедлайн','успеет','быстр','срочн','ждать','когда'] },
  { type: 'design',      stems: ['макет','дизайн','логотип','принт','нанесен','печат','вышивк','надпис','файл'] },
  { type: 'competitor',  stems: ['поставщик','другой','других','конкурент','уже заказ'] },
  { type: 'delay',       stems: ['думает','думаем','посовещ','согласов','подумаем','руководств','директор','начальник'] },
  { type: 'calculation', stems: ['расчет','рассчит','сколько','коммерческ','посчитай','предложен','кп'] },
  { type: 'product',     stems: ['футболк','шортк','шорт','худи','кофт','толстовк','майк','куртк','жилет','шапк','кепк','носк','брюк','одежд','мерч','сувенир','изделий','изделие','бланк','поло','свитшот','лонгслив','ткань','ткани'] },
];

// Теги для каждого скрипта (ключ: «Категория|Заголовок»)
const SCRIPT_TAGS = {
  'Возражения|Дорого'                                        : ['price'],
  'Возражения|У других дешевле'                              : ['price'],
  'Возражения|Думаем / надо посовещаться'                    : ['delay'],
  'Возражения|Уже есть поставщик'                            : ['competitor'],
  'Возражения|Нет макета / не знаем дизайн'                  : ['design'],
  'Возражения|Долго ждать / нет времени'                     : ['timing'],
  'Возражения|Нет бюджета сейчас'                            : ['price'],
  'Возражения|Нужно согласовать с руководством'              : ['delay'],
  'Возражения|Не знаем тираж'                                : ['brief', 'calculation'],
  'Продажи|Первое касание — неполный запрос'                 : ['brief'],
  'Продажи|Клиент спрашивает только цену'                    : ['price', 'calculation'],
  'Продажи|Клиент не знает чего хочет'                       : ['brief'],
  'Продажи|Клиент спрашивает минимальный тираж'              : ['calculation'],
  'Продажи|Клиент просит каталог'                            : ['brief'],
  'Продажи|Клиент хочет нестандартное / необычное'           : ['product'],
  'Продажи|КП — Шаблон стандартный (WhatsApp / Telegram)'   : ['calculation'],
  'Продажи|КП — Email официальный'                           : ['calculation'],
  'Продажи|КП — Постоянный клиент'                           : ['calculation'],
  'Продажи|Сбор брифа — вопросы клиенту'                    : ['brief', 'product'],
  'FAQ|Минимальный тираж'                                    : ['calculation', 'brief'],
  'FAQ|Сроки производства'                                   : ['timing'],
  'FAQ|Виды нанесения — чем отличаются'                      : ['design', 'product'],
  'FAQ|Ткани — какие плотности и чем отличаются'             : ['product'],
  'FAQ|Производство в Китае — что можно привезти'            : ['product'],
  'FAQ|Есть ли у вас каталог'                                : ['brief'],
  'FAQ|Что нужно для оформления заказа'                      : ['brief', 'calculation'],
  'Дожим|Вместо «жду вашего ответа» — тизер'                : ['followup'],
  'Дожим|Клиент пропал после КП (1–2 дня)'                  : ['followup'],
  'Дожим|Клиент пропал (3–5 дней)'                           : ['followup'],
  'Дожим|Застрял на согласовании внутри компании'            : ['delay', 'followup'],
  'Дожим|2–3 касания без ответа — финальный'                 : ['followup'],
  'Дожим|Страх сложного / большого проекта'                  : ['brief', 'followup'],
  'Дожим|Дедлайн горит — срочный дожим'                     : ['timing', 'followup'],
  'Выгоды|Фиксация цены'                                     : ['price'],
  'Выгоды|Всегда 3 варианта под разный бюджет'               : ['price', 'calculation'],
  'Выгоды|Минимальный тираж от 10 шт'                        : ['calculation', 'product'],
  'Выгоды|Сувенирные позиции за 10 дней'                     : ['timing', 'product'],
};

// Возвращает массив {type, hits}, отсортированный по количеству совпадений
function detectIntents(keywords) {
  return INTENT_RULES
    .map(rule => {
      const hits = keywords.reduce((n, kw) => {
        const match = rule.stems.some(stem =>
          kw.startsWith(stem) || stem.startsWith(kw.slice(0, 5))
        );
        return n + (match ? 1 : 0);
      }, 0);
      return { type: rule.type, hits };
    })
    .filter(r => r.hits > 0)
    .sort((a, b) => b.hits - a.hits);
}

// Читает теги скрипта из таблицы SCRIPT_TAGS
function getScriptTags(script) {
  const key = `${script.category || ''}|${script.title || ''}`;
  return SCRIPT_TAGS[key] || ['brief'];
}

// Считает релевантность скрипта: тег + keywords в title/text + бонус за краткость
function scoreScript(script, intents, keywords) {
  const tags  = getScriptTags(script);
  let score = 0;

  // Совпадение тегов: первичный intent = 10 очков, вторичный = 5
  intents.forEach(({ type, hits }, rank) => {
    if (tags.includes(type)) score += hits * (rank === 0 ? 10 : 5);
  });

  // Если ни один intent не определён — бонус за 'brief'
  if (!intents.length && tags.includes('brief')) score += 5;

  // Ключевые слова в заголовке (сильный сигнал)
  const titleLo = (script.title || '').toLowerCase();
  keywords.forEach(kw => { if (titleLo.includes(kw)) score += 4; });

  // Ключевые слова в тексте (слабый сигнал)
  const textLo = (script.text || '').toLowerCase();
  keywords.forEach(kw => { if (textLo.includes(kw)) score += 1; });

  // Бонус за краткость — только для многострочных ответов (≥2 строк).
  // Односторочники-«выгоды» получают штраф: они не подходят как самостоятельный ответ.
  const nonEmptyLines = (script.text || '').split('\n').filter(l => l.trim()).length;
  const len = (script.text || '').length;
  if (nonEmptyLines < 2)  score -= 3; // однострочный — не полный ответ
  else if (len < 250)     score += 2; // короткий чёткий ответ
  else if (len < 400)     score += 1; // средний

  return score;
}

// ─── Карта изделий: стемы → отображаемое название + формы склонения ─────────
// acc1  — вин. пад. ед.ч.   (1 штука):   «1 футболку»
// gen2  — род. пад. ед.ч.   (2-4 штуки): «3 футболки»
// gen5  — род. пад. мн.ч.   (5+ штук):   «10 футболок»
// Для pluralia tantum (шорты, носки, брюки) — форма «N пар X».
// display — именительный мн.ч. (резервный вариант без числа).
const PRODUCT_MAP = [
  { stems: ['футболк','футбол'],    display: 'футболки',  acc1: 'футболку',   gen2: 'футболки',   gen5: 'футболок'   },
  { stems: ['шорт'],               display: 'шорты',     acc1: 'пару шорт',   gen2: 'пары шорт',   gen5: 'пар шорт'   },
  { stems: ['худи'],               display: 'худи',      acc1: 'худи',        gen2: 'худи',        gen5: 'худи'        },
  { stems: ['кофт'],               display: 'кофты',     acc1: 'кофту',       gen2: 'кофты',       gen5: 'кофт'        },
  { stems: ['толстовк','толстово'],display: 'толстовки', acc1: 'толстовку',   gen2: 'толстовки',   gen5: 'толстовок'  },
  { stems: ['свитшот'],            display: 'свитшоты',  acc1: 'свитшот',     gen2: 'свитшота',    gen5: 'свитшотов'  },
  { stems: ['лонгслив'],           display: 'лонгсливы', acc1: 'лонгслив',    gen2: 'лонгслива',   gen5: 'лонгсливов' },
  { stems: ['майк'],               display: 'майки',     acc1: 'майку',       gen2: 'майки',       gen5: 'маек'        },
  { stems: ['поло'],               display: 'поло',      acc1: 'поло',        gen2: 'поло',        gen5: 'поло'        },
  { stems: ['куртк','курток'],     display: 'куртки',    acc1: 'куртку',      gen2: 'куртки',      gen5: 'курток'      },
  { stems: ['жилет'],              display: 'жилеты',    acc1: 'жилет',       gen2: 'жилета',      gen5: 'жилетов'    },
  { stems: ['бомбер'],             display: 'бомберы',   acc1: 'бомбер',      gen2: 'бомбера',     gen5: 'бомберов'   },
  { stems: ['ветровк'],            display: 'ветровки',  acc1: 'ветровку',    gen2: 'ветровки',    gen5: 'ветровок'   },
  { stems: ['шапк'],               display: 'шапки',     acc1: 'шапку',       gen2: 'шапки',       gen5: 'шапок'       },
  { stems: ['кепк','бейсболк'],    display: 'кепки',     acc1: 'кепку',       gen2: 'кепки',       gen5: 'кепок'       },
  { stems: ['носк'],               display: 'носки',     acc1: 'пару носков', gen2: 'пары носков', gen5: 'носков'      },
  { stems: ['брюк','штан'],        display: 'брюки',     acc1: 'пару брюк',   gen2: 'пары брюк',   gen5: 'пар брюк'   },
  { stems: ['сумк'],               display: 'сумки',     acc1: 'сумку',       gen2: 'сумки',       gen5: 'сумок'       },
  { stems: ['рюкзак'],             display: 'рюкзаки',   acc1: 'рюкзак',      gen2: 'рюкзака',     gen5: 'рюкзаков'   },
  { stems: ['кружк','круж'],       display: 'кружки',    acc1: 'кружку',      gen2: 'кружки',      gen5: 'кружек'      },
  { stems: ['блокнот'],            display: 'блокноты',  acc1: 'блокнот',     gen2: 'блокнота',    gen5: 'блокнотов'  },
  { stems: ['ручк'],               display: 'ручки',     acc1: 'ручку',       gen2: 'ручки',       gen5: 'ручек'       },
  { stems: ['бейдж'],              display: 'бейджи',    acc1: 'бейдж',       gen2: 'бейджа',      gen5: 'бейджей'    },
  { stems: ['пакет'],              display: 'пакеты',    acc1: 'пакет',       gen2: 'пакета',      gen5: 'пакетов'    },
  { stems: ['мерч'],               display: 'мерч',      acc1: 'мерч',        gen2: 'мерча',       gen5: 'мерча'       },
  { stems: ['сувенир'],            display: 'сувениры',  acc1: 'сувенир',     gen2: 'сувенира',    gen5: 'сувениров'  },
  { stems: ['подарк'],             display: 'подарки',   acc1: 'подарок',     gen2: 'подарка',     gen5: 'подарков'   },
];

// ─── Числовое согласование существительных ────────────────────────────────────
// ruNumForm(n, acc1, gen2, gen5):
//   1 / 21 / 101 → acc1  («1 футболку»)
//   2-4 / 22-24  → gen2  («3 футболки»)
//   5-20 / 25+   → gen5  («10 футболок»)
function ruNumForm(n, acc1, gen2, gen5) {
  const abs    = Math.abs(parseInt(n, 10)) || 0;
  const mod100 = abs % 100;
  const mod10  = abs % 10;
  if (mod100 >= 11 && mod100 <= 19) return gen5;
  if (mod10 === 1)                   return acc1;
  if (mod10 >= 2 && mod10 <= 4)     return gen2;
  return gen5;
}

// ─── Склонение изделия с учётом тиража ───────────────────────────────────────
// formatProduct(quantity, product):
//   quantity — строка или число (может быть undefined)
//   product  — display-значение из PRODUCT_MAP (может быть undefined)
// Примеры: 1→'футболку', 3→'футболки', 10→'футболок',
//          100→'носков', 50→'пар шорт'
function formatProduct(quantity, product) {
  const found = product ? PRODUCT_MAP.find(p => p.display === product) : null;
  if (!found)    return product || 'такие изделия';
  if (!quantity) return found.display;
  return ruNumForm(quantity, found.acc1, found.gen2, found.gen5);
}

// ─── Шаг 1: извлечение параметров из текста клиента ──────────────────────────
function extractParams(msg) {
  const lower = normalizeText(msg);
  const params = {};

  // Изделие — первое совпадение по стемам
  for (const p of PRODUCT_MAP) {
    if (p.stems.some(stem => lower.includes(stem))) {
      params.product = p.display;
      break;
    }
  }

  // Тираж — первое число в тексте
  const qtyMatch = lower.match(/\b(\d+)\b/);
  if (qtyMatch) params.quantity = qtyMatch[1];

  // Нанесение — определяем тип и формулируем как дополнение к изделию
  const printMap = [
    { words: ['логотип','лого','логотипом'],                 phrase: 'с логотипом'   },
    { words: ['вышивк','вышивкой'],                          phrase: 'с вышивкой'    },
    { words: ['принт','принтом'],                            phrase: 'с принтом'     },
    { words: ['надпис','надписью'],                          phrase: 'с надписью'    },
    { words: ['нанесени','нанесением','печат','печатью'],    phrase: 'с нанесением'  },
    { words: ['эмблем','эмблемой'],                          phrase: 'с эмблемой'    },
  ];
  for (const { words, phrase } of printMap) {
    if (words.some(w => lower.includes(w))) { params.print = phrase; break; }
  }

  // Срочность
  params.urgent = /срочн|быстр|дедлайн|asap|горит/.test(lower);

  return params;
}

// ─── Вспомогательные функции для генерации ───────────────────────────────────

// Рекомендует способ нанесения исходя из тиража
function suggestPrintMethod(qty) {
  const n = parseInt(qty, 10) || 0;
  if (n > 0 && n <= 30) return 'DTF-печать или термоперенос';
  if (n <= 100)          return 'шелкографию';
  return 'шелкографию или вышивку';
}

// Изделия, для которых нужно спрашивать размерный ряд
const CLOTHING_PRODUCTS = new Set([
  'футболки','шорты','худи','кофты','толстовки','свитшоты','лонгсливы',
  'майки','поло','куртки','жилеты','бомберы','ветровки','шапки','кепки',
  'носки','брюки',
]);
function isClothingProduct(product) { return CLOTHING_PRODUCTS.has(product); }

// ─── Шаг 2: генерация ответа по структуре продаж ────────────────────────────
// [1] Подтверждение → [2] Экспертность → [3] Бриф → [4] Следующий шаг
// Вопросы адаптируются: не спрашиваем то, что уже известно из запроса.
// Возвращает строку или null если нет ни продукта, ни тиража.
function buildGeneratedAnswer(params) {
  const { product, quantity, print, urgent } = params;

  if (!product && !quantity) return null;

  // [1] Подтверждение — подтверждаем запрос со склонением
  const productText = formatProduct(quantity, product);
  const confirmLine = quantity
    ? `Да, можем изготовить ${quantity} ${productText} 👍`
    : `Да, можем изготовить ${productText} 👍`;

  // [2] Экспертный комментарий — рекомендуем нанесение под тираж
  let expertLine = '';
  if (quantity && !print) {
    const method = suggestPrintMethod(quantity);
    expertLine = `Для такого тиража обычно используем ${method} — оптимально по качеству и цене.`;
  } else if (print) {
    expertLine = `Подберем лучший вариант ${print} под ваш тираж.`;
  }

  // [3] Адаптивный бриф — только то, чего ещё не знаем
  // Цвет: род. пад. мн.ч. без «пар» («футболок», «шорт»)
  const found     = product ? PRODUCT_MAP.find(p => p.display === product) : null;
  const colorForm = found
    ? (found.gen5 || found.display).replace(/^пар\s+/, '')
    : 'изделий';

  const questions = [
    print ? '— есть ли готовый файл макета' : '— есть ли готовый макет логотипа',
    `— какой цвет ${colorForm} нужен`,
    urgent ? '— к какой дате нужен заказ (понимаем, что срочно)' : '— к какой дате нужен заказ',
  ];
  if (isClothingProduct(product)) {
    questions.push('— нужен ли размерный ряд');
  }

  // [4] Перевод на следующий шаг
  const nextStep = 'После этого подготовлю расчет и варианты.';

  // Собираем: экспертный блок добавляем только если он есть
  const parts = [confirmLine];
  if (expertLine) parts.push('', expertLine);
  parts.push('', 'Чтобы быстро подготовить расчет, уточните:', '', ...questions, '', nextStep);
  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INTENT CLASSIFICATION — определение типа сообщения клиента
// ═══════════════════════════════════════════════════════════════════════════════

// Перечисление типов намерений
const INTENT = {
  ORDER_REQUEST:        'ORDER_REQUEST',        // хочу заказать / как оформить
  PRODUCT_REQUEST:      'PRODUCT_REQUEST',       // число + изделие
  PRICE_QUESTION:       'PRICE_QUESTION',        // сколько стоит / какая цена
  OBJECTION_PRICE:      'OBJECTION_PRICE',       // дорого / хотим дешевле
  OBJECTION_COMPETITOR: 'OBJECTION_COMPETITOR',  // у других дешевле / есть поставщик
  CLIENT_THINKING:      'CLIENT_THINKING',       // подумаем / надо обсудить
  INFO_REQUEST:         'INFO_REQUEST',          // что вы делаете / какие изделия
  UNKNOWN:              'UNKNOWN',               // не распознано
};

// Шаблон ответа на запрос оформления заказа
const ORDER_REQUEST_TEMPLATE = [
  'Да, конечно 👍',
  '',
  'Подскажите, пожалуйста:',
  '— какое изделие нужно',
  '— примерный тираж',
  '— есть ли готовый макет',
  '',
  'После этого подготовим расчет и сроки производства.',
].join('\n');

// ─── Классификатор намерения ──────────────────────────────────────────────────
// Возвращает ровно один INTENT-тип (не массив).
// Приоритет: PRODUCT_REQUEST > ORDER > COMPETITOR > OBJECTION_PRICE >
//            CLIENT_THINKING > PRICE_QUESTION > INFO_REQUEST > UNKNOWN
function detectIntent(text) {
  const lo = normalizeText(text);

  // PRODUCT_REQUEST — проверяем ПЕРВЫМ: конкретное изделие + тираж имеют приоритет
  // над любым другим намерением, включая ORDER_REQUEST.
  // «оформить заказ на 100 рубашек» → PRODUCT_REQUEST, а не ORDER_REQUEST.
  const params = extractParams(text);
  if (params.product && params.quantity) {
    return INTENT.PRODUCT_REQUEST;
  }

  // ORDER_REQUEST — явное намерение оформить заказ (без конкретики)
  if (/можно сделать заказ|хочу заказать|хотим заказать|как сделать заказ|оформить заказ/.test(lo)) {
    return INTENT.ORDER_REQUEST;
  }

  // OBJECTION_COMPETITOR — проверяем ДО price, чтобы «у других дешевле» не попало в price
  if (/у других дешевле|есть поставщик|уже работаем с/.test(lo)) {
    return INTENT.OBJECTION_COMPETITOR;
  }

  // OBJECTION_PRICE
  if (/слишком дорого|хотим дешевле|\bдорого\b/.test(lo)) {
    return INTENT.OBJECTION_PRICE;
  }

  // CLIENT_THINKING
  if (/подумаем|надо обсудить|посоветуемся|посовещаемся|надо посовещ/.test(lo)) {
    return INTENT.CLIENT_THINKING;
  }

  // PRICE_QUESTION — спрашивает цену без возражения
  if (/сколько стоит|какая цена|\bцена\b|\bцены\b|\bпрайс\b/.test(lo)) {
    return INTENT.PRICE_QUESTION;
  }

  // INFO_REQUEST — общий вопрос о компании / ассортименте
  if (/что вы делаете|какие изделия|что можете|что производите|чем занимаетесь/.test(lo)) {
    return INTENT.INFO_REQUEST;
  }

  return INTENT.UNKNOWN;
}

// ─── Вспомогательные функции для работы со скриптами ─────────────────────────

// Возвращает первый смысловой абзац из текста скрипта (до первой пустой строки,
// не более 7 строк), иначе — первые 5 непустых строк.
function extractScriptParagraph(text) {
  const lines    = (text || '').split('\n').map(l => l.trim());
  const breakIdx = lines.findIndex((l, i) => i > 1 && l === '');
  if (breakIdx > 0 && breakIdx <= 7) {
    return lines.slice(0, breakIdx).filter(l => l).join('\n');
  }
  return lines.filter(l => l).slice(0, 5).join('\n');
}

// Находит первый скрипт из массива, который имеет указанный тег
function findScriptByTag(scripts, tag) {
  return scripts.find(s => getScriptTags(s).includes(tag)) || null;
}

// ── Главная функция: intent → стратегия ответа ───────────────────────────────
//
// Приоритет стратегий:
//   1. ORDER_REQUEST        → статичный шаблон заказа
//   2. PRODUCT_REQUEST      → buildGeneratedAnswer() со склонением
//   3. OBJECTION / THINKING → лучший скрипт по тегу intent-а
//   4. PRICE_QUESTION       → скрипт с тегом 'price'
//   5. INFO / UNKNOWN       → scoring fallback (существующая система)
function buildCompositeAnswer(scripts, originalMsg) {
  const msg    = originalMsg || '';
  const intent = detectIntent(msg);

  // ── 1. ORDER_REQUEST — клиент хочет оформить заказ ───────────────────────────
  if (intent === INTENT.ORDER_REQUEST) {
    return ORDER_REQUEST_TEMPLATE;
  }

  // ── 2. PRODUCT_REQUEST — конкретное изделие + тираж ──────────────────────────
  if (intent === INTENT.PRODUCT_REQUEST) {
    const generated = buildGeneratedAnswer(extractParams(msg));
    if (generated) return generated;
  }

  // ── 3-4. Возражения, статус «думаем», вопрос о цене → скрипт по тегу ────────
  const INTENT_TO_TAG = {
    [INTENT.OBJECTION_PRICE]:      'price',
    [INTENT.OBJECTION_COMPETITOR]: 'competitor',
    [INTENT.CLIENT_THINKING]:      'delay',
    [INTENT.PRICE_QUESTION]:       'price',
  };

  const tag = INTENT_TO_TAG[intent];
  if (tag && scripts.length) {
    const best = findScriptByTag(scripts, tag);
    if (best) {
      const para = extractScriptParagraph(best.text);
      if (para) return para;
    }
  }

  // ── 5. INFO_REQUEST / UNKNOWN — scoring fallback ──────────────────────────────
  if (!scripts.length) return FALLBACK_RESPONSE.text;

  const keywords = extractKeywords(msg);
  const intents  = detectIntents(keywords);

  const ranked = scripts
    .map(s => ({ s, score: scoreScript(s, intents, keywords) }))
    .sort((a, b) => b.score - a.score);

  let result = extractScriptParagraph(ranked[0].s.text);

  if (result.split('\n').filter(l => l.trim()).length < 2) {
    result += '\n\nДля расчёта уточните: тираж, тип изделия и наличие макета.';
  }

  return result || FALLBACK_RESPONSE.text;
}

// Копирование рекомендованного ответа — читаем текст из DOM, не из атрибута.
// Передача multiline-строки через JSON.stringify в onclick ненадёжна:
// переносы строк и спецсимволы ломают HTML-атрибут.
function copyRecommendedAnswer(btn) {
  const card   = btn.closest('.recommended-card');
  const textEl = card && card.querySelector('.rec-text');
  const text   = textEl ? textEl.innerText.trim() : '';

  if (!text) { showToast('Не удалось скопировать', 'error'); return; }

  navigator.clipboard.writeText(text)
    .then(() => {
      showToast('Скопировано!', 'success');
      const orig = btn.textContent;
      btn.textContent = '✓ Скопировано';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
    })
    .catch(() => showToast('Не удалось скопировать', 'error'));
}

// Возвращает список действий менеджера в зависимости от intent-а
function buildManagerActions(intentType) {
  switch (intentType) {
    case INTENT.PRODUCT_REQUEST:
      return ['📋 Собрать бриф', '💰 Подготовить КП', '📦 Предложить образцы'];
    case INTENT.ORDER_REQUEST:
      return ['📋 Собрать бриф', '💰 Подготовить расчет'];
    case INTENT.OBJECTION_PRICE:
      return ['💡 Предложить альтернативу по бюджету', '📊 Показать варианты расчета'];
    case INTENT.OBJECTION_COMPETITOR:
      return ['🔍 Узнать условия конкурента', '⭐ Показать наши преимущества'];
    case INTENT.CLIENT_THINKING:
      return ['📞 Уточнить причину паузы', '📅 Договориться о следующем контакте'];
    case INTENT.PRICE_QUESTION:
      return ['💰 Подготовить расчет', '📋 Уточнить бриф'];
    default:
      return ['📋 Уточнить запрос клиента', '📋 Собрать бриф'];
  }
}

function renderAnalyzeResults(data, query) {
  const el = document.getElementById('analyze-results');
  const { recommended, scripts, knowledge } = data;
  const hasAny = recommended || scripts.length || knowledge.length;

  // Intent проверяется ДО isFallback — шаблонные ответы (ORDER_REQUEST и др.)
  // должны показываться даже если backend не нашёл ни одного скрипта.
  const allForComposite = recommended
    ? [recommended, ...scripts.filter(s => (s.id||s.title) !== (recommended.id||recommended.title))]
    : scripts;
  const compositeText = buildCompositeAnswer(allForComposite, query);

  // isFallback = true только когда buildCompositeAnswer вернул дефолтный ответ
  // и у backend-а тоже ничего нет — тогда применяем «серую» стилизацию карточки
  const isFallback = !hasAny && compositeText === FALLBACK_RESPONSE.text;

  // Источник для подписи карточки — скрываем для шаблонных ответов по intent
  const intentType   = detectIntent(query);
  const isTemplate   = intentType === INTENT.ORDER_REQUEST ||
                       intentType === INTENT.PRODUCT_REQUEST;
  const sourceScript = isTemplate ? null : (recommended || scripts[0] || null);
  const sourceLabel  = sourceScript
    ? `${sourceScript.category || ''}${sourceScript.title ? ' · ' + sourceScript.title : ''}`
    : '';

  let html = '<div class="analyze-results">';

  // ── Сводка найденного ───────────────────────────────────────────────────────
  const others = scripts
    .filter(s => !recommended || (s.id||s.title) !== (recommended.id||recommended.title))
    .slice(0, 4);

  const found = [];
  if (!isFallback)   found.push('✓ Рекомендованный ответ');
  if (others.length) found.push(`✓ Скрипты (${others.length})`);
  if (knowledge.length) found.push(`✓ Документы (${knowledge.length})`);
  if (found.length) {
    html += `<div class="analyze-summary">Найдено: ${found.join(' · ')}</div>`;
  }

  // ── Блок «Рекомендованный ответ» ───────────────────────────────────────────
  {
    const cardMod  = isFallback ? ' recommended-card--fallback' : '';
    const dotMod   = isFallback ? ' rec-dot--muted' : '';
    const headTitle = isFallback ? '💬 Универсальный ответ' : '✅ Рекомендованный ответ';

    html += `<div class="result-section">
      <div class="recommended-card${cardMod}">

        <div class="rec-header">
          <div class="rec-indicator">
            <span class="rec-dot${dotMod}"></span>
            <span class="rec-title">${headTitle}</span>
            ${sourceLabel && !isFallback
              ? `<span class="rec-source">${esc(sourceLabel)}</span>`
              : ''}
          </div>
          <button class="btn-copy-rec" onclick="copyRecommendedAnswer(this)">
            📋 Скопировать
          </button>
        </div>

        <div class="rec-body">
          <div class="rec-text">${renderScriptText(compositeText)}</div>
        </div>

      </div>
    </div>`;
  }

  // ── Следующее действие менеджера ────────────────────────────────────────────
  if (!isFallback) {
    const actions = buildManagerActions(intentType);
    html += `<div class="manager-actions">
      <div class="manager-actions-title">⚡ Следующее действие менеджера</div>
      <div class="manager-actions-list">
        ${actions.map(a => `<span class="manager-action-item">${esc(a)}</span>`).join('')}
      </div>
    </div>`;
  }

  // ── Похожие скрипты ─────────────────────────────────────────────────────────
  if (others.length) {
    html += `<div class="result-section">
      <h3>📋 Похожие скрипты (${others.length})</h3>
      <div class="mini-scripts">` +
      others.map((s, i) => `
        <div class="sc-card" id="ar-${i}">
          <div class="sc-head" onclick="document.getElementById('ar-${i}').classList.toggle('open')">
            <span class="sc-title">${esc(s.title||'')}</span>
            <span class="sc-cat-badge badge-${(s.category||'').replace(/\s/g,'\\ ')}">${esc(s.category||'')}</span>
            <svg class="sc-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
            <button class="sc-copy-btn" onclick="event.stopPropagation();copyText(${JSON.stringify(s.text||'')},this)">Копировать</button>
          </div>
          <div class="sc-body">
            <div class="sc-text">${renderScriptText(s.text||'')}</div>
          </div>
        </div>`).join('') +
      '</div></div>';
  }

  // ── Из базы знаний ──────────────────────────────────────────────────────────
  if (knowledge.length) {
    html += `<div class="result-section">
      <h3>📚 Из регламентов и базы знаний (${knowledge.length})</h3>
      <div class="mini-kb">` +
      knowledge.map(k => `
        <div class="mini-kb-card">
          <div class="mini-kb-title">${esc(k.title||'')}</div>
          <div class="mini-kb-excerpt">${highlightText(esc(k.excerpt||''), query)}</div>
        </div>`).join('') +
      '</div></div>';
  }

  html += '</div>';
  el.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════════════════════
async function api(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Скопировано!', 'success');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Скопировано ✓';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
    }
  }).catch(() => showToast('Не удалось скопировать', 'error'));
}

function highlightText(escapedText, query) {
  if (!query) return escapedText;
  const words = query.trim().split(/\s+/).filter(w => w.length > 2);
  let result  = escapedText;
  words.forEach(w => {
    const safe = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`(${safe})`, 'gi'), '<mark>$1</mark>');
  });
  return result;
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function errBox(msg) {
  return `<div style="padding:20px;color:var(--danger);font-size:13px">⚠️ ${esc(msg)}</div>`;
}

function debounceInput(id, fn, ms) {
  let timer;
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(fn, ms); });
}

// ── localStorage notes ─────────────────────────────────────────────────────
function saveNote(key, text) { try { localStorage.setItem('note_' + key, text); } catch {} }
function loadNote(key)       { try { return localStorage.getItem('note_' + key) || ''; } catch { return ''; } }

// ── close modal on Escape ──────────────────────────────────────────────────
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
