/* ═══════════════════════════════════════════════
   wishlist.js — Wishlist state & localStorage
   ═══════════════════════════════════════════════ */

const STORAGE_KEY = 'gacha-planner-v1';

// State: keyed by game id, initialized lazily so new games work automatically
let wishlists = {};

// ── Core accessors ────────────────────────────
function getWishlist(game) {
  if (!wishlists[game]) wishlists[game] = [];
  return wishlists[game];
}

function isInWishlist(game, charId) {
  return getWishlist(game).some(w => w.id === charId);
}

function addToWishlist(game, char) {
  if (isInWishlist(game, char.id)) return false;
  const game_cfg = GAMES[game];
  const specKey  = SPECIALTY_KEY[game];
  getWishlist(game).push({
    id:        char.id,
    name:      char.name,
    rarity:    char.rarity,
    element:   char.element,
    [specKey]: char[specKey],       // store under the game-specific key
    image_url: char.image_url || '',
    current:      'None',
    target:       game_cfg.dupOptions[0],
    weaponId:     null,
    weaponRefine: 'None',
  });
  saveWishlists();
  return true;
}

function removeFromWishlist(game, charId) {
  wishlists[game] = getWishlist(game).filter(w => w.id !== charId);
  saveWishlists();
}

function moveWishItem(game, index, direction) {
  const list   = getWishlist(game);
  const newIdx = index + direction;
  if (newIdx < 0 || newIdx >= list.length) return false;
  [list[index], list[newIdx]] = [list[newIdx], list[index]];
  saveWishlists();
  return true;
}

function updateWishItem(game, charId, field, value) {
  const item = getWishlist(game).find(w => w.id === charId);
  if (item) { item[field] = value; saveWishlists(); }
}

// ── Persistence ───────────────────────────────
function loadWishlists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Accept any game key found in storage (handles new games automatically)
      Object.entries(parsed).forEach(([g, v]) => {
        if (Array.isArray(v)) wishlists[g] = v;
      });
    }
  } catch(e) {
    console.warn('[Wishlist] Load failed:', e);
  }
}

function saveWishlists() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlists));
  } catch(e) {
    console.warn('[Wishlist] Save failed:', e);
  }
}

// ── Export / Import ───────────────────────────
function exportWishlists() {
  const data = { version: 1, exported: new Date().toISOString(), wishlists };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `gacha-wishlist-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}

function importWishlists(file, onDone) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const src    = parsed.wishlists || parsed;
      let count    = 0;
      Object.entries(src).forEach(([g, v]) => {
        if (Array.isArray(v)) { wishlists[g] = v; count += v.length; }
      });
      saveWishlists();
      onDone(null, count);
    } catch(err) { onDone(err); }
  };
  reader.readAsText(file);
}
