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
    elementLabel: 'Element',
    rarityOptions: [{val:5,label:'5★'},{val:4,label:'4★'}],
    weaponLabel: 'Weapon',
  },
  hsr: {
    name: 'Honkai: Star Rail',
    abbr: 'Star Rail',
    color: '#7eb8f7',
    dupLabel: 'Eidolon',
    dupOptions: ['E0','E1','E2','E3','E4','E5','E6'],
    elementLabel: 'Element',
    rarityOptions: [{val:5,label:'5★'},{val:4,label:'4★'}],
    weaponLabel: 'Lightcone',
  },
  zzz: {
    name: 'Zenless Zone Zero',
    abbr: 'ZZZ',
    color: '#f0b830',
    dupLabel: 'Mindscape',
    dupOptions: ['M0','M1','M2','M3','M4','M5','M6'],
    elementLabel: 'Attribute',
    rarityOptions: [{val:5,label:'S-Rank'},{val:4,label:'A-Rank'}],
    weaponLabel: 'W-Engine',
  },
  wuwa: {
    name: 'Wuthering Waves',
    abbr: 'WuWa',
    color: '#4ee8c0',
    dupLabel: 'Sequence',
    dupOptions: ['S0','S1','S2','S3','S4','S5','S6'],
    elementLabel: 'Element',
    rarityOptions: [{val:5,label:'5★'},{val:4,label:'4★'}],
    weaponLabel: 'Weapon',
  },
  sds: {
    name: 'The Seven Deadly Sins: Origin',
    abbr: '7DS',
    color: '#e03c3c',
    dupLabel: 'Potential',
    dupOptions: ['P0','P1','P2','P3','P4','P5','P6'],
    elementLabel: 'Element',
    rarityOptions: [{val:5,label:'SSR'},{val:4,label:'SR'}],
    weaponLabel: 'Weapon',
  },
};

const SPECIALTY_KEY = {
  genshin: 'weapon',
  hsr: 'path',
  zzz: 'specialty',
  wuwa: 'weapon',
  sds: 'weapon',
};

// Icon filename prefix per game (e.g. GI_Pyro.svg)
const GAME_PREFIX = {
  genshin: 'GI',
  hsr: 'HSR',
  zzz: 'ZZZ',
  wuwa: 'WW',
  sds: 'SDS',
};

// Human-readable label for the specialty field per game
const SPECIALTY_LABEL = {
  genshin: 'Weapon',
  hsr: 'Path',
  zzz: 'Specialty',
  wuwa: 'Weapon',
  sds: 'Weapon',
};

// Fallback emoji avatars per element (when image fails)
const ELEMENT_EMOJI = {
  Pyro:'🔥', Hydro:'💧', Anemo:'🌀', Electro:'⚡', Dendro:'🌿', Cryo:'❄️', Geo:'🪨',
  Fire:'🔥', Ice:'❄️', Wind:'🌀', Lightning:'⚡', Quantum:'🔮', Imaginary:'✨', Physical:'⚔️',
  Electric:'⚡', Ether:'💫',
  Glacio:'❄️', Fusion:'🔥', Aero:'🌬️', Spectro:'🌟', Havoc:'🌑',
  // SDS elements
  Earth:'🪨', Cold:'❄️', Holy:'✨', Darkness:'🌑',
};

// Fallback emoji for specialty/weapon/path (when image fails)
const SPECIALTY_EMOJI = {
  // GI weapons
  Sword:'⚔️', Claymore:'🗡️', Pole:'🪄', Bow:'🏹', Catalyst:'📿',
  // HSR paths
  'The Hunt':'🎯', Erudition:'📚', Harmony:'🎵', Nihility:'🌑',
  Preservation:'🛡️', Abundance:'💚', Destruction:'💥', Remembrance:'💭',
  Elation:'😊', Propagation:'💫', 'Follow-up':'⚡',
  // ZZZ
  Attack:'⚔️', Stun:'⚡', Anomaly:'❓', Support:'💙', Defense:'🛡️', Rupture:'💢',
  // WuWa
  Broadblade:'🗡️', Pistols:'🔫', Gauntlets:'👊', Rectifier:'🔮',
  // SDS weapons
  Axe:'🪓', Grimoire:'📖', Nunchaku:'🥷', Lance:'🏹', Rapier:'⚔️',
  'Sword and Shield':'🛡️', 'Dual Swords':'⚔️', Greatsword:'🗡️', Longsword:'⚔️', Wand:'🪄',
  // SDS roles
  Attacker:'⚔️', Supporter:'💙', Warden:'🛡️', Buster:'💥', Healer:'💚',
};

// Will hold loaded data
let ALL_CHARS   = {};
let ALL_WEAPONS = {};

async function loadCharacters() {
  const games = Object.keys(GAMES);
  try {
    const results = await Promise.all(
      games.map(g => fetch(`./data/characters_${g}.json`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} (${g})`);
        return r.json();
      }))
    );
    games.forEach((g, i) => { ALL_CHARS[g] = results[i]; });
    console.log('[Data] Loaded:', games.map(g=>`${g}:${ALL_CHARS[g].length}`).join(' '));
  } catch(e) {
    console.error('[Data] Failed to load character files:', e);
    games.forEach(g => { if (!ALL_CHARS[g]) ALL_CHARS[g] = []; });
  }
  return ALL_CHARS;
}

async function loadWeapons() {
  // Only the 4 games with akademiya scrapers have weapon data
  const games = ['genshin', 'hsr', 'zzz', 'wuwa'];
  await Promise.all(games.map(g =>
    fetch(`./data/weapons_${g}.json`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { ALL_WEAPONS[g] = Array.isArray(data) ? data : []; })
      .catch(() => { ALL_WEAPONS[g] = []; })
  ));
  console.log('[Data] Weapons:', games.map(g => `${g}:${ALL_WEAPONS[g].length}`).join(' '));
}

function getChars(game) {
  return ALL_CHARS[game] || [];
}

function getWeapons(game) {
  return ALL_WEAPONS[game] || [];
}

function getElements(game) {
  const chars = getChars(game);
  const set = new Set();
  chars.forEach(c => {
    if (Array.isArray(c.elements)) c.elements.forEach(e => e && set.add(e));
    else if (c.element) set.add(c.element);
  });
  return [...set].sort();
}

function getSpecialties(game) {
  const chars = getChars(game);
  const key = SPECIALTY_KEY[game];
  const pluralKey = key + 's'; // e.g. 'roles', 'weapons'
  const set = new Set();
  chars.forEach(c => {
    if (Array.isArray(c[pluralKey])) c[pluralKey].forEach(v => v && set.add(v));
    else if (c[key]) set.add(c[key]);
  });
  return [...set].sort();
}
