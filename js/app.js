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

// ── Game logo SVGs (inline, no external dep) ─
const GAME_LOGOS = {
  genshin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32">
    <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8d090"/><stop offset="100%" stop-color="#c9a050"/></linearGradient></defs>
    <path d="M14 6 C14 6 22 8 22 16 C22 22 17 26 12 24 C8 22 7 17 10 14 C12 11 17 12 18 15 C19 17 17 19 15 18" fill="none" stroke="url(#gg)" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="15" cy="18" r="1.5" fill="#c9a050"/>
    <text x="28" y="21" font-family="Georgia,serif" font-size="13" font-weight="bold" fill="url(#gg)" letter-spacing="0.5">GENSHIN</text>
  </svg>`,
  hsr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32">
    <defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#90c8ff"/><stop offset="100%" stop-color="#5090e8"/></linearGradient></defs>
    <path d="M8 24 L18 8 L22 12 Z" fill="url(#hg)" opacity="0.9"/>
    <path d="M8 24 L12 20 L16 22 Z" fill="#7090c0" opacity="0.6"/>
    <circle cx="18" cy="8" r="3" fill="#b0d8ff"/>
    <circle cx="6" cy="10" r="1" fill="#7eb8f7"/>
    <circle cx="24" cy="20" r="1" fill="#7eb8f7"/>
    <text x="30" y="14" font-family="Georgia,serif" font-size="9" font-weight="bold" fill="url(#hg)" letter-spacing="0.5">HONKAI</text>
    <text x="30" y="25" font-family="Georgia,serif" font-size="9" font-weight="bold" fill="url(#hg)" letter-spacing="0.3">STAR RAIL</text>
  </svg>`,
  zzz: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32">
    <defs><linearGradient id="zg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe090"/><stop offset="100%" stop-color="#e09000"/></linearGradient></defs>
    <text x="5"  y="15" font-family="Impact,sans-serif" font-size="10" fill="url(#zg)" opacity="0.5">Z</text>
    <text x="10" y="21" font-family="Impact,sans-serif" font-size="12" fill="url(#zg)" opacity="0.75">Z</text>
    <text x="16" y="28" font-family="Impact,sans-serif" font-size="14" fill="url(#zg)">Z</text>
    <text x="34" y="14" font-family="Georgia,serif" font-size="9" font-weight="bold" fill="url(#zg)" letter-spacing="0.5">ZENLESS</text>
    <text x="34" y="25" font-family="Georgia,serif" font-size="9" font-weight="bold" fill="url(#zg)" letter-spacing="0.3">ZONE ZERO</text>
  </svg>`,
  wuwa: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32">
    <defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#90f4d8"/><stop offset="100%" stop-color="#20c090"/></linearGradient></defs>
    <path d="M4 16 Q7 10 10 16 Q13 22 16 16 Q19 10 22 16 Q25 22 28 16" fill="none" stroke="url(#wg)" stroke-width="2.5" stroke-linecap="round"/>
    <text x="4"  y="28" font-family="Georgia,serif" font-size="9" font-weight="bold" fill="url(#wg)" letter-spacing="0.3">WUTHERING WAVES</text>
  </svg>`,
};

// ── Icon SVGs ────────────────────────────────
// Inline SVGs for elements and specialties — avoids any path/fetch issues
const ELEMENT_ICONS = {
  Pyro:      `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="pyr" cx="50%" cy="80%" r="70%"><stop offset="0%" stop-color="#ff9d4a"/><stop offset="100%" stop-color="#e83030"/></radialGradient></defs><path d="M16 3C16 3 22 10 20 15C24 12 25 8 23 5C28 9 29 17 25 22C23 26 19 29 16 29C13 29 9 26 7 22C3 17 4 9 9 5C7 8 8 12 12 15C10 10 16 3 16 3Z" fill="url(#pyr)"/></svg>`,
  Hydro:     `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="hyd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6ee0ff"/><stop offset="100%" stop-color="#1a72d4"/></linearGradient></defs><path d="M16 4L22 13C24 17 24 20 22 23C20 26 18 28 16 28C14 28 12 26 10 23C8 20 8 17 10 13Z" fill="url(#hyd)"/></svg>`,
  Anemo:     `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="anm" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#80ffdc"/><stop offset="100%" stop-color="#2abf8c"/></linearGradient></defs><path d="M16 16C10 10 6 7 8 4C10 1 15 4 16 8C17 4 22 1 24 4C26 7 22 10 16 16Z" fill="url(#anm)"/><path d="M16 16C22 22 26 25 24 28C22 31 17 28 16 24C15 28 10 31 8 28C6 25 10 22 16 16Z" fill="url(#anm)" opacity="0.7"/></svg>`,
  Electro:   `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="elc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d4a8ff"/><stop offset="100%" stop-color="#8844cc"/></linearGradient></defs><polygon points="19,3 12,16 17,16 13,29 22,14 17,14" fill="url(#elc)"/></svg>`,
  Dendro:    `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="den" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a8f060"/><stop offset="100%" stop-color="#4a9920"/></linearGradient></defs><path d="M16 28L16 16M16 16C16 16 9 12 8 6C12 7 15 11 16 16M16 16C16 16 23 12 24 6C20 7 17 11 16 16" stroke="url(#den)" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="8" cy="6" r="3.5" fill="url(#den)"/><circle cx="24" cy="6" r="3.5" fill="url(#den)"/><circle cx="16" cy="4" r="3.5" fill="#c8ff80"/></svg>`,
  Cryo:      `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cry" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c8f4ff"/><stop offset="100%" stop-color="#5ab8d4"/></linearGradient></defs><line x1="16" y1="3" x2="16" y2="29" stroke="url(#cry)" stroke-width="2.5" stroke-linecap="round"/><line x1="3" y1="16" x2="29" y2="16" stroke="url(#cry)" stroke-width="2.5" stroke-linecap="round"/><line x1="7" y1="7" x2="25" y2="25" stroke="url(#cry)" stroke-width="2.5" stroke-linecap="round"/><line x1="25" y1="7" x2="7" y2="25" stroke="url(#cry)" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="16" r="3" fill="white" opacity="0.9"/></svg>`,
  Geo:       `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="geo" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffd060"/><stop offset="100%" stop-color="#c07820"/></linearGradient></defs><polygon points="16,3 26,9 26,21 16,27 6,21 6,9" fill="none" stroke="url(#geo)" stroke-width="2"/><polygon points="16,8 22,12 22,20 16,24 10,20 10,12" fill="url(#geo)" opacity="0.6"/><polygon points="16,11 20,14 20,18 16,21 12,18 12,14" fill="#ffeea0"/></svg>`,
  Fire:      `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="fir" cx="50%" cy="80%" r="70%"><stop offset="0%" stop-color="#ffb060"/><stop offset="100%" stop-color="#cc2020"/></radialGradient></defs><path d="M16 3C16 3 21 9 19 14C23 11 24 7 22 4C27 8 28 16 24 21C22 25 19 28 16 28C13 28 10 25 8 21C4 16 5 8 10 4C8 7 9 11 13 14C11 9 16 3 16 3Z" fill="url(#fir)"/></svg>`,
  Ice:       `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d0f4ff"/><stop offset="100%" stop-color="#50b0d0"/></linearGradient></defs><line x1="16" y1="3" x2="16" y2="29" stroke="url(#ice)" stroke-width="2.5" stroke-linecap="round"/><line x1="3" y1="16" x2="29" y2="16" stroke="url(#ice)" stroke-width="2.5" stroke-linecap="round"/><line x1="7" y1="7" x2="25" y2="25" stroke="url(#ice)" stroke-width="2.5" stroke-linecap="round"/><line x1="25" y1="7" x2="7" y2="25" stroke="url(#ice)" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="16" r="3" fill="white" opacity="0.9"/></svg>`,
  Wind:      `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wnd" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#60eec8"/><stop offset="100%" stop-color="#20a870"/></linearGradient></defs><path d="M5 11 Q16 8 22 11 Q28 14 26 18 Q24 22 18 20" fill="none" stroke="url(#wnd)" stroke-width="2.5" stroke-linecap="round"/><path d="M5 16 Q14 13 20 16 Q26 19 24 23 Q22 27 16 25" fill="none" stroke="url(#wnd)" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/><path d="M5 21 Q12 18 18 21 Q24 24 22 27" fill="none" stroke="url(#wnd)" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/></svg>`,
  Lightning: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lgh" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e0b8ff"/><stop offset="100%" stop-color="#7030cc"/></linearGradient></defs><polygon points="19,3 11,17 17,17 12,29 23,15 17,15" fill="url(#lgh)"/></svg>`,
  Quantum:   `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="qnt" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#c090ff"/><stop offset="100%" stop-color="#5020a0"/></radialGradient></defs><circle cx="16" cy="16" r="10" fill="url(#qnt)" opacity="0.8"/><circle cx="16" cy="16" r="5" fill="none" stroke="#e0c0ff" stroke-width="1.5" stroke-dasharray="3 2"/><circle cx="16" cy="6" r="2.5" fill="#e0c0ff"/><circle cx="24" cy="21" r="2.5" fill="#e0c0ff"/><circle cx="8" cy="21" r="2.5" fill="#e0c0ff"/></svg>`,
  Imaginary: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="img" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff0a0"/><stop offset="100%" stop-color="#c09020"/></linearGradient></defs><polygon points="16,3 19,13 29,13 21,19 24,29 16,23 8,29 11,19 3,13 13,13" fill="url(#img)"/></svg>`,
  Physical:  `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="phy" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d0dcea"/><stop offset="100%" stop-color="#7090b0"/></linearGradient></defs><circle cx="16" cy="16" r="11" fill="url(#phy)"/><circle cx="16" cy="16" r="7" fill="none" stroke="white" stroke-width="1.5" opacity="0.4"/><circle cx="16" cy="16" r="3" fill="white" opacity="0.7"/></svg>`,
  Electric:  `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="elz" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d8b8ff"/><stop offset="100%" stop-color="#7040cc"/></linearGradient></defs><polygon points="20,3 12,17 18,17 13,29 24,15 18,15" fill="url(#elz)"/><polygon points="14,3 6,17 12,17 7,29 18,15 12,15" fill="url(#elz)" opacity="0.5"/></svg>`,
  Ether:     `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="eth" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#f0a0ff"/><stop offset="100%" stop-color="#a020c0"/></radialGradient></defs><path d="M16 4L20 12L29 14L23 20L24 29L16 25L8 29L9 20L3 14L12 12Z" fill="url(#eth)" opacity="0.85"/><circle cx="16" cy="16" r="4" fill="#ffd0ff" opacity="0.6"/></svg>`,
  Glacio:    `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="glc" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#e0f8ff"/><stop offset="100%" stop-color="#4898c8"/></linearGradient></defs><polygon points="16,3 20,12 29,14 22,21 24,30 16,26 8,30 10,21 3,14 12,12" fill="url(#glc)" opacity="0.9"/><circle cx="16" cy="16" r="3.5" fill="white" opacity="0.6"/></svg>`,
  Fusion:    `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="fus" cx="40%" cy="70%" r="70%"><stop offset="0%" stop-color="#ffb060"/><stop offset="100%" stop-color="#d02020"/></radialGradient></defs><path d="M16 4C16 4 20 9 19 13C22 10 23 7 21 5C25 8 26 15 23 19C21 23 19 26 16 26C13 26 11 23 9 19C6 15 7 8 11 5C9 7 10 10 13 13C12 9 16 4 16 4Z" fill="url(#fus)"/></svg>`,
  Aero:      `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="aer" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#90f4d8"/><stop offset="100%" stop-color="#20a888"/></linearGradient></defs><path d="M6 12 Q16 6 26 12" fill="none" stroke="url(#aer)" stroke-width="2.5" stroke-linecap="round"/><path d="M4 17 Q16 11 28 17" fill="none" stroke="url(#aer)" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/><path d="M6 22 Q16 16 26 22" fill="none" stroke="url(#aer)" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/></svg>`,
  Spectro:   `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="spc" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffff80"/><stop offset="100%" stop-color="#c0a000"/></radialGradient></defs><circle cx="16" cy="16" r="8" fill="url(#spc)" opacity="0.9"/><circle cx="16" cy="16" r="11" fill="none" stroke="#ffff80" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"/><circle cx="16" cy="16" r="3.5" fill="white" opacity="0.8"/></svg>`,
  Havoc:     `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="hvc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f080a8"/><stop offset="100%" stop-color="#880040"/></linearGradient></defs><path d="M16 4L12 13L3 13L10 19L7 28L16 22L25 28L22 19L29 13L20 13Z" fill="url(#hvc)" opacity="0.85"/></svg>`,
};

const SPECIALTY_ICONS = {
  // GI weapons
  Sword:      `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sw" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e0eeff"/><stop offset="100%" stop-color="#7090c0"/></linearGradient></defs><line x1="16" y1="4" x2="16" y2="26" stroke="url(#sw)" stroke-width="3" stroke-linecap="round"/><line x1="10" y1="19" x2="22" y2="19" stroke="#a0b8d0" stroke-width="2.5" stroke-linecap="round"/><polygon points="16,4 13,14 19,14" fill="#d0e4f8"/><circle cx="16" cy="27" r="2.5" fill="#8090a8"/></svg>`,
  Claymore:   `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f0e0c0"/><stop offset="100%" stop-color="#907040"/></linearGradient></defs><polygon points="16,3 19,20 16,23 13,20" fill="url(#cl)"/><line x1="9" y1="18" x2="23" y2="18" stroke="#b09060" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="26" r="3" fill="#907040"/></svg>`,
  Pole:    `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe0a0"/><stop offset="100%" stop-color="#c08020"/></linearGradient></defs><line x1="16" y1="5" x2="16" y2="29" stroke="#c0a060" stroke-width="2" stroke-linecap="round"/><polygon points="16,3 14,12 18,12" fill="url(#pl)"/><line x1="11" y1="14" x2="21" y2="14" stroke="#c08020" stroke-width="2" stroke-linecap="round"/></svg>`,
  Bow:        `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bw" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d0a870"/><stop offset="100%" stop-color="#805030"/></linearGradient></defs><path d="M8 5 Q5 16 8 27" fill="none" stroke="url(#bw)" stroke-width="3" stroke-linecap="round"/><line x1="8" y1="5" x2="8" y2="27" stroke="#a07048" stroke-width="1.5" stroke-dasharray="3 2"/><line x1="16" y1="7" x2="16" y2="25" stroke="#c0c0c0" stroke-width="1.5" stroke-linecap="round"/><polygon points="16,5 14,10 18,10" fill="#d0d0d0"/></svg>`,
  Catalyst:   `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="cat" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#e0c0ff"/><stop offset="100%" stop-color="#8040c0"/></radialGradient></defs><circle cx="16" cy="12" r="8" fill="url(#cat)" opacity="0.85"/><circle cx="16" cy="12" r="4" fill="#f0d8ff" opacity="0.7"/><line x1="16" y1="20" x2="16" y2="29" stroke="#a070c8" stroke-width="2.5" stroke-linecap="round"/><line x1="11" y1="25" x2="21" y2="25" stroke="#a070c8" stroke-width="2" stroke-linecap="round"/></svg>`,
  // HSR paths
  "The Hunt": `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="th" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffeea0"/><stop offset="100%" stop-color="#c09000"/></linearGradient></defs><path d="M6 26 L14 10 L16 14 L20 6 L22 26" fill="none" stroke="url(#th)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polygon points="22,4 20,10 26,10" fill="#ffd040"/></svg>`,
  Erudition:  `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="er" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#80d0ff"/><stop offset="100%" stop-color="#2060c0"/></linearGradient></defs><rect x="8" y="6" width="16" height="20" rx="2" fill="url(#er)" opacity="0.8"/><line x1="11" y1="11" x2="21" y2="11" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/><line x1="11" y1="15" x2="21" y2="15" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><line x1="11" y1="19" x2="17" y2="19" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/></svg>`,
  Harmony:    `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="hr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#80f0d0"/><stop offset="100%" stop-color="#20a070"/></linearGradient></defs><path d="M8 20 Q10 10 16 8 Q22 6 24 12 Q26 18 20 22 Q14 26 8 20Z" fill="url(#hr)" opacity="0.8"/><path d="M12 22 Q8 28 6 28" fill="none" stroke="#40c090" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  Nihility:   `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ni" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#9060c0"/><stop offset="100%" stop-color="#200830"/></radialGradient></defs><circle cx="16" cy="16" r="11" fill="url(#ni)"/><circle cx="16" cy="16" r="6" fill="none" stroke="#c090e8" stroke-width="1.5" stroke-dasharray="3 2"/><circle cx="16" cy="16" r="2" fill="#e0c0ff" opacity="0.5"/></svg>`,
  Preservation:`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffc060"/><stop offset="100%" stop-color="#a06010"/></linearGradient></defs><path d="M16 4L26 8L26 20C26 25 16 29 16 29C16 29 6 25 6 20L6 8Z" fill="url(#pr)" opacity="0.85"/></svg>`,
  Abundance:  `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ab" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a0f080"/><stop offset="100%" stop-color="#308020"/></linearGradient></defs><circle cx="16" cy="16" r="10" fill="url(#ab)" opacity="0.8"/><path d="M16 9L16 23M11 14L21 14" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  Destruction:`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ds" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff8060"/><stop offset="100%" stop-color="#c01010"/></linearGradient></defs><polygon points="16,3 20,13 30,13 22,19 25,29 16,23 7,29 10,19 2,13 12,13" fill="url(#ds)" opacity="0.9"/></svg>`,
  Remembrance:`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rm" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c0e8ff"/><stop offset="100%" stop-color="#4080c0"/></linearGradient></defs><circle cx="16" cy="14" r="9" fill="url(#rm)" opacity="0.85"/><path d="M10 24 Q16 28 22 24" fill="none" stroke="#80b8e0" stroke-width="2" stroke-linecap="round"/></svg>`,
  Elation:    `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="el" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffd080"/><stop offset="100%" stop-color="#e06000"/></linearGradient></defs><circle cx="16" cy="16" r="10" fill="url(#el)" opacity="0.85"/><path d="M11 14 Q13 11 16 13 Q19 11 21 14" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="M11 20 Q16 24 21 20" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`,
  Propagation:`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d0ff90"/><stop offset="100%" stop-color="#60a000"/></linearGradient></defs><circle cx="16" cy="16" r="4" fill="url(#pg)"/><circle cx="16" cy="16" r="8" fill="none" stroke="url(#pg)" stroke-width="1.5" opacity="0.6"/><circle cx="16" cy="16" r="12" fill="none" stroke="url(#pg)" stroke-width="1" opacity="0.3"/></svg>`,
  "Follow-up":`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fu" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c0b0ff"/><stop offset="100%" stop-color="#6040c0"/></linearGradient></defs><polygon points="6,16 16,8 16,13 26,13 26,19 16,19 16,24" fill="url(#fu)" opacity="0.9"/></svg>`,
  // ZZZ
  Attack:     `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="at" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff9060"/><stop offset="100%" stop-color="#c02000"/></linearGradient></defs><polygon points="16,4 20,14 30,14 22,20 25,30 16,24 7,30 10,20 2,14 12,14" fill="url(#at)"/></svg>`,
  Stun:       `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="st" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe060"/><stop offset="100%" stop-color="#c08000"/></linearGradient></defs><polygon points="20,3 13,16 18,16 12,29 24,14 19,14" fill="url(#st)"/><circle cx="9" cy="10" r="4" fill="url(#st)" opacity="0.6"/></svg>`,
  Anomaly:    `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="an2" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#d080ff"/><stop offset="100%" stop-color="#600090"/></radialGradient></defs><path d="M16 4Q26 10 26 20Q26 28 16 28Q6 28 6 20Q6 10 16 4Z" fill="url(#an2)" opacity="0.8"/><text x="16" y="21" font-size="13" text-anchor="middle" fill="white" font-weight="bold" font-family="serif">?</text></svg>`,
  Support:    `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#80f0d8"/><stop offset="100%" stop-color="#1090a0"/></linearGradient></defs><path d="M16 6L16 16M16 16L10 22M16 16L22 22" stroke="url(#sp)" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="16" cy="6" r="4" fill="url(#sp)"/><circle cx="10" cy="24" r="3.5" fill="url(#sp)" opacity="0.8"/><circle cx="22" cy="24" r="3.5" fill="url(#sp)" opacity="0.8"/></svg>`,
  Defense:    `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="df" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#80b8ff"/><stop offset="100%" stop-color="#2050c0"/></linearGradient></defs><path d="M16 4L26 8L26 18C26 24 16 28 16 28C16 28 6 24 6 18L6 8Z" fill="url(#df)" opacity="0.85"/><path d="M12 16L15 19L21 13" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  Rupture:    `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff80b0"/><stop offset="100%" stop-color="#900040"/></linearGradient></defs><path d="M8 8L24 24M24 8L8 24" stroke="url(#rp)" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="16" r="5" fill="url(#rp)" opacity="0.6"/></svg>`,
  // WuWa weapons
  Broadblade: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bb" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e0d0a0"/><stop offset="100%" stop-color="#806020"/></linearGradient></defs><polygon points="16,3 21,10 21,22 16,26 11,22 11,10" fill="url(#bb)" opacity="0.9"/><line x1="16" y1="26" x2="16" y2="30" stroke="#806020" stroke-width="3" stroke-linecap="round"/></svg>`,
  Pistols:    `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ps" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#d0d8e8"/><stop offset="100%" stop-color="#6070a0"/></linearGradient></defs><rect x="5" y="11" width="18" height="8" rx="2" fill="url(#ps)"/><rect x="23" y="13" width="5" height="3" rx="1" fill="url(#ps)"/><rect x="11" y="19" width="6" height="5" rx="1" fill="url(#ps)" opacity="0.7"/></svg>`,
  Gauntlets:  `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gt" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f0a060"/><stop offset="100%" stop-color="#904020"/></linearGradient></defs><rect x="8" y="10" width="16" height="14" rx="3" fill="url(#gt)" opacity="0.85"/><rect x="8" y="7" width="4" height="6" rx="1.5" fill="url(#gt)"/><rect x="14" y="6" width="4" height="6" rx="1.5" fill="url(#gt)"/><rect x="20" y="7" width="4" height="6" rx="1.5" fill="url(#gt)"/></svg>`,
  Rectifier: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="rc" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#d8b0ff"/><stop offset="100%" stop-color="#7030b0"/></radialGradient></defs><circle cx="16" cy="14" r="9" fill="url(#rc)" opacity="0.8"/><circle cx="16" cy="14" r="5" fill="none" stroke="#f0d8ff" stroke-width="1.5"/><circle cx="16" cy="14" r="2" fill="#f8e8ff" opacity="0.9"/><line x1="16" y1="23" x2="16" y2="29" stroke="#9060c0" stroke-width="2.5" stroke-linecap="round"/></svg>`,
};

function elemIcon(elem, cls='tag-icon') {
  if (!elem || !ELEMENT_ICONS[elem]) return '';
  const svg = ELEMENT_ICONS[elem].replace('<svg ', `<svg class="${cls}" `);
  return svg;
}

function specIcon(spec, cls='tag-icon') {
  if (!spec) return '';
  const svg = SPECIALTY_ICONS[spec];
  if (!svg) return '';
  return svg.replace('<svg ', `<svg class="${cls}" `);
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
    btn.innerHTML = GAME_LOGOS[key] || game.name;
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
    btn.innerHTML = elemIcon(el, 'pill-icon') + `<span>${el}</span>`;
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
    btn.innerHTML = specIcon(sp, 'pill-icon') + `<span>${sp}</span>`;
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
        ${elemIcon(char.element) || '✦'}
      </div>
      <div class="rarity-badge">${char.rarity}★</div>
    </div>
    <div class="char-name">${char.name}</div>
    <div class="char-tags">
      ${elemIcon(char.element)}
      ${specIcon(spec)}
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
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${elemIcon(item.element)||'✦'}</div>`
        }
      </div>
      <div class="wish-info">
        <div class="wish-name">${item.name}</div>
        <div class="wish-meta">
          ${elemIcon(item.element, 'wish-meta-icon')}
          ${item.element ? `<span class="wish-meta-text">${item.element}</span>` : ''}
          ${specIcon(spec, 'wish-meta-icon')}
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
