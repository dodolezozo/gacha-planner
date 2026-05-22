/* ═══════════════════════════════════════════════
   app.js — Main application logic
   ═══════════════════════════════════════════════ */

// ── Feature flags ────────────────────────────
const WEAPONS_ENABLED = false;  // set true to re-enable weapon picker

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
const $wishCost    = document.getElementById('wishCost');

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


// ── Weapon picker ─────────────────────────────
let wpCurrentItemId   = null;
let wpCurrentItemSpec = null;   // character's specialty — used to pre-filter list

// Normalize specialty values that differ between character data and weapon data
const SPEC_NORMALIZE = {
  'Pole': 'Polearm',  // GI character scraper stores "Pole", weapon scraper stores "Polearm"
};

let $wpPopup, $wpSearch, $wpList;

function initWeaponPicker() {
  $wpPopup = document.createElement('div');
  $wpPopup.className = 'weapon-picker-popup';
  $wpPopup.innerHTML = `
    <input class="weapon-picker-search" type="text" placeholder="Search…" autocomplete="off">
    <div class="weapon-picker-list"></div>
  `;
  document.body.appendChild($wpPopup);

  $wpSearch = $wpPopup.querySelector('.weapon-picker-search');
  $wpList   = $wpPopup.querySelector('.weapon-picker-list');

  $wpSearch.addEventListener('input', () => fillWeaponList($wpSearch.value.toLowerCase()));

  // Close on outside click
  document.addEventListener('click', (e) => {
    if ($wpPopup.classList.contains('open') &&
        !$wpPopup.contains(e.target) &&
        !e.target.closest('.weapon-picker-btn')) {
      closeWeaponPicker();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeWeaponPicker();
  });
}

function openWeaponPicker(itemId, triggerEl, itemSpec) {
  wpCurrentItemId   = itemId;
  wpCurrentItemSpec = itemSpec ? (SPEC_NORMALIZE[itemSpec] || itemSpec) : null;
  $wpSearch.value   = '';

  // Placeholder hints: "Sword…" when filtered, generic otherwise
  $wpSearch.placeholder = wpCurrentItemSpec ? `${wpCurrentItemSpec}… (type to search all)` : 'Search…';

  fillWeaponList('');

  $wpPopup.classList.add('open');

  // Position popup fixed relative to trigger button
  const rect  = triggerEl.getBoundingClientRect();
  const popW  = 284;
  const popH  = 340;
  const left  = Math.max(8, Math.min(rect.left, window.innerWidth - popW - 8));
  const below = rect.bottom + 4;
  const above = rect.top - popH - 4;
  const top   = (below + popH < window.innerHeight) ? below : Math.max(8, above);

  $wpPopup.style.left = `${left}px`;
  $wpPopup.style.top  = `${top}px`;

  requestAnimationFrame(() => $wpSearch.focus());
}

function closeWeaponPicker() {
  $wpPopup.classList.remove('open');
  wpCurrentItemId   = null;
  wpCurrentItemSpec = null;
}

function fillWeaponList(query) {
  const allWeapons = getWeapons(currentGame);

  // When no query is typed, restrict to the character's matching type.
  // Typing anything searches the full list by name.
  let weapons;
  if (query) {
    weapons = allWeapons.filter(w => w.name.toLowerCase().includes(query));
  } else if (wpCurrentItemSpec) {
    weapons = allWeapons.filter(w => w.type === wpCurrentItemSpec);
  } else {
    weapons = [...allWeapons];
  }

  weapons = [...weapons].sort((a, b) => {
    if (b.rarity !== a.rarity) return b.rarity - a.rarity;
    return a.name.localeCompare(b.name);
  });

  $wpList.innerHTML = '';

  // "None" clear option
  const noneEl = document.createElement('div');
  noneEl.className = 'weapon-opt weapon-opt-none';
  noneEl.textContent = '— None —';
  noneEl.addEventListener('click', () => selectWeapon(null));
  $wpList.appendChild(noneEl);

  if (!weapons.length) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'weapon-opt-empty';
    emptyEl.textContent = query
      ? 'No results'
      : (allWeapons.length ? `No ${wpCurrentItemSpec} weapons found` : 'Run scrape_weapons.py first');
    $wpList.appendChild(emptyEl);
    return;
  }

  const rarityOpts = GAMES[currentGame].rarityOptions || [];

  weapons.forEach(w => {
    const rLabel = (rarityOpts.find(o => o.val === w.rarity) || {}).label || `${w.rarity}★`;

    const el = document.createElement('div');
    el.className = `weapon-opt rarity-${w.rarity}`;
    el.innerHTML = `
      ${w.image_url
        ? `<img class="weapon-opt-img" src="${w.image_url}" alt="${w.name}" loading="lazy" onerror="this.style.display='none'">`
        : `<div class="weapon-opt-img-ph"></div>`}
      <div class="weapon-opt-info">
        <div class="weapon-opt-name">${w.name}</div>
        <div class="weapon-opt-meta">${rLabel}${w.type ? ' · ' + w.type : ''}</div>
      </div>
    `;
    el.addEventListener('click', () => selectWeapon(w.id));
    $wpList.appendChild(el);
  });
}

function selectWeapon(weaponId) {
  if (!wpCurrentItemId) return;
  updateWishItem(currentGame, wpCurrentItemId, 'weaponId', weaponId);
  closeWeaponPicker();
  renderWishlist();
}

// ── Init ─────────────────────────────────────
async function init() {
  loadWishlists();
  await loadCharacters();
  if (WEAPONS_ENABLED) await loadWeapons();
  buildGameTabs();
  if (WEAPONS_ENABLED) initWeaponPicker();
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
  // ── Rarity pills (rebuilt per game for custom labels) ──────────────────────
  const rarityOpts = GAMES[currentGame].rarityOptions || [{val:5,label:'5★'},{val:4,label:'4★'}];
  $filterRarity.innerHTML = '';

  const allRarityBtn = document.createElement('button');
  allRarityBtn.className = 'pill' + (filterRarity === 'all' ? ' active' : '');
  allRarityBtn.dataset.filterRarity = 'all';
  allRarityBtn.textContent = 'Rarity';
  $filterRarity.appendChild(allRarityBtn);

  rarityOpts.forEach(({val, label}) => {
    const btn = document.createElement('button');
    btn.className = 'pill' + (filterRarity === String(val) ? ' active' : '');
    btn.dataset.filterRarity = String(val);
    btn.textContent = label;
    $filterRarity.appendChild(btn);
  });

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
  allBtn.textContent = GAMES[currentGame].elementLabel || 'Element';
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
  if (filterElement !== 'all') chars = chars.filter(c =>
    Array.isArray(c.elements) ? c.elements.includes(filterElement) : c.element === filterElement
  );
  if (filterSpecialty !== 'all') {
    const specKey = SPECIALTY_KEY[currentGame];
    const pluralKey = specKey + 's';
    chars = chars.filter(c =>
      Array.isArray(c[pluralKey]) ? c[pluralKey].includes(filterSpecialty) : c[specKey] === filterSpecialty
    );
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

// ── Wishlist cost ──────────────────────────────
function renderWishCost() {
  const game_cfg = GAMES[currentGame];
  const allOpts  = ['None', ...game_cfg.dupOptions]; // ['None','C0'..'C6']
  const topLabel = game_cfg.rarityOptions?.[0]?.label ?? '5★';

  const total = getWishlist(currentGame).reduce((sum, item) => {
    if (item.rarity !== 5) return sum;
    const ci = allOpts.indexOf(item.current ?? 'None');
    const ti = allOpts.indexOf(item.target  ?? game_cfg.dupOptions[0]);
    return sum + Math.max(0, ti - ci);
  }, 0);

  if (total > 0) {
    $wishCost.textContent = `${total} ${topLabel}`;
    $wishCost.classList.add('visible');
  } else {
    $wishCost.textContent = '';
    $wishCost.classList.remove('visible');
  }
}

// ── Wishlist ──────────────────────────────────
function renderWishlist() {
  const list = getWishlist(currentGame);
  $wishCount.textContent = `${list.length} entr${list.length !== 1 ? 'ies' : 'y'}`;
  renderWishCost();
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
  const game    = GAMES[currentGame];
  const specKey = SPECIALTY_KEY[currentGame];
  const spec    = item[specKey];
  const div     = document.createElement('div');
  div.className = `wish-item rarity-${item.rarity}`;

  const currentVal = item.current ?? 'None';
  const targetVal  = item.target  ?? game.dupOptions[0];

  const currentOpts = ['None', ...game.dupOptions].map(o =>
    `<option value="${o}"${currentVal === o ? ' selected' : ''}>${o}</option>`
  ).join('');
  const targetOpts = game.dupOptions.map(o =>
    `<option value="${o}"${targetVal === o ? ' selected' : ''}>${o}</option>`
  ).join('');

  // Weapon picker state
  const weaponId   = item.weaponId   || null;
  const weaponData = weaponId ? (getWeapons(currentGame).find(w => w.id === weaponId) || null) : null;
  const weaponRef  = item.weaponRefine || 'None';

  const wBtnContent = weaponData
    ? `${weaponData.image_url
        ? `<img class="weapon-btn-img" src="${weaponData.image_url}" alt="${weaponData.name}" loading="lazy" onerror="this.style.display='none'">`
        : ''
      }<span class="weapon-btn-name">${weaponData.name}</span>`
    : `<span class="weapon-btn-name weapon-btn-none">None</span>`;

  const refineOpts = ['None','R1','R2','R3','R4','R5'].map(r =>
    `<option value="${r}"${weaponRef === r ? ' selected' : ''}>${r}</option>`
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
      <div class="ctrl-group" style="max-width:80px">
        <div class="ctrl-label">Current</div>
        <select class="ctrl-select" data-field="current">${currentOpts}</select>
      </div>
      <div class="ctrl-group" style="max-width:80px">
        <div class="ctrl-label">Target</div>
        <select class="ctrl-select" data-field="target">${targetOpts}</select>
      </div>
    </div>
    ${WEAPONS_ENABLED ? `
    <div class="wish-controls">
      <div class="ctrl-group">
        <div class="ctrl-label">${game.weaponLabel}</div>
        <button class="weapon-picker-btn" title="Pick target ${game.weaponLabel}">
          ${wBtnContent}
          <span class="weapon-btn-arrow">▾</span>
        </button>
      </div>
      <div class="ctrl-group" style="max-width:68px">
        <div class="ctrl-label">Refine</div>
        <select class="ctrl-select" data-field="weaponRefine">${refineOpts}</select>
      </div>
    </div>` : ''}
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
  div.querySelector('[data-field="current"]').addEventListener('change', e => {
    updateWishItem(currentGame, item.id, 'current', e.target.value);
    renderWishCost();
  });
  div.querySelector('[data-field="target"]').addEventListener('change', e => {
    updateWishItem(currentGame, item.id, 'target', e.target.value);
    renderWishCost();
  });
  if (WEAPONS_ENABLED) {
    div.querySelector('[data-field="weaponRefine"]').addEventListener('change', e =>
      updateWishItem(currentGame, item.id, 'weaponRefine', e.target.value));
    div.querySelector('.weapon-picker-btn').addEventListener('click', function() {
      openWeaponPicker(item.id, this, spec);
    });
  }

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
