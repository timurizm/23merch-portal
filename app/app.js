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

// Позиция считается «посчитанной» если хотя бы один тир содержит числовую цену
function hasNumericPrice(item) {
  return item.tiers.some(t => t.price && /\d/.test(t.price) && !/калькулятор/i.test(t.price));
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

    const priced = hasNumericPrice(item);
    return `<div class="pl-card${priced ? ' pl-card--priced' : ''}">
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
  if (S.supCatFilter === '__pricelist__') return; // режим прайслиста — не трогаем
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
  const pills = cats.map(c => {
    const label = c === 'all' ? 'Все' : c;
    const count = c === 'all' ? S.suppliers.length : S.suppliers.filter(s => s['Категория'] === c).length;
    return `<button class="pill ${c === S.supCatFilter ? 'active' : ''}" onclick="setCatFilter('${esc(c)}')">${label}<span class="pill-count">${count}</span></button>`;
  });
  // Пилюля «Часто считаем» — показывает количество позиций с реальными ценами
  const pricedCount = S.pricelist.filter(hasNumericPrice).length;
  pills.push(`<button class="pill pill--pricelist ${'__pricelist__' === S.supCatFilter ? 'active' : ''}" onclick="setCatFilter('__pricelist__')">💰 Часто считаем<span class="pill-count">${pricedCount}</span></button>`);
  el.innerHTML = pills.join('');
}

function setCatFilter(cat) {
  S.supCatFilter = cat;
  const isPL = cat === '__pricelist__';
  document.getElementById('tab-suppliers').classList.toggle('pricelist-mode', isPL);
  renderCatPills();
  if (isPL) {
    renderPricelist(S.pricelist);   // сразу показываем весь прайслист
  } else {
    filterSuppliers();
  }
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
  resultsEl.innerHTML = `
    <div class="analyze-loading">
      <div class="analyze-loading-row">
        <span class="analyze-loading-dot ai"></span>
        <span>AI готовит ответ…</span>
      </div>
      <div class="analyze-loading-row">
        <span class="analyze-loading-dot kb"></span>
        <span>Ищем скрипты и регламенты…</span>
      </div>
    </div>`;

  try {
    const keywords    = extractKeywords(msg);
    const enrichedMsg = buildEnrichedQuery(msg);

    // Параллельный запрос: AI + скрипты
    const [geminiResult, analyzeResult] = await Promise.allSettled([
      api('/api/generate-reply', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ message: msg }),
      }),
      api('/api/analyze', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ message: enrichedMsg }),
      }),
    ]);

    const geminiVal = geminiResult.status === 'fulfilled' ? geminiResult.value : null;
    const aiReply   = geminiVal?.reply || null;
    const aiError   = geminiVal?.error || (geminiResult.status === 'rejected' ? 'недоступен' : null);
    const data    = analyzeResult.status === 'fulfilled'
      ? analyzeResult.value
      : { scripts: [], knowledge: [], recommended: null };

    // Клиентский поиск по синонимам — дополняет backend
    const clientHits    = clientSideScriptSearch(keywords);
    const backendIds    = new Set(data.scripts.map(s => s.id || s.title));
    const extraScripts  = clientHits.filter(s => !backendIds.has(s.id || s.title));
    const mergedScripts = [...data.scripts, ...extraScripts].slice(0, 6);

    renderAnalyzeResults({ ...data, scripts: mergedScripts }, msg, aiReply, aiError);
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

// ─── База знаний по изделиям ─────────────────────────────────────────────────
// Ключ = display-значение из PRODUCT_MAP.
// methods: { name (в вин. пад., «используем X»), min?, max? (по тиражу) }
// Порядок = приоритет. selectPrintMethods() берёт первые 2 подходящих.
const PRODUCT_KNOWLEDGE = {
  'футболки':  { methods: [{ name: 'DTF-печать', max: 49 }, { name: 'шелкографию', min: 30 }, { name: 'вышивку', min: 10 }] },
  'майки':     { methods: [{ name: 'DTF-печать', max: 49 }, { name: 'шелкографию', min: 30 }, { name: 'вышивку', min: 10 }] },
  'поло':      { methods: [{ name: 'вышивку', min: 10 }, { name: 'DTF-печать', max: 49 }, { name: 'шелкографию', min: 30 }] },
  'лонгсливы': { methods: [{ name: 'DTF-печать', max: 49 }, { name: 'шелкографию', min: 30 }, { name: 'вышивку', min: 10 }] },
  'худи':      { methods: [{ name: 'вышивку', min: 10 }, { name: 'шелкографию', min: 30 }, { name: 'DTF-печать', max: 49 }] },
  'толстовки': { methods: [{ name: 'вышивку', min: 10 }, { name: 'шелкографию', min: 30 }, { name: 'DTF-печать', max: 49 }] },
  'кофты':     { methods: [{ name: 'вышивку', min: 10 }, { name: 'шелкографию', min: 30 }, { name: 'DTF-печать', max: 49 }] },
  'свитшоты':  { methods: [{ name: 'вышивку', min: 10 }, { name: 'шелкографию', min: 30 }, { name: 'DTF-печать', max: 49 }] },
  'куртки':    { methods: [{ name: 'вышивку', min: 10 }, { name: 'термоперенос', min: 1 }, { name: 'шелкографию', min: 30 }] },
  'жилеты':    { methods: [{ name: 'вышивку', min: 10 }, { name: 'термоперенос', min: 1 }] },
  'бомберы':   { methods: [{ name: 'вышивку', min: 10 }, { name: 'термоперенос', min: 1 }] },
  'ветровки':  { methods: [{ name: 'шелкографию', min: 30 }, { name: 'термоперенос', min: 1 }, { name: 'вышивку', min: 10 }] },
  'шапки':     { methods: [{ name: 'вышивку', min: 10 }, { name: 'шелкографию', min: 30 }, { name: 'термоперенос', min: 1 }] },
  'кепки':     { methods: [{ name: 'вышивку', min: 10 }, { name: 'шелкографию', min: 30 }, { name: 'термоперенос', min: 1 }] },
  'носки':     { methods: [{ name: 'жаккардовое плетение', min: 50 }, { name: 'DTF-печать', min: 1 }] },
  'брюки':     { methods: [{ name: 'вышивку', min: 10 }, { name: 'шелкографию', min: 30 }] },
  'шорты':     { methods: [{ name: 'DTF-печать', min: 1 }, { name: 'шелкографию', min: 30 }, { name: 'вышивку', min: 10 }] },
  'сумки':     { methods: [{ name: 'шелкографию', min: 30 }, { name: 'вышивку', min: 10 }, { name: 'термоперенос', min: 1 }] },
  'рюкзаки':   { methods: [{ name: 'вышивку', min: 10 }, { name: 'шелкографию', min: 30 }, { name: 'термоперенос', min: 1 }] },
  'кружки':    { methods: [{ name: 'сублимацию', min: 1 }, { name: 'УФ-печать', min: 1 }, { name: 'тампопечать', min: 100 }] },
  'блокноты':  { methods: [{ name: 'тиснение', min: 50 }, { name: 'УФ-печать', min: 1 }, { name: 'шелкографию', min: 30 }] },
  'ручки':     { methods: [{ name: 'тампопечать', min: 50 }, { name: 'лазерную гравировку', min: 50 }] },
  'бейджи':    { methods: [{ name: 'сублимацию', min: 1 }, { name: 'УФ-печать', min: 1 }] },
  'пакеты':    { methods: [{ name: 'флексопечать', min: 100 }, { name: 'шелкографию', min: 30 }] },
};

// Выбирает 2 наиболее подходящих метода нанесения для данного изделия и тиража.
// Сначала фильтрует по min/max, берёт первые 2; если меньше 2 — добирает из полного списка.
function selectPrintMethods(product, quantity) {
  const pk  = PRODUCT_KNOWLEDGE[product];
  if (!pk || !pk.methods.length) return null;
  const qty = parseInt(quantity, 10) || 0;

  const applicable = qty > 0
    ? pk.methods.filter(m => (!m.min || qty >= m.min) && (!m.max || qty <= m.max))
    : pk.methods;

  // Если подходящих меньше 2 — добираем из полного списка без повторов
  const chosen = [...applicable];
  if (chosen.length < 2) {
    for (const m of pk.methods) {
      if (chosen.length >= 2) break;
      if (!chosen.includes(m)) chosen.push(m);
    }
  }
  return chosen.slice(0, 2).map(m => m.name);
}

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

  // [2] Экспертный комментарий — методы нанесения из PRODUCT_KNOWLEDGE
  const found     = product ? PRODUCT_MAP.find(p => p.display === product) : null;
  const colorForm = found
    ? (found.gen5 || found.display).replace(/^пар\s+/, '')
    : 'изделий';

  let expertLine = '';
  if (print) {
    expertLine = `Подберем лучший вариант ${print} под ваш тираж.`;
  } else if (quantity) {
    const pkMethods = product ? selectPrintMethods(product, quantity) : null;
    if (pkMethods && pkMethods.length) {
      const mStr = pkMethods.length >= 2
        ? `${pkMethods[0]} или ${pkMethods[1]}`
        : pkMethods[0];
      expertLine = `Для такого тиража обычно используем ${mStr} — это оптимально по качеству и цене для ${colorForm}.`;
    } else {
      // Запасной вариант для изделий без записи в PRODUCT_KNOWLEDGE
      expertLine = `Для такого тиража обычно используем ${suggestPrintMethod(quantity)} — оптимально по качеству и цене.`;
    }
  }

  // [3] Адаптивный бриф — только то, чего ещё не знаем
  // found и colorForm уже объявлены выше в блоке [2]
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

// Возвращает шаги менеджера: { icon, title, memo }
function buildManagerActions(intentType) {
  switch (intentType) {
    case INTENT.PRODUCT_REQUEST:
      return [
        {
          icon: '📋',
          title: 'Собрать бриф',
          memo: 'Уточните у клиента:\n— Тираж (от 30 шт. — минимум 23Merch)\n— Бюджет на единицу или на весь заказ\n— Дедлайн: к какой дате нужен заказ\n— Есть ли готовый макет (нужен вектор: .ai, .eps или .pdf 300 dpi)\n— Цвет изделия и предпочтения по материалу\n— Для кого мерч: сотрудники, клиенты, мероприятие',
        },
        {
          icon: '📦',
          title: 'Предложить образцы',
          memo: 'Образец снимает 80% сомнений по качеству. Предложите прислать физический образец ткани или готового изделия. Если клиент в Москве — можно показать в офисе. Образцы помогают обосновать цену и ускорить решение.',
        },
        {
          icon: '💰',
          title: 'Подготовить КП',
          memo: 'После брифа — готовьте КП в течение 24 часов. Укажите:\n— Несколько вариантов по тиражу (30 / 50 / 100 шт.) — клиент часто увеличивает тираж увидев разницу в цене\n— Стоимость с нанесением и без\n— Срок производства (стандарт 14–21 рабочий день)\n— Следующий шаг: утверждение макета',
        },
      ];
    case INTENT.ORDER_REQUEST:
      return [
        {
          icon: '📐',
          title: 'Уточнить размерный ряд и цвета',
          memo: 'Запросите точный размерный ряд (XS–3XL) и количество по каждому размеру. Уточните цвет изделия — пантон или ближайший RAL. Без этого невозможно выставить финальный счёт.',
        },
        {
          icon: '🎨',
          title: 'Запросить макет для нанесения',
          memo: 'Нужен векторный файл: .ai, .eps или .pdf с векторными контурами. Растровые форматы (.jpg, .png) подходят только для DTF/сублимации при разрешении от 300 dpi. Если макета нет — предложите помощь нашего дизайнера (обсудите стоимость отдельно).',
        },
        {
          icon: '💰',
          title: 'Выставить счёт и зафиксировать сроки',
          memo: 'Срок производства отсчитывается с момента оплаты аванса (обычно 50%) и утверждения макета. Стандарт: 14–21 рабочий день. Срочные заказы — по отдельной договорённости. Зафиксируйте дедлайн письменно.',
        },
      ];
    case INTENT.OBJECTION_PRICE:
      return [
        {
          icon: '💡',
          title: 'Предложить альтернативу по бюджету',
          memo: 'Не торгуйтесь — предложите другой продукт или технологию нанесения:\n— Шелкография дешевле вышивки при тираже от 50 шт.\n— DTF-печать экономичнее для сложных многоцветных логотипов\n— Более простая ткань снижает себестоимость\nПокажите два варианта: "эконом" и "оптимальный".',
        },
        {
          icon: '📊',
          title: 'Объяснить из чего складывается цена',
          memo: 'Клиент платит за: изделие + нанесение + подготовку макета + упаковку + логистику. Объясните честно, где можно сэкономить, а где нет. Доверие важнее скидки. Если клиент нашёл дешевле — уточните условия: тираж, сроки, качество материала.',
        },
        {
          icon: '📈',
          title: 'Показать выгоду увеличения тиража',
          memo: 'Цена за штуку падает при росте тиража. Покажите расчёт: "при 50 шт. — X руб/шт, при 100 шт. — Y руб/шт". Разница часто составляет 30–40%. Иногда клиенту выгоднее заказать больше, чем казалось.',
        },
      ];
    case INTENT.OBJECTION_COMPETITOR:
      return [
        {
          icon: '🔍',
          title: 'Узнать точные условия конкурента',
          memo: 'Спросите: какой тираж, какое нанесение, какой материал, какие сроки, есть ли предоплата. Часто "дешевле у других" означает другой материал или скрытые расходы на доставку и макет. Сравнивайте корректно.',
        },
        {
          icon: '⭐',
          title: 'Показать преимущества 23Merch',
          memo: 'Наши сильные стороны:\n— Контроль качества на каждом этапе\n— Собственное производство — нет посредников\n— Фиксированные сроки с гарантией\n— Персональный менеджер на весь заказ\n— Портфолио реальных проектов (можно прислать)\nНе обесценивайте конкурента — просто покажите нашу ценность.',
        },
      ];
    case INTENT.CLIENT_THINKING:
      return [
        {
          icon: '📞',
          title: 'Уточнить что тормозит решение',
          memo: 'Без давления, искренне: "Подскажите, что мешает двигаться дальше — цена, сроки, нужно согласование?" Чаще всего клиент ждёт внутреннего согласования. Предложите помочь: подготовить презентацию для руководителя или дать дополнительные материалы.',
        },
        {
          icon: '📅',
          title: 'Зафиксировать дату следующего контакта',
          memo: 'Не оставляйте диалог открытым. Договоритесь о конкретном дне: "Давайте я напишу вам в среду — за это время вы успеете обсудить внутри?" Ставьте напоминание. 80% сделок закрываются после 3–5 касаний.',
        },
      ];
    case INTENT.PRICE_QUESTION:
      return [
        {
          icon: '💰',
          title: 'Подготовить предварительный расчёт',
          memo: 'Дайте ориентир быстро — клиент не любит ждать. Используйте прайс "Часто считаем" для типовых позиций. Укажите диапазон: "от X до Y руб/шт в зависимости от тиража и нанесения". Финальный расчёт — после брифа.',
        },
        {
          icon: '📋',
          title: 'Уточнить бриф для точной цены',
          memo: 'Цена зависит от: тираж, тип изделия, материал, метод нанесения, количество цветов в логотипе, сроки. Без этих данных любая цифра будет неточной. Задайте 3–4 ключевых вопроса прямо сейчас.',
        },
      ];
    default:
      return [
        {
          icon: '📋',
          title: 'Уточнить запрос клиента',
          memo: 'Задайте открытый вопрос: "Расскажите подробнее — что именно нужно изготовить и для какого события?" Чем больше деталей вы узнаете на старте, тем точнее будет предложение.',
        },
        {
          icon: '🤝',
          title: 'Установить следующий шаг',
          memo: 'Любой диалог должен заканчиваться конкретным следующим действием: звонок, расчёт, образец, встреча. Не оставляйте клиента без "следующего шага" — иначе он уйдёт к конкуренту.',
        },
      ];
  }
}

// Рендерит шаги менеджера как аккордеон
function renderManagerSteps(actions) {
  const items = actions.map((a, i) => {
    const id = `ms-${i}`;
    const memoHtml = esc(a.memo).replace(/\n/g, '<br>');
    return `
      <div class="ms-item" id="${id}">
        <button class="ms-header" onclick="toggleManagerStep('${id}')" type="button">
          <span class="ms-icon">${a.icon}</span>
          <span class="ms-title">Шаг ${i + 1}: ${esc(a.title)}</span>
          <svg class="ms-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="ms-body">
          <div class="ms-memo">${memoHtml}</div>
        </div>
      </div>`;
  }).join('');

  return `<div class="manager-steps-block">
    <div class="manager-steps-label">🗂 Шаги менеджера</div>
    <div class="manager-steps-list">${items}</div>
  </div>`;
}

function renderAnalyzeResults(data, query, aiReply, aiError) {
  const el = document.getElementById('analyze-results');
  const { recommended, scripts, knowledge } = data;
  const hasAny = recommended || scripts.length || knowledge.length;

  const allForComposite = recommended
    ? [recommended, ...scripts.filter(s => (s.id||s.title) !== (recommended.id||recommended.title))]
    : scripts;
  const compositeText = buildCompositeAnswer(allForComposite, query);
  const isFallback    = !hasAny && compositeText === FALLBACK_RESPONSE.text;

  const intentType   = detectIntent(query);
  const isTemplate   = intentType === INTENT.ORDER_REQUEST || intentType === INTENT.PRODUCT_REQUEST;
  const sourceScript = isTemplate ? null : (recommended || scripts[0] || null);
  const sourceLabel  = sourceScript
    ? `${sourceScript.category || ''}${sourceScript.title ? ' · ' + sourceScript.title : ''}`
    : '';

  const others = scripts
    .filter(s => !recommended || (s.id||s.title) !== (recommended.id||recommended.title))
    .slice(0, 4);

  let html = '<div class="analyze-results">';

  // ══════════════════════════════════════════════════════════════════════════
  // БЛОК 1 — AI ответ (Gemini)
  // ══════════════════════════════════════════════════════════════════════════
  if (aiReply) {
    html += `<div class="ai-reply-block" id="ai-reply-block">
      <div class="ai-reply-header">
        <div class="ai-reply-indicator">
          <span class="ai-reply-icon">✨</span>
          <span class="ai-reply-title">Готовый ответ</span>
          <span class="ai-reply-sub">отредактируйте если нужно</span>
        </div>
        <div class="ai-reply-btns">
          <button class="btn-ai-edit" id="btn-ai-edit" onclick="toggleAiEdit()" title="Редактировать">✏️ Редактировать</button>
          <button class="btn-ai-copy" onclick="copyAiReply(this)">📋 Скопировать</button>
        </div>
      </div>
      <div class="ai-reply-body">
        <div class="ai-reply-text" id="ai-reply-text">${renderScriptText(aiReply)}</div>
        <textarea class="ai-reply-edit" id="ai-reply-edit" style="display:none">${esc(aiReply)}</textarea>
        <div class="ai-reply-edit-actions" id="ai-reply-edit-actions" style="display:none">
          <button class="btn-primary" style="font-size:12px;padding:6px 16px" onclick="saveAiEdit()">Сохранить</button>
          <button class="btn-ghost"   style="font-size:12px;padding:6px 14px" onclick="cancelAiEdit()">Отмена</button>
        </div>
      </div>
    </div>`;
  } else {
    const is429   = aiError && aiError.includes('429');
    const errText = is429
      ? '⏱ Лимит запросов — подождите минуту и попробуйте снова'
      : '⚠️ AI недоступен — используйте методичку ниже';
    html += `<div class="ai-reply-block ai-reply-block--error">
      <div class="ai-reply-header">
        <div class="ai-reply-indicator">
          <span class="ai-reply-icon">✨</span>
          <span class="ai-reply-title">Готовый ответ</span>
          <span class="ai-reply-sub">${errText}</span>
        </div>
        ${is429 ? `<button class="btn-ai-edit" onclick="doAnalyze()" style="font-size:11px">↻ Повторить</button>` : ''}
      </div>
    </div>`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // БЛОК 2 — Шаги менеджера (аккордеон, сразу после AI-ответа)
  // ══════════════════════════════════════════════════════════════════════════
  if (!isFallback) {
    html += renderManagerSteps(buildManagerActions(intentType));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // БЛОК 3 — Рекомендации из методички
  // ══════════════════════════════════════════════════════════════════════════
  html += `<div class="kb-recs-block">
    <div class="kb-recs-header">📚 Рекомендации из методички</div>`;

  // ── Лучший скрипт / шаблон ────────────────────────────────────────────────
  {
    const cardMod   = isFallback ? ' recommended-card--fallback' : '';
    const dotMod    = isFallback ? ' rec-dot--muted' : '';
    const headTitle = isFallback ? '💬 Универсальный ответ' : '✅ Подходящий скрипт';

    html += `<div class="recommended-card${cardMod}">
      <div class="rec-header">
        <div class="rec-indicator">
          <span class="rec-dot${dotMod}"></span>
          <span class="rec-title">${headTitle}</span>
          ${sourceLabel && !isFallback ? `<span class="rec-source">${esc(sourceLabel)}</span>` : ''}
        </div>
        <button class="btn-copy-rec" onclick="copyRecommendedAnswer(this)">📋 Скопировать</button>
      </div>
      <div class="rec-body">
        <div class="rec-text">${renderScriptText(compositeText)}</div>
      </div>
    </div>`;
  }

  // ── Похожие скрипты ────────────────────────────────────────────────────────
  if (others.length) {
    html += `<div class="result-section">
      <h3>📋 Другие скрипты (${others.length})</h3>
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
      <h3>📄 Из регламентов (${knowledge.length})</h3>
      <div class="mini-kb">` +
      knowledge.map(k => `
        <div class="mini-kb-card">
          <div class="mini-kb-title">${esc(k.title||'')}</div>
          <div class="mini-kb-excerpt">${highlightText(esc(k.excerpt||''), query)}</div>
        </div>`).join('') +
      '</div></div>';
  }

  html += '</div>'; // kb-recs-block
  html += '</div>'; // analyze-results
  el.innerHTML = html;
}

// ── AI reply: редактирование / копирование ──────────────────────────────────
function toggleManagerStep(id) {
  const item = document.getElementById(id);
  if (!item) return;
  item.classList.toggle('open');
}

function toggleAiEdit() {
  const textEl   = document.getElementById('ai-reply-text');
  const editEl   = document.getElementById('ai-reply-edit');
  const actionsEl = document.getElementById('ai-reply-edit-actions');
  const btn      = document.getElementById('btn-ai-edit');
  if (!textEl || !editEl) return;

  const isEditing = editEl.style.display !== 'none';
  if (isEditing) {
    cancelAiEdit();
  } else {
    // Синхронизируем textarea с текущим отображаемым текстом
    editEl.value = textEl.innerText.trim();
    textEl.style.display    = 'none';
    editEl.style.display    = 'block';
    actionsEl.style.display = 'flex';
    btn.textContent = '✏️ Редактирую…';
    editEl.focus();
    editEl.selectionStart = editEl.selectionEnd = editEl.value.length;
  }
}

function saveAiEdit() {
  const textEl    = document.getElementById('ai-reply-text');
  const editEl    = document.getElementById('ai-reply-edit');
  const actionsEl = document.getElementById('ai-reply-edit-actions');
  const btn       = document.getElementById('btn-ai-edit');
  if (!textEl || !editEl) return;

  textEl.innerHTML        = renderScriptText(editEl.value);
  textEl.style.display    = 'block';
  editEl.style.display    = 'none';
  actionsEl.style.display = 'none';
  btn.textContent = '✏️ Редактировать';
  showToast('Ответ обновлён', 'success');
}

function cancelAiEdit() {
  const textEl    = document.getElementById('ai-reply-text');
  const editEl    = document.getElementById('ai-reply-edit');
  const actionsEl = document.getElementById('ai-reply-edit-actions');
  const btn       = document.getElementById('btn-ai-edit');
  if (!textEl || !editEl) return;

  textEl.style.display    = 'block';
  editEl.style.display    = 'none';
  actionsEl.style.display = 'none';
  btn.textContent = '✏️ Редактировать';
}

function copyAiReply(btn) {
  const editEl = document.getElementById('ai-reply-edit');
  const textEl = document.getElementById('ai-reply-text');
  // Берём текст из активного элемента: textarea (если идёт редактирование) или div
  const text = (editEl && editEl.style.display !== 'none')
    ? editEl.value.trim()
    : (textEl ? textEl.innerText.trim() : '');

  if (!text) { showToast('Нечего копировать', 'error'); return; }
  navigator.clipboard.writeText(text)
    .then(() => {
      showToast('AI ответ скопирован!', 'success');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✓ Скопировано';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
      }
    })
    .catch(() => showToast('Не удалось скопировать', 'error'));
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
