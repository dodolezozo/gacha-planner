/* ═══════════════════════════════════════════════
   app.js — Main application logic
   ═══════════════════════════════════════════════ */

// ── State ────────────────────────────────────
let currentGame = 'genshin';
let filterRarity = 'all';
let filterElement = 'all';
let filterSpecialty = 'all';
let searchQuery = '';

// ── DOM refs ─────────────────────────────────
const $gameTabs    = document.getElementById('gameTabs');
const $themeStrip  = document.getElementById('themeStrip');
const $charGrid    = document.getElementById('charGrid');
const $charCount   = document.getElementById('charCount');
const $wishlistBody= document.getElementById('wishlistBody');
const $wishCount   = document.getElementById('wishCount');
const $searchInput = document.getElementById('searchInput');
const $filterRarity= document.getElementById('filterRarity');
const $filterElem  = document.getElementById('filterElement');
const $filterSpec  = document.getElementById('filterSpecialty');
const $btnExport   = document.getElementById('btnExport');
const $btnImport   = document.getElementById('btnImport');
const $importInput = document.getElementById('importInput');

// ── Icon helpers ─────────────────────────────
// Converts specialty name to a safe filename slug ("The Hunt" → "TheHunt")
function iconSlug(name) { return name.replace(/[^a-zA-Z0-9]/g, ''); }

// Two-step image fallback: SVG → PNG → emoji span
window._iconFallback = function(img) {
  if (!img.dataset.tried) {
    img.dataset.tried = '1';
    img.src = img.dataset.png;
  } else {
    const span = document.createElement('span');
    span.className = img.className;
    span.textContent = img.dataset.emoji || '✦';
    img.replaceWith(span);
  }
};

// Game logo fallback: SVG → PNG → text abbr
window._gameLogoFallback = function(img) {
  if (!img.dataset.tried) {
    img.dataset.tried = '1';
    img.src = img.dataset.png;
  } else {
    const span = document.createElement('span');
    span.className = 'game-logo-text';
    span.textContent = img.dataset.text;
    img.replaceWith(span);
  }
};

function elemIcon(elem, game, cls = 'tag-icon') {
  if (!elem || !game) return '';
  const prefix = GAME_PREFIX[game];
  const base   = `icons/elements/${prefix}_${elem}`;
  const emoji  = ELEMENT_EMOJI[elem] || '✦';
  return `<img class="${cls}" src="${base}.svg" data-png="${base}.png" data-emoji="${emoji}" onerror="_iconFallback(this)" alt="${elem}">`;
}

function specIcon(spec, game, cls = 'tag-icon') {
  if (!spec || !game) return '';
  const prefix = GAME_PREFIX[game];
  const slug   = iconSlug(spec);
  const base   = `icons/specialties/${prefix}_${slug}`;
  const emoji  = SPECIALTY_EMOJI[spec] || '✦';
  return `<img class="${cls}" src="${base}.svg" data-png="${base}.png" data-emoji="${emoji}" onerror="_iconFallback(this)" alt="${spec}">`;
}

function gameLogoEl(game) {
  const prefix = GAME_PREFIX[game];
  const base   = `icons/games/${prefix}_Logo`;
  const abbr   = GAMES[game].abbr;
  return `<img class="game-logo-img" src="${base}.svg" data-png="${base}.png" data-text="${abbr}" onerror="_gameLogoFallback(this)" alt="${abbr}">`;
}


// ── Init ─────────────────────────────────────
async function init() {
  loadWishlists();
  await loadCharacters();
  buildGameTabs();
  switchGame('genshin');

  $searchInput.addEventListener('input', () => {
    searchQuery = $searchInput.value.toLowerCase();
    renderChars();
  });

  $btnExport.addEventListener('click', exportWishlists);
  $btnImport.addEventListener('click', () => $importInput.click());
  $importInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      importWishlists(e.target.files[0], (err, count) => {
        if (err) { showToast('Import failed: ' + err.message); return; }
        renderAll();
        showToast(`Imported ${count} entries`);
        $importInput.value = '';
      });
    }
  });
}

// ── Game tabs ─────────────────────────────────
function buildGameTabs() {
  $gameTabs.innerHTML = '';
  Object.entries(GAMES).forEach(([key, game]) => {
    const btn = document.createElement('button');
    btn.className = 'game-tab';
    btn.dataset.game = key;
    btn.innerHTML = gameLogoEl(key);
    btn.addEventListener('click', () => switchGame(key));
    $gameTabs.appendChild(btn);
  });
}

function switchGame(game) {
  currentGame = game;
  filterRarity = 'all';
  filterElement = 'all';
  filterSpecialty = 'all';
  searchQuery = '';
  $searchInput.value = '';

  $gameTabs.querySelectorAll('.game-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.game === game);
  });

  document.body.dataset.game = game;
  $themeStrip.style.background =
    `linear-gradient(90deg, ${GAMES[game].color} 0%, transparent 80%)`;

  renderAll();
}

// ── Full render ───────────────────────────────
function renderAll() {
  renderFilters();
  renderChars();
  renderWishlist();
}

// ── Filters ──────────────────────────────────
function renderFilters() {
  $filterRarity.querySelectorAll('[data-filter-rarity]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filterRarity === filterRarity);
    btn.onclick = () => {
      filterRarity = btn.dataset.filterRarity;
      $filterRarity.querySelectorAll('[data-filter-rarity]').forEach(b =>
        b.classList.toggle('active', b.dataset.filterRarity === filterRarity));
      renderChars();
    };
  });

  const elements = getElements(currentGame);
  $filterElem.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'pill' + (filterElement === 'all' ? ' active' : '');
  allBtn.textContent = 'All';
  allBtn.onclick = () => { filterElement = 'all'; renderFilters(); renderChars(); };
  $filterElem.appendChild(allBtn);

  elements.forEach(el => {
    const btn = document.createElement('button');
    btn.className = `pill elem-${el}` + (filterElement === el ? ' active' : '');
    btn.dataset.elem = el;
    btn.innerHTML = elemIcon(el, currentGame, 'pill-icon') + `<span>${el}</span>`;
    btn.onclick = () => { filterElement = el; renderFilters(); renderChars(); };
    $filterElem.appendChild(btn);
  });

  // ── Specialty filter ──────────────────────────
  const specialties = getSpecialties(currentGame);
  $filterSpec.innerHTML = '';

  const allSpecBtn = document.createElement('button');
  allSpecBtn.className = 'pill' + (filterSpecialty === 'all' ? ' active' : '');
  allSpecBtn.textContent = SPECIALTY_LABEL[currentGame];
  allSpecBtn.onclick = () => { filterSpecialty = 'all'; renderFilters(); renderChars(); };
  $filterSpec.appendChild(allSpecBtn);

  specialties.forEach(sp => {
    const btn = document.createElement('button');
    btn.className = 'pill spec-pill' + (filterSpecialty === sp ? ' active' : '');
    btn.innerHTML = specIcon(sp, currentGame, 'pill-icon') + `<span>${sp}</span>`;
    btn.onclick = () => { filterSpecialty = sp; renderFilters(); renderChars(); };
    $filterSpec.appendChild(btn);
  });
}

// ── Character grid ────────────────────────────
function renderChars() {
  let chars = getChars(currentGame);

  if (filterRarity !== 'all') chars = chars.filter(c => String(c.rarity) === filterRarity);
  if (filterElement !== 'all') chars = chars.filter(c => c.element === filterElement);
  if (filterSpecialty !== 'all') {
    const specKey = SPECIALTY_KEY[currentGame];
    chars = chars.filter(c => c[specKey] === filterSpecialty);
  }
  if (searchQuery) chars = chars.filter(c => c.name.toLowerCase().includes(searchQuery));

  chars = [...chars].sort((a,b) => {
    if (b.rarity !== a.rarity) return b.rarity - a.rarity;
    return a.name.localeCompare(b.name);
  });

  $charCount.textContent = `${chars.length} characters`;
  $charGrid.innerHTML = '';

  if (!chars.length) {
    const el = document.createElement('div');
    el.className = 'no-results';
    el.textContent = 'No characters found';
    $charGrid.appendChild(el);
    return;
  }

  chars.forEach(char => $charGrid.appendChild(buildCharCard(char)));
}

function buildCharCard(char) {
  const inWish = isInWishlist(currentGame, char.id);
  const div = document.createElement('div');
  div.className = `char-card rarity-${char.rarity}${inWish ? ' in-wishlist' : ''}`;
  div.title = char.name;

  const specKey = SPECIALTY_KEY[currentGame];
  const spec = char[specKey];

  div.innerHTML = `
    <div class="char-avatar">
      ${char.image_url
        ? `<img src="${char.image_url}" alt="${char.name}" loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''}
      <div class="avatar-fallback" style="${char.image_url ? 'display:none' : ''}">
        ${elemIcon(char.element, currentGame) || '✦'}
      </div>
      <div class="rarity-badge">${char.rarity}★</div>
    </div>
    <div class="char-name">${char.name}</div>
    <div class="char-tags">
      ${elemIcon(char.element, currentGame)}
      ${specIcon(spec, currentGame)}
    </div>
  `;

  if (!inWish) {
    div.addEventListener('click', () => {
      if (addToWishlist(currentGame, char)) {
        div.classList.add('in-wishlist');
        renderWishlist();
      }
    });
  }
  return div;
}

// ── Wishlist ──────────────────────────────────
function renderWishlist() {
  const list = getWishlist(currentGame);
  $wishCount.textContent = `${list.length} entr${list.length !== 1 ? 'ies' : 'y'}`;
  $wishlistBody.innerHTML = '';

  if (!list.length) {
    $wishlistBody.innerHTML = `
      <div class="wish-empty">
        <div class="wish-empty-glyph">✦</div>
        <p>Add characters from the list</p>
      </div>`;
    return;
  }

  list.forEach((item, idx) => {
    $wishlistBody.appendChild(buildWishItem(item, idx, list.length));
  });
}

function buildWishItem(item, idx, total) {
  const game = GAMES[currentGame];
  const specKey = SPECIALTY_KEY[currentGame];
  const spec = item[specKey];
  const div = document.createElement('div');
  div.className = `wish-item rarity-${item.rarity}`;

  const dupOpts = game.dupOptions.map(o =>
    `<option value="${o}"${item.target === o ? ' selected' : ''}>${o}</option>`
  ).join('');

  div.innerHTML = `
    <div class="wish-top">
      <div class="wish-rank">${idx + 1}</div>
      <div class="wish-avatar">
        ${item.image_url
          ? `<img src="${item.image_url}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${elemIcon(item.element, currentGame)||'✦'}</div>`
        }
      </div>
      <div class="wish-info">
        <div class="wish-name">${item.name}</div>
        <div class="wish-meta">
          ${elemIcon(item.element, currentGame, 'wish-meta-icon')}
          ${item.element ? `<span class="wish-meta-text">${item.element}</span>` : ''}
          ${specIcon(spec, currentGame, 'wish-meta-icon')}
          ${spec ? `<span class="wish-meta-text">${spec}</span>` : ''}
        </div>
      </div>
      <div class="wish-actions">
        <div style="display:flex;flex-direction:column;gap:2px">
          <button class="btn-move" data-dir="-1" ${idx===0?'disabled':''}>▲</button>
          <button class="btn-move" data-dir="1"  ${idx===total-1?'disabled':''}>▼</button>
        </div>
        <button class="btn-remove">✕</button>
      </div>
    </div>
    <div class="wish-controls">
      <div class="ctrl-group" style="max-width:95px">
        <div class="ctrl-label">${game.dupLabel}</div>
        <select class="ctrl-select" data-field="target">${dupOpts}</select>
      </div>
      <div class="ctrl-group">
        <div class="ctrl-label">Weapon</div>
        <input class="ctrl-input" type="text" data-field="weapon"
               placeholder="Target weapon…" value="${item.weapon||''}" />
      </div>
    </div>
  `;

  div.querySelector('.btn-remove').addEventListener('click', () => {
    removeFromWishlist(currentGame, item.id);
    renderChars();
    renderWishlist();
  });
  div.querySelectorAll('.btn-move').forEach(btn => {
    btn.addEventListener('click', () => {
      if (moveWishItem(currentGame, idx, parseInt(btn.dataset.dir))) renderWishlist();
    });
  });
  div.querySelector('[data-field="target"]').addEventListener('change', e =>
    updateWishItem(currentGame, item.id, 'target', e.target.value));
  div.querySelector('[data-field="weapon"]').addEventListener('input', e =>
    updateWishItem(currentGame, item.id, 'weapon', e.target.value));

  return div;
}

// ── Toast ─────────────────────────────────────
function showToast(msg, duration=2500) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ── Boot ──────────────────────────────────────
init();
