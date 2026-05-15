const express = require('express');
const fetch = require('node-fetch');

const VIBE_KEY = process.env.VIBE_API_KEY;
const VIBE_BASE = 'https://vibecode.bitrix24.tech/v1';
const PORTAL_API = process.env.PORTAL_API || 'https://web-production-4879cd.up.railway.app';

const app = express();
app.use(express.json());

app.get('/', (_, res) => res.json({ ok: true, bot: botId }));
app.get('/health', (_, res) => res.json({ ok: true, bot: botId }));

// ── Vibe helpers ──────────────────────────────────────────────
const H = () => ({ 'X-Api-Key': VIBE_KEY, 'Content-Type': 'application/json' });

async function vibeGet(path) {
  const r = await fetch(`${VIBE_BASE}${path}`, { headers: H() });
  return r.json();
}
async function vibePost(path, body) {
  const r = await fetch(`${VIBE_BASE}${path}`, {
    method: 'POST', headers: H(), body: JSON.stringify(body)
  });
  return r.json();
}

// ── Bot state ─────────────────────────────────────────────────
let botId = null;
let polling = false;

async function registerBot() {
  const list = await vibeGet('/bots');
  const bots = list.data?.bots || [];
  if (bots.length > 0) {
    botId = bots[0].id;
    console.log(`[BOT] Существующий бот найден: ${botId}`);
    return;
  }
  const res = await vibePost('/bots', {
    code: 'metodichka_23',
    name: 'Методичка 23',
    workPosition: 'AI-помощник менеджера',
    description: 'Вставь сообщение клиента — получи готовый ответ'
  });
  botId = res.data?.bot?.id;
  console.log(`[BOT] Бот создан: ${botId}`);
}

async function sendTyping(dialogId) {
  await vibePost(`/bots/${botId}/typing`, {
    dialogId,
    statusMessageCode: 'IMBOT_AGENT_ACTION_THINKING'
  }).catch(() => {});
}

async function sendMsg(dialogId, message) {
  return vibePost(`/bots/${botId}/messages`, {
    dialogId,
    fields: { message }
  });
}

// ── AI analysis via our Railway backend ──────────────────────
async function analyze(text) {
  const r = await fetch(`${PORTAL_API}/api/generate-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function getSteps(text, intent) {
  const r = await fetch(`${PORTAL_API}/api/generate-steps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, intent })
  });
  if (!r.ok) return null;
  return r.json();
}

// ── Format Bitrix24 message ───────────────────────────────────
function fmtReply(reply) {
  return [
    '📨 [B]ГОТОВЫЙ ОТВЕТ КЛИЕНТУ:[/B]',
    '──────────────────────────',
    reply,
    '──────────────────────────',
    '[I]Скопируй и отправь клиенту[/I]'
  ].join('\n');
}

function fmtSteps(steps) {
  if (!steps || !steps.length) return null;
  const lines = ['[B]📋 ШАГИ МЕНЕДЖЕРА:[/B]'];
  steps.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.icon || ''} [B]${s.title}[/B]`);
    if (s.memo) lines.push(`   ${s.memo}`);
  });
  return lines.join('\n');
}

// ── Handle one incoming message ───────────────────────────────
async function handleMessage(dialogId, text) {
  if (!text.trim()) return;
  console.log(`[BOT] → ${dialogId}: ${text.substring(0, 60)}`);

  await sendTyping(dialogId);

  let result;
  try {
    result = await analyze(text);
  } catch (e) {
    console.error('[BOT] Ошибка analyze:', e.message);
    await sendMsg(dialogId, '⚠️ Не удалось проанализировать. Попробуй ещё раз через секунду.');
    return;
  }

  if (!result.reply) {
    await sendMsg(dialogId, '🤔 Не смог составить ответ. Напиши подробнее что пишет клиент.');
    return;
  }

  // 1. Send ready reply
  await sendMsg(dialogId, fmtReply(result.reply));

  // 2. Send manager steps (async, slight delay so messages are separate)
  setTimeout(async () => {
    try {
      const stepsData = await getSteps(text, result.intent);
      const steps = stepsData?.steps || stepsData?.actions;
      const txt = fmtSteps(steps);
      if (txt) await sendMsg(dialogId, txt);
    } catch (e) {
      console.warn('[BOT] steps error:', e.message);
    }
  }, 1200);
}

// ── Polling loop ──────────────────────────────────────────────
let eventOffset = null; // track offset so we don't re-process old events

async function poll() {
  if (!botId || polling) return;
  polling = true;
  try {
    const url = eventOffset !== null
      ? `/bots/${botId}/events?limit=50&offset=${eventOffset}`
      : `/bots/${botId}/events?limit=50`;
    const res = await vibeGet(url);
    const data = res.data || {};
    const events = data.events || [];

    // Advance offset so next poll only gets NEW events
    if (data.nextOffset !== undefined) {
      eventOffset = data.nextOffset;
    }

    for (const ev of events) {
      if (ev.type !== 'ONIMBOTV2MESSAGEADD') continue;
      const dialogId = ev.data?.chat?.dialogId || ev.data?.dialogId;
      const text = ev.data?.message?.text || '';
      if (dialogId && text) {
        handleMessage(dialogId, text).catch(console.error);
      }
    }
  } catch (e) {
    console.warn('[BOT] poll error:', e.message);
  } finally {
    polling = false;
  }
}

// ── Start ─────────────────────────────────────────────────────
async function start() {
  if (!VIBE_KEY) { console.error('VIBE_API_KEY не задан!'); process.exit(1); }

  // Listen first so healthcheck passes immediately
  const PORT = process.env.PORT || 3001;
  await new Promise(resolve => app.listen(PORT, () => {
    console.log(`[BOT] Слушаю порт ${PORT}`);
    resolve();
  }));

  // Register bot and start polling (non-blocking for startup)
  async function initBot() {
    try {
      await registerBot();
      console.log(`[BOT] Бот готов: ${botId}`);
      setInterval(poll, 2500);
    } catch (e) {
      console.error('[BOT] registerBot failed:', e.message, '— retry in 5s');
      setTimeout(initBot, 5000);
    }
  }
  initBot();
}

start().catch(e => { console.error(e); process.exit(1); });
