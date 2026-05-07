/* ═══════════════════════════════════════════════
   wishlist.js — Wishlist state & localStorage
   ═══════════════════════════════════════════════ */

const STORAGE_KEY = 'gacha-planner-v1';

// State: { genshin: [...], hsr: [...], zzz: [...], wuwa: [...] }
let wishlists = { genshin: [], hsr: [], zzz: [], wuwa: [] };

function loadWishlists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.keys(wishlists).forEach(g => {
        if (Array.isArray(parsed[g])) wishlists[g] = parsed[g];
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

function getWishlist(game) {
  return wishlists[game] || [];
}

function isInWishlist(game, charId) {
  return wishlists[game].some(w => w.id === charId);
}

function addToWishlist(game, char) {
  if (isInWishlist(game, char.id)) return false;
  const game_cfg = GAMES[game];
  wishlists[game].push({
    id: char.id,
    name: char.name,
    rarity: char.rarity,
    element: char.element,
    specialty: char.specialty,
    image_url: char.image_url || '',
    target: game_cfg.dupOptions[0],
    weapon: '',
  });
  saveWishlists();
  return true;
}

function removeFromWishlist(game, charId) {
  wishlists[game] = wishlists[game].filter(w => w.id !== charId);
  saveWishlists();
}

function moveWishItem(game, index, direction) {
  const list = wishlists[game];
  const newIdx = index + direction;
  if (newIdx < 0 || newIdx >= list.length) return false;
  [list[index], list[newIdx]] = [list[newIdx], list[index]];
  saveWishlists();
  return true;
}

function updateWishItem(game, charId, field, value) {
  const item = wishlists[game].find(w => w.id === charId);
  if (item) {
    item[field] = value;
    saveWishlists();
  }
}

// ── Export / Import ─────────────────────────

function exportWishlists() {
  const data = {
    version: 1,
    exported: new Date().toISOString(),
    wishlists,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gacha-wishlist-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importWishlists(file, onDone) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const src = parsed.wishlists || parsed;
      let count = 0;
      Object.keys(wishlists).forEach(g => {
        if (Array.isArray(src[g])) {
          wishlists[g] = src[g];
          count += src[g].length;
        }
      });
      saveWishlists();
      onDone(null, count);
    } catch(err) {
      onDone(err);
    }
  };
  reader.readAsText(file);
}
