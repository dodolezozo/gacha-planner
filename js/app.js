/* ═══════════════════════════════════════════════
   app.js — Main application logic
   ═══════════════════════════════════════════════ */

// ── State ────────────────────────────────────
let currentGame = 'genshin';
let filterRarity = 'all';
let filterElement = 'all';
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
const $filterElement=document.getElementById('filterElement');
const $btnExport   = document.getElementById('btnExport');
const $btnImport   = document.getElementById('btnImport');
const $importInput = document.getElementById('importInput');

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
    btn.innerHTML = `<span class="tab-dot"></span><span>${game.abbr}</span>`;
    btn.addEventListener('click', () => switchGame(key));
    $gameTabs.appendChild(btn);
  });
}

function switchGame(game) {
  currentGame = game;
  filterRarity = 'all';
  filterElement = 'all';
  searchQuery = '';
  $searchInput.value = '';

  // Update tab active state
  $gameTabs.querySelectorAll('.game-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.game === game);
  });

  // Update body theme
  document.body.dataset.game = game;

  // Update theme strip
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

// ── Element filter pills ──────────────────────
function renderFilters() {
  // Rarity pills
  $filterRarity.querySelectorAll('[data-filter-rarity]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filterRarity === filterRarity);
    btn.onclick = () => {
      filterRarity = btn.dataset.filterRarity;
      $filterRarity.querySelectorAll('[data-filter-rarity]').forEach(b =>
        b.classList.toggle('active', b.dataset.filterRarity === filterRarity));
      renderChars();
    };
  });

  // Element pills
  const elements = getElements(currentGame);
  $filterElement.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'pill' + (filterElement === 'all' ? ' active' : '');
  allBtn.textContent = 'All';
  allBtn.onclick = () => { filterElement = 'all'; renderFilters(); renderChars(); };
  $filterElement.appendChild(allBtn);

  elements.forEach(el => {
    const btn = document.createElement('button');
    btn.className = `pill elem-${el}` + (filterElement === el ? ' active' : '');
    btn.dataset.elem = el;
    btn.textContent = el;
    btn.onclick = () => { filterElement = el; renderFilters(); renderChars(); };
    $filterElement.appendChild(btn);
  });
}

// ── Character grid ────────────────────────────
function renderChars() {
  let chars = getChars(currentGame);

  // Filters
  if (filterRarity !== 'all') {
    chars = chars.filter(c => String(c.rarity) === filterRarity);
  }
  if (filterElement !== 'all') {
    chars = chars.filter(c => c.element === filterElement);
  }
  if (searchQuery) {
    chars = chars.filter(c => c.name.toLowerCase().includes(searchQuery));
  }

  // Sort: 5★ first, then alphabetical
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

  chars.forEach(char => {
    $charGrid.appendChild(buildCharCard(char));
  });
}

function buildCharCard(char) {
  const inWish = isInWishlist(currentGame, char.id);
  const div = document.createElement('div');
  div.className = `char-card rarity-${char.rarity}${inWish ? ' in-wishlist' : ''}`;
  div.title = char.name;

  const elemEmoji = ELEMENT_EMOJI[char.element] || '✦';

  div.innerHTML = `
    <div class="char-avatar">
      ${char.image_url
        ? `<img src="${char.image_url}" alt="${char.name}" loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''}
      <div class="avatar-fallback" style="${char.image_url ? 'display:none' : ''}">${elemEmoji}</div>
      <div class="rarity-badge">${char.rarity}★</div>
    </div>
    <div class="char-name">${char.name}</div>
    ${char.element ? `<div class="elem-dot elem-${char.element}" title="${char.element}"></div>` : ''}
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
  const div = document.createElement('div');
  div.className = `wish-item rarity-${item.rarity}`;
  div.dataset.id = item.id;

  const dupOpts = game.dupOptions.map(o =>
    `<option value="${o}"${item.target === o ? ' selected' : ''}>${o}</option>`
  ).join('');

  const meta = [item.element, item.specialty].filter(Boolean).join(' · ');

  div.innerHTML = `
    <div class="wish-top">
      <div class="wish-rank">${idx + 1}</div>
      <div class="wish-avatar">
        ${item.image_url
          ? `<img src="${item.image_url}" alt="${item.name}" loading="lazy"
                onerror="this.style.display='none'">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:18px">${ELEMENT_EMOJI[item.element]||'✦'}</div>`
        }
      </div>
      <div class="wish-info">
        <div class="wish-name">${item.name}</div>
        ${meta ? `<div class="wish-meta">${meta}</div>` : ''}
      </div>
      <div class="wish-actions">
        <div style="display:flex;flex-direction:column;gap:2px">
          <button class="btn-move" data-dir="-1" ${idx === 0 ? 'disabled' : ''} title="Move up">▲</button>
          <button class="btn-move" data-dir="1" ${idx === total-1 ? 'disabled' : ''} title="Move down">▼</button>
        </div>
        <button class="btn-remove" title="Remove">✕</button>
      </div>
    </div>
    <div class="wish-controls">
      <div class="ctrl-group" style="max-width:90px">
        <div class="ctrl-label">${game.dupLabel}</div>
        <select class="ctrl-select" data-field="target">${dupOpts}</select>
      </div>
      <div class="ctrl-group">
        <div class="ctrl-label">Weapon</div>
        <input class="ctrl-input" type="text" data-field="weapon"
               placeholder="Target weapon…" value="${item.weapon || ''}" />
      </div>
    </div>
  `;

  // Events
  div.querySelector('.btn-remove').addEventListener('click', () => {
    removeFromWishlist(currentGame, item.id);
    renderChars();
    renderWishlist();
  });

  div.querySelectorAll('.btn-move').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = parseInt(btn.dataset.dir);
      if (moveWishItem(currentGame, idx, dir)) renderWishlist();
    });
  });

  div.querySelector('[data-field="target"]').addEventListener('change', (e) => {
    updateWishItem(currentGame, item.id, 'target', e.target.value);
  });

  div.querySelector('[data-field="weapon"]').addEventListener('input', (e) => {
    updateWishItem(currentGame, item.id, 'weapon', e.target.value);
  });

  return div;
}

// ── Toast ─────────────────────────────────────
function showToast(msg, duration = 2500) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ── Boot ──────────────────────────────────────
init();
