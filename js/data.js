/* ═══════════════════════════════════════════════
   data.js — Game config & character loader
   ═══════════════════════════════════════════════ */

const GAMES = {
  genshin: {
    name: 'Genshin Impact',
    abbr: 'Genshin',
    color: '#c9a96e',
    dupLabel: 'Constellation',
    dupOptions: ['C0','C1','C2','C3','C4','C5','C6'],
  },
  hsr: {
    name: 'Honkai: Star Rail',
    abbr: 'Star Rail',
    color: '#7eb8f7',
    dupLabel: 'Eidolon',
    dupOptions: ['E0','E1','E2','E3','E4','E5','E6'],
  },
  zzz: {
    name: 'Zenless Zone Zero',
    abbr: 'ZZZ',
    color: '#f0b830',
    dupLabel: 'Mindscape',
    dupOptions: ['M0','M1','M2','M3','M4','M5','M6'],
  },
  wuwa: {
    name: 'Wuthering Waves',
    abbr: 'WuWa',
    color: '#4ee8c0',
    dupLabel: 'Sequence',
    dupOptions: ['S0','S1','S2','S3','S4','S5','S6'],
  },
};

// Fallback emoji avatars per element (when image fails)
const ELEMENT_EMOJI = {
  Pyro:'🔥', Hydro:'💧', Anemo:'🌀', Electro:'⚡', Dendro:'🌿', Cryo:'❄️', Geo:'🪨',
  Fire:'🔥', Ice:'❄️', Wind:'🌀', Lightning:'⚡', Quantum:'🔮', Imaginary:'✨', Physical:'⚔️',
  Electric:'⚡', Ether:'💫',
  Glacio:'❄️', Fusion:'🔥', Aero:'🌬️', Spectro:'🌟', Havoc:'🌑',
};

const SPECIALTY_KEY = {
  genshin: 'weapon',
  hsr: 'path',
  zzz: 'specialty',
  wuwa: 'weapon',
};

// Will hold loaded data
let ALL_CHARS = {};

async function loadCharacters() {
  try {
    const r = await fetch('./data/characters_all.json');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    ALL_CHARS = await r.json();
    console.log('[Data] Loaded:', Object.entries(ALL_CHARS).map(([g,c])=>`${g}:${c.length}`).join(' '));
  } catch(e) {
    console.error('[Data] Failed to load characters_all.json:', e);
    ALL_CHARS = { genshin:[], hsr:[], zzz:[], wuwa:[] };
  }
  return ALL_CHARS;
}

function getChars(game) {
  return ALL_CHARS[game] || [];
}

function getElements(game) {
  const chars = getChars(game);
  const set = new Set(chars.map(c => c.element).filter(Boolean));
  return [...set].sort();
}

function getSpecialties(game) {
  const chars = getChars(game);
  const set = new Set(chars.map(c => c.specialty).filter(Boolean));
  return [...set].sort();
}
