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

async function filterSuppliers() {
  const q   = document.getElementById('sup-search').value.trim();
  const url = new URL('/api/suppliers', location.href);
  if (q)                          url.searchParams.set('q', q);
  if (S.supCatFilter !== 'all')   url.searchParams.set('category', S.supCatFilter);

  try {
    const data = await fetch(url).then(r => r.json());
    renderSuppliers(data);
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

// ── Составной ответ из найденных скриптов ─────────────────────────────────────
// Алгоритм:
//   1. Определяем intent(s) из оригинального запроса
//   2. Скоримируем каждый скрипт: tag-match + keyword hits + brevity
//   3. Берём лучший и вырезаем первый смысловой абзац (≤7 строк)
function buildCompositeAnswer(scripts, originalMsg) {
  if (!scripts.length) return FALLBACK_RESPONSE.text;

  const keywords = extractKeywords(originalMsg || '');
  const intents  = detectIntents(keywords);

  // Скоринг + сортировка
  const ranked = scripts
    .map(s => ({ s, score: scoreScript(s, intents, keywords) }))
    .sort((a, b) => b.score - a.score);

  const best  = ranked[0].s;
  const lines = (best.text || '').split('\n').map(l => l.trim());

  // Первый абзац (до пустой строки), но не больше 7 строк
  const breakIdx = lines.findIndex((l, i) => i > 1 && l === '');
  let result;
  if (breakIdx > 0 && breakIdx <= 7) {
    result = lines.slice(0, breakIdx).filter(l => l).join('\n');
  } else {
    result = lines.filter(l => l).slice(0, 5).join('\n');
  }

  // Если вышло совсем мало — добавляем стандартное уточнение
  if (result.split('\n').filter(l => l.trim()).length < 2) {
    result += '\n\nДля расчёта уточните: тираж, тип изделия и наличие макета.';
  }

  return result || FALLBACK_RESPONSE.text;
}

// Именованная функция копирования рекомендованного ответа (Задача 4)
function copyRecommendedAnswer(btn, text) {
  copyText(text, btn);
}

function renderAnalyzeResults(data, query) {
  const el = document.getElementById('analyze-results');
  const { recommended, scripts, knowledge } = data;
  const hasAny = recommended || scripts.length || knowledge.length;
  const isFallback = !hasAny;

  // Собираем составной ответ: recommended впереди, затем остальные скрипты
  const allForComposite = recommended
    ? [recommended, ...scripts.filter(s => (s.id||s.title) !== (recommended.id||recommended.title))]
    : scripts;
  const compositeText = isFallback
    ? FALLBACK_RESPONSE.text
    : buildCompositeAnswer(allForComposite, query);

  // Источник для подписи карточки
  const sourceScript = recommended || scripts[0] || null;
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
          <button class="btn-copy-rec" onclick="copyRecommendedAnswer(this, ${JSON.stringify(compositeText)})">
            📋 Скопировать
          </button>
        </div>

        <div class="rec-body">
          <div class="rec-text">${renderScriptText(compositeText)}</div>
        </div>

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
