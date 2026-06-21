/* Poker Weekend Alicante — main.js (Turso backend) */

const TURSO_URL   = 'https://poker-weekend-2026-ponziani.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MTM1MTI1NTIsImlhdCI6MTc4MTk3NjU1MiwiaWQiOiIwMTllZTVjMC1jMjAxLTdmYzEtODhjZS04YjFlM2FiODJhM2IiLCJyaWQiOiIxZTgxMTFkYS00ZDQ1LTRhNjUtYTY1YS1hYTQ2NDJmN2NiZGQifQ.sgcIHGWFi6opxlymsLP1b95UdVcRUkksSX1FcawtnUl9Mo695gvdXiZSqbPdIsozZZzG2Yv1bKzPUiiH-k8yDA';

const MONTHS_NL = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
const DAYS_LONG = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'];

let state = {
  currentUser: null,
  selectedWeekends: [],
  calYear:  new Date().getFullYear(),
  calMonth: new Date().getMonth(),
};

let data = {
  names: [],
  votes: {}, // { name: [satKey, ...] }
};

/* ── Turso HTTP API ─────────────────────────────────────────── */
async function tursoQuery(sql, args = []) {
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{ type: 'execute', stmt: { sql, args } }]
    }),
  });
  if (!res.ok) throw new Error(`Turso error: ${res.status}`);
  const json = await res.json();
  return json.results[0].response.result;
}

async function tursoInit() {
  await tursoQuery(`
    CREATE TABLE IF NOT EXISTS votes (
      name TEXT PRIMARY KEY,
      weekends TEXT NOT NULL DEFAULT '[]'
    )
  `);
  await tursoQuery(
    'INSERT INTO votes (name, weekends) VALUES (?, ?) ON CONFLICT(name) DO NOTHING',
    [{ type: 'text', value: 'Bob' }, { type: 'text', value: '[]' }]
  );
}

async function tursoLoad() {
  const result = await tursoQuery('SELECT name, weekends FROM votes');
  data.names = [];
  data.votes = {};
  for (const row of result.rows) {
    const name     = row[0].value;
    const weekends = JSON.parse(row[1].value);
    data.names.push(name);
    data.votes[name] = weekends;
  }
}

async function tursoSave(name, weekends) {
  await tursoQuery(
    'INSERT INTO votes (name, weekends) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET weekends = excluded.weekends',
    [{ type: 'text', value: name }, { type: 'text', value: JSON.stringify(weekends) }]
  );
}

async function tursoAddName(name) {
  await tursoQuery(
    'INSERT INTO votes (name, weekends) VALUES (?, ?) ON CONFLICT(name) DO NOTHING',
    [{ type: 'text', value: name }, { type: 'text', value: '[]' }]
  );
}

/* ── Cashgame-style chip SVG ────────────────────────────────── */
function chipSVG({ color, label = '', size = 40 }) {
  const c = CHIP_COLORS[color] || CHIP_COLORS.blue;
  const r = size / 2;
  const cx = r, cy = r;
  // Block dash pattern: 8 blocks around the rim
  const rimR = r - 1;
  const blockW = 7, gap = (2 * Math.PI * rimR - 8 * blockW) / 8;
  const dashArr = `${blockW} ${gap.toFixed(1)}`;
  const dashOff = -(blockW / 2);
  const goldR1 = r * 0.78, goldR2 = r * 0.68, darkR = r * 0.50;
  const labelSize = label.length > 2 ? r * 0.32 : r * 0.38;
  return `<svg class="chip-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="cg${color}${size}" cx="38%" cy="32%" r="62%">
        <stop offset="0%" stop-color="${c.hi}"/>
        <stop offset="55%" stop-color="${c.mid}"/>
        <stop offset="100%" stop-color="${c.lo}"/>
      </radialGradient>
      <radialGradient id="gg${color}${size}" cx="38%" cy="32%" r="62%">
        <stop offset="0%" stop-color="#f5e080"/>
        <stop offset="55%" stop-color="#c8a030"/>
        <stop offset="100%" stop-color="#7a5810"/>
      </radialGradient>
      <radialGradient id="dg${color}${size}" cx="38%" cy="32%" r="62%">
        <stop offset="0%" stop-color="${c.dkhi}"/>
        <stop offset="100%" stop-color="${c.dklo}"/>
      </radialGradient>
      <radialGradient id="sh${color}${size}" cx="32%" cy="28%" r="58%">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="${cx+1}" cy="${cy+3}" rx="${rimR}" ry="${rimR*0.18}" fill="#000" opacity="0.3"/>
    <circle cx="${cx}" cy="${cy}" r="${rimR}" fill="url(#cg${color}${size})"/>
    <circle cx="${cx}" cy="${cy}" r="${rimR}" fill="none" stroke="#fff" stroke-width="${r*0.22}" stroke-dasharray="${dashArr}" stroke-dashoffset="${dashOff}" opacity="0.92"/>
    <circle cx="${cx}" cy="${cy}" r="${goldR1}" fill="url(#gg${color}${size})"/>
    <circle cx="${cx}" cy="${cy}" r="${goldR1}" fill="none" stroke="#e8c060" stroke-width="0.8" opacity="0.6"/>
    <text x="${cx}" y="${cy - goldR1 + r*0.22}" text-anchor="middle" font-size="${r*0.17}" fill="#5a3800" font-family="Georgia,serif" font-style="italic" font-weight="700" opacity="0.85">Cashgame</text>
    <circle cx="${cx}" cy="${cy}" r="${goldR2}" fill="none" stroke="#a07820" stroke-width="0.8" opacity="0.5"/>
    <circle cx="${cx}" cy="${cy}" r="${darkR}" fill="url(#dg${color}${size})"/>
    <circle cx="${cx}" cy="${cy}" r="${darkR}" fill="none" stroke="#d4a030" stroke-width="1"/>
    ${label ? `<text x="${cx}" y="${cy + labelSize*0.42}" text-anchor="middle" font-size="${labelSize}" fill="#f0d060" font-family="Georgia,serif" font-weight="700">${label}</text>` : ''}
    <circle cx="${cx}" cy="${cy}" r="${rimR}" fill="url(#sh${color}${size})"/>
  </svg>`;
}

const CHIP_COLORS = {
  blue:  { hi:'#3a5aba', mid:'#1a3a8a', lo:'#0a1a50', dkhi:'#2a3a7a', dklo:'#0a1030' },
  red:   { hi:'#c03030', mid:'#8a1a1a', lo:'#4a0808', dkhi:'#802020', dklo:'#300808' },
  green: { hi:'#2a9a3a', mid:'#1a6a2a', lo:'#0a3010', dkhi:'#1a6030', dklo:'#082010' },
  gold:  { hi:'#d4a843', mid:'#a8832a', lo:'#6a5010', dkhi:'#7a6020', dklo:'#3a2c08' },
  white: { hi:'#c8c8d8', mid:'#9898b0', lo:'#606078', dkhi:'#585870', dklo:'#282838' },
};

/* ── UI helpers ─────────────────────────────────────────────── */
function setLoading(on) {
  document.getElementById('loadingBar').style.display = on ? 'block' : 'none';
}

function showError(msg) {
  const el = document.getElementById('errorBanner');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}

/* ── Date helpers ───────────────────────────────────────────── */
function toKey(date) { return date.toISOString().split('T')[0]; }

function getSaturdayKey(date) {
  if (date.getDay() === 6) return toKey(date);
  if (date.getDay() === 0) { const s = new Date(date); s.setDate(date.getDate() - 1); return toKey(s); }
  return null;
}

function getSundayFromSat(satKey) {
  const d = new Date(satKey + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return toKey(d);
}

function fmtWeekend(satKey) {
  const sat = new Date(satKey + 'T12:00:00');
  const sun = new Date(satKey + 'T12:00:00'); sun.setDate(sat.getDate() + 1);
  return `za ${sat.getDate()} & zo ${sun.getDate()} ${MONTHS_NL[sat.getMonth()].slice(0,3)}`;
}

function fmtWeekendLong(satKey) {
  const sat = new Date(satKey + 'T12:00:00');
  const sun = new Date(satKey + 'T12:00:00'); sun.setDate(sat.getDate() + 1);
  return `Zaterdag ${sat.getDate()} & Zondag ${sun.getDate()} ${MONTHS_NL[sat.getMonth()]}`;
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

/* ── Navigation ─────────────────────────────────────────────── */
function goStep(n) {
  document.getElementById('step1').classList.toggle('hidden', n !== 1);
  document.getElementById('step2').classList.toggle('hidden', n !== 2);
  if (n === 2) {
    document.getElementById('playerNameDisplay').textContent = state.currentUser;
    renderCal();
    renderChips();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goVoteAgain() {
  state.selectedWeekends = data.votes[state.currentUser] ? [...data.votes[state.currentUser]] : [];
  goStep(2);
}

/* ── Step 1: Names ──────────────────────────────────────────── */
function renderNames() {
  const grid = document.getElementById('nameGrid');
  if (!data.names.length) {
    grid.innerHTML = `<p class="names-empty">Voeg hieronder je naam toe om te beginnen.</p>`;
    document.getElementById('step1Next').disabled = true;
    return;
  }
  grid.innerHTML = data.names.map(name => {
    const sel   = state.currentUser === name;
    const voted = data.votes[name] !== undefined && data.votes[name].length > 0;
    const count = (data.votes[name] || []).length;
    return `<button class="name-btn${sel ? ' selected' : ''}" onclick="selectName('${name}')">
        <span class="ps-chip ${voted ? 'ps-chip--voted' : ''}" aria-hidden="true"></span>
        <span class="name-btn__label">${name}</span>
        ${voted ? `<span class="name-btn__tag">${count}w</span>` : ''}
      </button>`;
  }).join('');
  const inputVal = document.getElementById('newNameInput')?.value.trim() || '';
  document.getElementById('step1Next').disabled = !state.currentUser && !inputVal;
}

function selectName(name) {
  state.currentUser = name;
  state.selectedWeekends = data.votes[name] ? [...data.votes[name]] : [];
  renderNames();
}

const BLOCKED_NAMES = ['Jochen', 'Smol'];

async function proceedToCalendar() {
  const input = document.getElementById('newNameInput');
  const typed = input.value.trim();

  if (typed) {
    if (BLOCKED_NAMES.some(b => b.toLowerCase() === typed.toLowerCase())) {
      showError('Sorry, deze naam is onbekend.');
      input.focus();
      return;
    }
    if (!data.names.includes(typed)) {
      if (data.names.length >= 15) return;
      setLoading(true);
      try {
        await tursoAddName(typed);
        data.names.push(typed);
        data.votes[typed] = [];
        renderOverview();
      } catch(e) {
        showError('Kon naam niet opslaan. Controleer je verbinding.');
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }
    selectName(typed);
    input.value = '';
  }

  if (!state.currentUser) return;
  goStep(2);
}

document.getElementById('newNameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') proceedToCalendar();
});
document.getElementById('newNameInput').addEventListener('input', () => {
  if (state.currentUser) {
    state.currentUser = null;
    state.selectedWeekends = [];
  }
  renderNames();
});

/* ── Step 2: Calendar ───────────────────────────────────────── */
function renderCal() {
  const { calYear, calMonth } = state;
  document.getElementById('calMonthLabel').textContent = `${MONTHS_NL[calMonth]} ${calYear}`;

  const today = new Date(); today.setHours(0,0,0,0);
  const firstDay    = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  let startOffset   = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const selectedKeys = new Set();
  state.selectedWeekends.forEach(satKey => {
    selectedKeys.add(satKey);
    selectedKeys.add(getSundayFromSat(satKey));
  });

  let html = '';
  for (let i = 0; i < startOffset; i++) html += `<div class="cal-day empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const date  = new Date(calYear, calMonth, d);
    const key   = toKey(date);
    const day   = date.getDay();
    const isSat = day === 6;
    const isSun = day === 0;
    const isWE  = isSat || isSun;
    const isPast = date < today;
    const isToday = date.getTime() === today.getTime();

    const satKey = isSat ? key : (isSun ? getSaturdayKey(date) : null);
    const isFullWeekendSel = satKey && state.selectedWeekends.includes(satKey);

    let cls = 'cal-day';
    if (!isWE || isPast) cls += ' disabled';
    if (isToday)         cls += ' today';
    if (isWE && !isPast) cls += ' weekend';
    if (isSat && isFullWeekendSel) cls += ' sel-sat';
    if (isSun && isFullWeekendSel) cls += ' sel-sun';

    const clickable = isWE && !isPast;
    html += `<button class="${cls}"
      ${clickable ? `onclick="toggleWeekend('${satKey}')"` : ''}
      aria-label="${DAYS_LONG[day]} ${d} ${MONTHS_NL[calMonth]}"
      ${!clickable ? 'disabled' : ''}>${d}</button>`;
  }
  document.getElementById('calDays').innerHTML = html;
}

function toggleWeekend(satKey) {
  const idx = state.selectedWeekends.indexOf(satKey);
  if (idx > -1) state.selectedWeekends.splice(idx, 1);
  else state.selectedWeekends.push(satKey);
  renderCal();
  renderChips();
}

function renderChips() {
  const wrap = document.getElementById('chipsWrap');
  if (!state.selectedWeekends.length) {
    wrap.innerHTML = `<span class="chips-empty">Nog geen weekends geselecteerd</span>`;
    return;
  }
  wrap.innerHTML = [...state.selectedWeekends].sort().map(satKey => `
    <div class="chip">
      <span>🃏</span>
      ${fmtWeekend(satKey)}
      <button class="chip-remove" onclick="toggleWeekend('${satKey}')" aria-label="Verwijder weekend">×</button>
    </div>`).join('');
}

function prevMonth() {
  state.calMonth--;
  if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  renderCal();
}
function nextMonth() {
  state.calMonth++;
  if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  renderCal();
}

async function submitVotes() {
  setLoading(true);
  try {
    await tursoSave(state.currentUser, state.selectedWeekends);
    data.votes[state.currentUser] = [...state.selectedWeekends];
    goStep(1);
    renderNames();
    renderOverview(true);
  } catch(e) {
    showError('Kon keuze niet opslaan. Controleer je verbinding.');
  } finally {
    setLoading(false);
  }
}

/* ── Overview ───────────────────────────────────────────────── */
let overviewSelectedSat    = null;
let overviewSelectedPlayer = null;

function selectOverviewPlayer(name) {
  overviewSelectedPlayer = overviewSelectedPlayer === name ? null : name;
  renderOverview();
}

function selectOverviewWeekend(satKey) {
  overviewSelectedSat = overviewSelectedSat === satKey ? null : satKey;
  renderOverview();
}

function getAggregated() {
  const weekendSet = new Set();
  Object.values(data.votes).forEach(satKeys => satKeys.forEach(k => weekendSet.add(k)));
  return [...weekendSet].sort().map(satKey => {
    const voters = data.names.filter(name => (data.votes[name] || []).includes(satKey));
    return { satKey, voters };
  }).sort((a, b) => {
    const aBob = a.voters.includes('Bob') ? 1 : 0;
    const bBob = b.voters.includes('Bob') ? 1 : 0;
    if (bBob !== aBob) return bBob - aBob;
    return b.voters.length - a.voters.length || a.satKey.localeCompare(b.satKey);
  });
}

function renderOverview(showToast = false) {
  const agg   = getAggregated();
  const total = data.names.length;
  const voted = Object.values(data.votes).filter(v => v.length > 0).length;

  document.getElementById('playerStatus').innerHTML = !data.names.length
    ? `<p class="names-empty" style="font-size:13px;">Nog geen spelers toegevoegd.</p>`
    : data.names.map(name => {
        const hasVoted  = (data.votes[name] || []).length > 0;
        const count     = (data.votes[name] || []).length;
        const isActive  = overviewSelectedPlayer === name;
        return `<div class="ps-badge ps-badge--${hasVoted ? 'voted' : 'waiting'}${isActive ? ' ps-badge--active' : ''}" onclick="selectOverviewPlayer('${name}')">
          <span class="ps-chip ${hasVoted ? 'ps-chip--voted' : ''}" aria-hidden="true"></span>
          ${name}
          ${hasVoted ? `<span class="ps-count">${count}</span>` : ''}
        </div>`;
      }).join('');

  const playerDetail = document.getElementById('playerDetail');
  if (overviewSelectedPlayer && data.names.includes(overviewSelectedPlayer)) {
    const weekends = data.votes[overviewSelectedPlayer] || [];
    playerDetail.innerHTML = `
      <div class="player-detail">
        <div class="player-detail__name">${overviewSelectedPlayer}</div>
        ${weekends.length
          ? `<div class="player-detail__chips">${[...weekends].sort().map(s => `<span class="player-detail__chip">${fmtWeekend(s)}</span>`).join('')}</div>`
          : `<span class="player-detail__empty">Nog niet gestemd</span>`}
      </div>`;
  } else {
    playerDetail.innerHTML = '';
  }

  if (showToast && state.currentUser) {
    const toast = document.getElementById('savedToast');
    toast.innerHTML = `✓ Keuze van <strong>${state.currentUser}</strong> opgeslagen in de cloud!`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
  }

  const bestCard = document.getElementById('bestDateCard');
  if (agg.length && agg[0].voters.length > 0) {
    const { satKey, voters } = agg[0];
    bestCard.innerHTML = `
      <div class="best-date__eyebrow">☀ Beste weekend</div>
      <div class="best-date__label">${fmtWeekendLong(satKey)}</div>
      <div class="best-date__count">${voters.length} van ${total} speler${total !== 1 ? 's' : ''} beschikbaar</div>
      <div class="best-date__names">${voters.join(' · ')}</div>`;
    bestCard.classList.add('show');
  } else {
    bestCard.classList.remove('show');
  }

  const barsSection = document.getElementById('barsSection');
  if (!agg.length) {
    barsSection.innerHTML = `<div class="empty-state">Nog niemand heeft zijn beschikbaarheid ingegeven.</div>`;
    document.getElementById('whoSection').innerHTML = '';
    return;
  }

  const maxVotes = agg[0].voters.length || 1;
  barsSection.innerHTML = `<div class="bars-title">Alle weekends — ${voted} van ${total} spelers gestemd</div>` +
    agg.map(({ satKey, voters }, i) => {
      const pct       = total > 0 ? Math.round((voters.length / total) * 100) : 0;
      const tierClass = i === 0 ? 'bar-fill--top' : voters.length >= maxVotes * 0.6 ? 'bar-fill--mid' : 'bar-fill--low';
      const isSelected = overviewSelectedSat === satKey;
      const hasBob    = voters.includes('Bob');
      return `<div class="bar-row${isSelected ? ' bar-row--selected' : ''}" onclick="selectOverviewWeekend('${satKey}')">
          <div class="bar-date">${fmtWeekend(satKey)}${hasBob ? ' <span class="bar-bob">★</span>' : ''}</div>
          <div class="bar-track">
            <div class="bar-fill ${tierClass}" style="width:${Math.max(pct, voters.length > 0 ? 10 : 0)}%">
              ${voters.length > 0 ? `${voters.length}/${total}` : ''}
            </div>
          </div>
          <div class="bar-num"><strong>${voters.length}</strong>/${total}</div>
        </div>`;
    }).join('');

  const whoSection = document.getElementById('whoSection');
  if (overviewSelectedSat) {
    const entry     = agg.find(a => a.satKey === overviewSelectedSat);
    const canList   = entry ? entry.voters : [];
    const cantList  = data.names.filter(n => (data.votes[n] || []).length > 0 && !(data.votes[n] || []).includes(overviewSelectedSat));
    const unknownList = data.names.filter(n => (data.votes[n] || []).length === 0);
    whoSection.innerHTML = `
      <div class="who-detail">
        <button class="who-detail__back" onclick="selectOverviewWeekend('${overviewSelectedSat}')">← Alle weekends</button>
        <div class="who-detail__title">${fmtWeekendLong(overviewSelectedSat)}</div>
        <div class="who-detail__group">
          <div class="who-detail__label who-detail__label--can">Kan erbij (${canList.length})</div>
          <div class="who-avatars">
            ${canList.length
              ? canList.map(v => `<div class="who-avatar who-avatar--can" title="${v}">${v}</div>`).join('')
              : `<span class="who-none">Niemand</span>`}
          </div>
        </div>
        <div class="who-detail__group">
          <div class="who-detail__label who-detail__label--cant">Kan niet (${cantList.length})</div>
          <div class="who-avatars">
            ${cantList.length
              ? cantList.map(v => `<div class="who-avatar who-avatar--cant" title="${v}">${v}</div>`).join('')
              : `<span class="who-none">Iedereen kan</span>`}
          </div>
        </div>
        ${unknownList.length ? `
        <div class="who-detail__group">
          <div class="who-detail__label who-detail__label--unknown">Nog niet gestemd (${unknownList.length})</div>
          <div class="who-avatars">
            ${unknownList.map(v => `<div class="who-avatar" title="${v}">${v}</div>`).join('')}
          </div>
        </div>` : ''}
      </div>`;
  } else {
    whoSection.innerHTML =
      `<div class="who-title">Klik op een optie voor details</div>` +
      agg.map(({ satKey, voters }) => `
        <div class="who-row">
          <div class="who-date">${fmtWeekend(satKey)}</div>
          <div class="who-avatars">
            ${voters.length
              ? voters.map(v => `<div class="who-avatar" title="${v}">${v}</div>`).join('')
              : `<span style="font-size:11px;color:var(--muted);font-style:italic">Niemand</span>`}
          </div>
        </div>`).join('');
  }
}

/* ── Init ───────────────────────────────────────────────────── */
async function init() {
  document.getElementById('headerChipGold').innerHTML  = chipSVG({ color:'gold',  size: 42 });
  document.getElementById('headerChipsRight').innerHTML =
    chipSVG({ color:'red',   size: 34 }) +
    chipSVG({ color:'green', size: 34 }) +
    chipSVG({ color:'white', size: 34 });
  document.getElementById('footerChips').innerHTML =
    chipSVG({ color:'blue',  size: 30 }) +
    chipSVG({ color:'red',   size: 30 }) +
    chipSVG({ color:'green', size: 30 }) +
    chipSVG({ color:'gold',  size: 30 }) +
    chipSVG({ color:'white', size: 30 });

  setLoading(true);
  try {
    await tursoInit();
    await tursoLoad();
    renderNames();
    renderOverview();
  } catch(e) {
    showError('Kon geen verbinding maken met de database. Probeer de pagina te herladen.');
  } finally {
    setLoading(false);
  }
}

init();
